import { DurableObject } from 'cloudflare:workers';
import { Game, GameSnapshot } from './Game';
import { Card, ContractParams, Player, PublicGameState } from '../types';

const PROTOCOL_VERSION = 1;
const RECONNECT_GRACE_MS = 60_000;
const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

interface Env {
  GAME_ROOMS: DurableObjectNamespace<GameRoom>;
}

interface ClientRequest {
  v: number;
  type: string;
  requestId: string;
  payload?: Record<string, unknown>;
}

interface ConnectionAttachment {
  connectionId: string;
  playerId: string | null;
}

interface RoomRow {
  [key: string]: string | number | null;
  code: string;
  game_json: string | null;
}

export class GameRoom extends DurableObject<Env> {
  private game: Game | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS room (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        code TEXT NOT NULL,
        game_json TEXT
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS reconnect_deadlines (
        player_id TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL
      )
    `);

    const row = this.roomRow();
    if (row?.game_json) {
      this.game = Game.fromSnapshot(JSON.parse(row.game_json) as GameSnapshot);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/internal/reserve' && request.method === 'POST') {
      return this.reserveRoom(await request.json<{ code: string }>());
    }

    if (url.pathname !== '/ws' || request.method !== 'GET') {
      return new Response('Not found', { status: 404 });
    }

    const row = this.roomRow();
    if (!row || row.code !== url.searchParams.get('roomCode')) {
      return new Response('Room not found', { status: 404 });
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }
    if (!request.headers.get('Sec-WebSocket-Protocol')?.split(',').map(value => value.trim()).includes('qos.v1')) {
      return new Response('Subprotocol qos.v1 is required', { status: 400 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ connectionId: crypto.randomUUID(), playerId: null } satisfies ConnectionAttachment);

    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { 'Sec-WebSocket-Protocol': 'qos.v1' }
    });
  }

  async webSocketMessage(webSocket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = this.attachment(webSocket);
    if (typeof message !== 'string') {
      this.sendError(webSocket, undefined, 'INVALID_MESSAGE', 'Only JSON text messages are supported');
      return;
    }

    let request: ClientRequest;
    try {
      request = JSON.parse(message) as ClientRequest;
    } catch {
      this.sendError(webSocket, undefined, 'INVALID_MESSAGE', 'Message must be valid JSON');
      return;
    }

    if (!request || typeof request !== 'object' || typeof request.requestId !== 'string' || !request.requestId) {
      this.sendError(webSocket, undefined, 'INVALID_MESSAGE', 'A requestId is required');
      return;
    }
    if (request.v !== PROTOCOL_VERSION) {
      this.sendError(webSocket, request.requestId, 'UNSUPPORTED_VERSION', `Protocol version ${PROTOCOL_VERSION} is required`);
      return;
    }
    if (typeof request.type !== 'string') {
      this.sendError(webSocket, request.requestId, 'INVALID_MESSAGE', 'A message type is required');
      return;
    }

    try {
      const payload = request.payload || {};
      const result = await this.handleCommand(webSocket, attachment, request.type, payload);
      this.sendResponse(webSocket, request.requestId, true, result);
      if (request.type === 'game.leave') webSocket.close(1000, 'Left game');
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Request failed';
      this.sendError(webSocket, request.requestId, this.errorCode(messageText), messageText);
    }
  }

  async webSocketClose(webSocket: WebSocket): Promise<void> {
    await this.markDisconnected(webSocket);
  }

  async webSocketError(webSocket: WebSocket): Promise<void> {
    await this.markDisconnected(webSocket);
  }

  async alarm(): Promise<void> {
    if (!this.game) return;

    const now = Date.now();
    const expired = this.ctx.storage.sql.exec<{ player_id: string }>(
      'SELECT player_id FROM reconnect_deadlines WHERE expires_at <= ?', now
    ).toArray();
    let changed = false;

    for (const { player_id: playerId } of expired) {
      this.ctx.storage.sql.exec('DELETE FROM reconnect_deadlines WHERE player_id = ?', playerId);
      const player = this.game.getState().players.find(candidate => candidate.id === playerId);
      if (!player || player.connected) continue;

      this.game.removePlayer(playerId);
      this.broadcast('game.playerLeft', {
        playerId,
        gameState: this.game.getPublicState(),
        players: this.publicPlayers(),
        message: 'The reconnect window expired; the player was removed from the game'
      });
      changed = true;
    }

    if (changed) this.persistGame();
    await this.scheduleNextReconnectAlarm();
  }

  private reserveRoom({ code }: { code: string }): Response {
    const normalizedCode = typeof code === 'string' ? code.toUpperCase() : '';
    if (!ROOM_CODE_PATTERN.test(normalizedCode)) {
      return Response.json({ success: false, message: 'Invalid room code' }, { status: 400 });
    }
    if (this.roomRow()) {
      return Response.json({ success: false, message: 'Room code is already reserved' }, { status: 409 });
    }

    this.ctx.storage.sql.exec('INSERT INTO room (id, code, game_json) VALUES (1, ?, NULL)', normalizedCode);
    return Response.json({ success: true, gameCode: normalizedCode });
  }

  private async handleCommand(
    webSocket: WebSocket,
    connection: ConnectionAttachment,
    type: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    switch (type) {
      case 'game.create':
        return this.createGame(webSocket, connection, payload);
      case 'game.join':
        return this.joinGame(webSocket, connection, payload);
      case 'game.resume':
        return this.resumeGame(webSocket, connection, payload);
      case 'game.leave':
        return this.leaveGame(webSocket, connection);
      case 'game.start':
        return this.startGame(webSocket, connection);
      case 'game.bid':
      case 'game.pass':
        return this.submitBid(webSocket, connection, type, payload);
      case 'game.setContract':
        return this.setContract(webSocket, connection, payload);
      case 'game.playCard':
        return this.playCard(webSocket, connection, payload);
      case 'game.nextDeal':
        return this.nextDeal(webSocket, connection);
      default:
        throw new Error('Unknown message type');
    }
  }

  private createGame(
    webSocket: WebSocket,
    connection: ConnectionAttachment,
    payload: Record<string, unknown>
  ): Record<string, unknown> {
    if (connection.playerId) throw new Error('Already in a game');
    if (this.game) throw new Error('Room has already been created');
    const playerName = this.playerName(payload.playerName);
    const gameCode = this.roomRow()?.code;
    if (!gameCode) throw new Error('Room not found');

    this.game = new Game(gameCode);
    const player = this.game.addPlayer(playerName, connection.connectionId);
    connection.playerId = player.id;
    webSocket.serializeAttachment(connection);
    this.persistGame();

    return {
      gameCode,
      player: this.publicPlayer(player, true),
      players: this.publicPlayers(),
      hostId: player.id,
      hand: [],
      gameState: this.publicState()
    };
  }

  private joinGame(
    webSocket: WebSocket,
    connection: ConnectionAttachment,
    payload: Record<string, unknown>
  ): Record<string, unknown> {
    if (connection.playerId) throw new Error('Already in a game');
    const game = this.requireGame();
    if (game.getState().status !== 'waiting') throw new Error('Game already started');
    if (game.getState().players.length >= 6) throw new Error('Game is full (maximum 6 players)');

    const player = game.addPlayer(this.playerName(payload.playerName), connection.connectionId);
    connection.playerId = player.id;
    webSocket.serializeAttachment(connection);
    this.persistGame();

    const players = this.publicPlayers();
    const gameState = this.publicState();
    this.broadcast('game.playerJoined', {
      gameCode: game.getState().code,
      player: this.publicPlayer(player),
      players,
      message: `${player.name} joined the game`
    }, webSocket);

    return {
      gameCode: game.getState().code,
      player: this.publicPlayer(player, true),
      players,
      hostId: game.getState().players[0]?.id,
      gameState
    };
  }

  private async resumeGame(
    webSocket: WebSocket,
    connection: ConnectionAttachment,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (connection.playerId) throw new Error('Already in a game');
    const game = this.requireGame();
    const playerId = typeof payload.playerId === 'string' ? payload.playerId : '';
    const resumeToken = typeof payload.resumeToken === 'string' ? payload.resumeToken : '';
    const player = game.getState().players.find(candidate => candidate.id === playerId);
    if (!player || player.resumeToken !== resumeToken) throw new Error('Saved game session is invalid or expired');

    const deadline = this.ctx.storage.sql.exec<{ expires_at: number } & Record<string, number>>(
      'SELECT expires_at FROM reconnect_deadlines WHERE player_id = ?', player.id
    ).toArray()[0]?.expires_at;
    if (!player.connected && (typeof deadline !== 'number' || deadline <= Date.now())) {
      this.ctx.storage.sql.exec('DELETE FROM reconnect_deadlines WHERE player_id = ?', player.id);
      game.removePlayer(player.id);
      this.persistGame();
      this.broadcast('game.playerLeft', {
        playerId: player.id,
        gameState: game.getPublicState(),
        players: this.publicPlayers(),
        message: 'The reconnect window expired; the player was removed from the game'
      });
      await this.scheduleNextReconnectAlarm();
      throw new Error('Saved game session is invalid or expired');
    }

    const oldConnectionId = player.connectionId;
    game.updatePlayerConnection(player.id, connection.connectionId, true);
    connection.playerId = player.id;
    webSocket.serializeAttachment(connection);
    this.ctx.storage.sql.exec('DELETE FROM reconnect_deadlines WHERE player_id = ?', player.id);
    this.persistGame();
    await this.scheduleNextReconnectAlarm();

    for (const existingSocket of this.ctx.getWebSockets()) {
      if (existingSocket === webSocket) continue;
      const existing = this.attachment(existingSocket);
      if (existing.playerId === player.id && existing.connectionId === oldConnectionId) {
        existingSocket.close(4001, 'Session resumed on another connection');
      }
    }

    const hand = game.getState().hands[player.id] || [];
    this.sendEvent(webSocket, 'game.playerState', { hand, currentPlayerId: player.id });
    const gameState = game.getPublicState();
    this.sendEvent(webSocket, 'game.resumed', { success: true, gameState });
    this.broadcast('game.playerReconnected', { playerId: player.id, gameState }, webSocket);
    return { gameCode: game.getState().code, playerId: player.id, hand, gameState };
  }

  private async leaveGame(webSocket: WebSocket, connection: ConnectionAttachment): Promise<Record<string, unknown>> {
    const game = this.requireMember(connection);
    const playerId = connection.playerId!;
    this.ctx.storage.sql.exec('DELETE FROM reconnect_deadlines WHERE player_id = ?', playerId);
    game.removePlayer(playerId);
    connection.playerId = null;
    webSocket.serializeAttachment(connection);
    this.persistGame();
    await this.scheduleNextReconnectAlarm();

    const gameState = game.getPublicState();
    this.broadcast('game.playerLeft', {
      playerId,
      gameState,
      players: this.publicPlayers(),
      message: 'A player left the game'
    });
    return { message: 'Left game successfully' };
  }

  private startGame(webSocket: WebSocket, connection: ConnectionAttachment): Record<string, unknown> {
    const game = this.requireMember(connection);
    this.requireHost(connection);
    game.start();
    this.persistGame();
    this.sendHandsToPlayers();
    this.broadcast('game.started', {
      success: true,
      gameState: game.getPublicState(),
      message: 'Game started successfully'
    });
    return { message: 'Game started successfully' };
  }

  private submitBid(
    webSocket: WebSocket,
    connection: ConnectionAttachment,
    type: string,
    payload: Record<string, unknown>
  ): Record<string, unknown> {
    const game = this.requireMember(connection);
    const result = game.submitBid(connection.playerId!, type === 'game.pass' ? null : payload.amount as number);
    if (!result.success) throw new Error(result.message || 'Invalid bid');

    this.persistGame();
    const gameState = game.getPublicState();
    this.broadcast('game.biddingUpdated', { success: true, gameState });
    return { gameState };
  }

  private setContract(
    webSocket: WebSocket,
    connection: ConnectionAttachment,
    payload: Record<string, unknown>
  ): Record<string, unknown> {
    const game = this.requireMember(connection);
    const partnerCalls = Array.isArray(payload.partnerCalls) ? payload.partnerCalls as Card[] : [];
    const cutSuit = payload.cutSuit as ContractParams['cutSuit'];
    const result = game.submitContract(connection.playerId!, partnerCalls, cutSuit);
    if (!result.success) throw new Error(result.message || 'Invalid contract');

    this.persistGame();
    const gameState = game.getPublicState();
    this.broadcast('game.contractSet', { success: true, gameState });
    return { gameState };
  }

  private playCard(
    webSocket: WebSocket,
    connection: ConnectionAttachment,
    payload: Record<string, unknown>
  ): Record<string, unknown> {
    const game = this.requireMember(connection);
    const card = payload.card as Card;
    const result = game.playCard(connection.playerId!, card);
    if (!result.valid) throw new Error(result.message || 'Invalid move');

    const state = game.getState();
    const response = {
      play: { playerId: connection.playerId!, card },
      nextPlayer: result.nextPlayer,
      roundComplete: result.roundComplete,
      roundWinner: result.roundWinner,
      roundPoints: result.roundPoints,
      scores: state.scores,
      gameOver: state.gameOver,
      winner: state.winner,
      winningTeamPlayerIds: state.winningTeamPlayerIds,
      contract: state.contract,
      contractResult: state.contractResult,
      matchScores: state.matchScores,
      dealNumber: state.dealNumber,
      roundNumber: state.roundNumber,
      message: 'Card played successfully'
    };

    this.persistGame();
    this.broadcast('game.cardPlayed', response);
    if (result.roundComplete) {
      this.broadcast('game.roundComplete', {
        winner: result.roundWinner,
        points: result.roundPoints,
        scores: state.scores,
        matchScores: state.matchScores,
        dealNumber: state.dealNumber,
        lastRound: state.lastRound,
        roundNumber: state.roundNumber
      });
    }
    if (state.gameOver) {
      this.broadcast('game.over', {
        winner: state.winner,
        winningTeamPlayerIds: state.winningTeamPlayerIds,
        contractResult: state.contractResult,
        scores: state.scores,
        matchScores: state.matchScores,
        dealNumber: state.dealNumber,
        gameOver: true,
        gameStatus: 'finished'
      });
    }
    return response;
  }

  private nextDeal(webSocket: WebSocket, connection: ConnectionAttachment): Record<string, unknown> {
    const game = this.requireMember(connection);
    this.requireHost(connection);
    game.restart();
    this.persistGame();
    this.sendHandsToPlayers();
    this.broadcast('game.restarted', {
      success: true,
      gameState: game.getPublicState(),
      message: 'Next deal started successfully'
    });
    return { message: 'Next deal started successfully' };
  }

  private async markDisconnected(webSocket: WebSocket): Promise<void> {
    const connection = this.attachment(webSocket);
    if (!connection.playerId || !this.game) return;
    const player = this.game.getState().players.find(candidate => candidate.id === connection.playerId);
    if (!player || player.connectionId !== connection.connectionId || !player.connected) return;

    this.game.updatePlayerConnection(player.id, connection.connectionId, false);
    const expiresAt = Date.now() + RECONNECT_GRACE_MS;
    this.ctx.storage.sql.exec(
      'INSERT OR REPLACE INTO reconnect_deadlines (player_id, expires_at) VALUES (?, ?)',
      player.id,
      expiresAt
    );
    this.persistGame();
    this.broadcast('game.playerDisconnected', {
      playerId: player.id,
      gracePeriodMs: RECONNECT_GRACE_MS,
      gameState: this.game.getPublicState()
    });
    await this.scheduleNextReconnectAlarm();
  }

  private async scheduleNextReconnectAlarm(): Promise<void> {
    const next = this.ctx.storage.sql.exec<{ expires_at: number }>(
      'SELECT MIN(expires_at) AS expires_at FROM reconnect_deadlines'
    ).one().expires_at;
    if (typeof next === 'number') {
      await this.ctx.storage.setAlarm(next);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }

  private sendHandsToPlayers(): void {
    if (!this.game) return;
    for (const webSocket of this.ctx.getWebSockets()) {
      const connection = this.attachment(webSocket);
      if (!connection.playerId) continue;
      this.sendEvent(webSocket, 'game.playerState', {
        hand: this.game.getState().hands[connection.playerId] || [],
        currentPlayerId: connection.playerId
      });
    }
  }

  private requireGame(): Game {
    if (!this.game) throw new Error('Game not found');
    return this.game;
  }

  private requireMember(connection: ConnectionAttachment): Game {
    const game = this.requireGame();
    const player = game.getState().players.find(candidate => candidate.id === connection.playerId);
    if (!player || player.connectionId !== connection.connectionId) throw new Error('Player not found in a game');
    return game;
  }

  private requireHost(connection: ConnectionAttachment): void {
    const game = this.requireGame();
    if (game.getState().players[0]?.id !== connection.playerId) throw new Error('Only the host can perform this action');
  }

  private playerName(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Player name is required');
    if (value.trim().length > 24) throw new Error('Player name must be 24 characters or fewer');
    return value.trim();
  }

  private publicPlayer(player: Player, includeResumeToken = false): Record<string, unknown> {
    const publicPlayer = {
      id: player.id,
      name: player.name,
      connected: player.connected,
      handSize: player.handSize
    };
    return includeResumeToken ? { ...publicPlayer, resumeToken: player.resumeToken } : publicPlayer;
  }

  private publicPlayers(): Record<string, unknown>[] {
    return this.game?.getState().players.map(player => this.publicPlayer(player)) || [];
  }

  private publicState(): PublicGameState | undefined {
    return this.game?.getPublicState();
  }

  private roomRow(): RoomRow | undefined {
    return this.ctx.storage.sql.exec<RoomRow>('SELECT code, game_json FROM room WHERE id = 1').toArray()[0];
  }

  private persistGame(): void {
    if (!this.game) return;
    this.ctx.storage.sql.exec('UPDATE room SET game_json = ? WHERE id = 1', JSON.stringify(this.game.toSnapshot()));
  }

  private attachment(webSocket: WebSocket): ConnectionAttachment {
    const attachment = webSocket.deserializeAttachment() as ConnectionAttachment | null;
    if (!attachment?.connectionId) throw new Error('Connection is not initialized');
    return attachment;
  }

  private sendResponse(webSocket: WebSocket, requestId: string, ok: boolean, payload: unknown): void {
    webSocket.send(JSON.stringify({ v: PROTOCOL_VERSION, type: 'response', requestId, ok, payload }));
  }

  private sendError(webSocket: WebSocket, requestId: string | undefined, code: string, message: string): void {
    if (!requestId) {
      this.sendEvent(webSocket, 'protocol.error', { code, message });
      return;
    }
    webSocket.send(JSON.stringify({
      v: PROTOCOL_VERSION,
      type: 'response',
      requestId,
      ok: false,
      error: { code, message }
    }));
  }

  private sendEvent(webSocket: WebSocket, event: string, payload: unknown): void {
    webSocket.send(JSON.stringify({ v: PROTOCOL_VERSION, type: 'event', event, payload }));
  }

  private broadcast(event: string, payload: unknown, except?: WebSocket): void {
    const message = JSON.stringify({ v: PROTOCOL_VERSION, type: 'event', event, payload });
    for (const webSocket of this.ctx.getWebSockets()) {
      if (webSocket === except || !this.attachment(webSocket).playerId) continue;
      try {
        webSocket.send(message);
      } catch {
        // The close callback will apply reconnect grace and cleanup.
      }
    }
  }

  private errorCode(message: string): string {
    if (message.includes('Unknown message')) return 'UNKNOWN_MESSAGE_TYPE';
    if (message.includes('host')) return 'NOT_HOST';
    if (message.includes('turn')) return 'NOT_YOUR_TURN';
    if (message.includes('session is invalid') || message.includes('session was not found')) return 'INVALID_RESUME_CREDENTIALS';
    if (message.includes('Game not found') || message.includes('Room not found')) return 'ROOM_NOT_FOUND';
    if (message.includes('phase') || message.includes('active') || message.includes('not finished') || message.includes('already started')) return 'GAME_PHASE_MISMATCH';
    if (message.includes('not found in a game')) return 'NOT_IN_GAME';
    if (message.includes('full')) return 'ROOM_FULL';
    return 'INVALID_ACTION';
  }
}
