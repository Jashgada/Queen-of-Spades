import { GameManager } from './GameManager';

describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    gameManager = new GameManager();
  });

  test('should create a new game', () => {
    const { gameCode, player } = gameManager.createGame('Player 1', 'socket1');

    expect(gameCode).toBeDefined();
    // nanoid generates a string of length 7 by default
    expect(gameCode.length).toBeGreaterThan(0);
    expect(player.name).toBe('Player 1');
    expect(player.socketId).toBe('socket1');

    const game = gameManager.getGame(gameCode);
    expect(game).toBeDefined();
    expect(game!.getState().players).toHaveLength(1);
    expect(game!.getState().players[0].id).toBe(player.id);
  });

  test('should join an existing game', () => {
    const { gameCode } = gameManager.createGame('Player 1', 'socket1');
    const result = gameManager.joinGame(gameCode, 'Player 2', 'socket2');

    expect(result.success).toBe(true);
    expect(result.player).toBeDefined();
    expect(result.player!.name).toBe('Player 2');
    expect(result.player!.socketId).toBe('socket2');

    const game = gameManager.getGame(gameCode);
    expect(game).toBeDefined();
    expect(game!.getState().players).toHaveLength(2);
    expect(game!.getState().players[1].id).toBe(result.player!.id);
  });

  test('should not join a non-existent game', () => {
    const result = gameManager.joinGame('invalid', 'Player 2', 'socket2');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Game not found');
    expect(result.player).toBeUndefined();
  });

  test('should start a game', () => {
    const { gameCode } = gameManager.createGame('Player 1', 'socket1');
    gameManager.joinGame(gameCode, 'Player 2', 'socket2');
    
    const result = gameManager.startGame(gameCode);

    expect(result.success).toBe(true);
    expect(result.game).toBeDefined();
    
    const gameState = result.game!.getState();
    expect(gameState.status).toBe('playing');
    expect(gameState.currentPlayer).toBeDefined();
    expect(gameState.trickNumber).toBe(1);
  });

  test('should not start a game with insufficient players', () => {
    const { gameCode } = gameManager.createGame('Player 1', 'socket1');
    
    const result = gameManager.startGame(gameCode);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Not enough players to start the game');
  });

  test('should play a card', () => {
    // Create and start a game
    const { gameCode, player: player1 } = gameManager.createGame('Player 1', 'socket1');
    const joinResult = gameManager.joinGame(gameCode, 'Player 2', 'socket2');
    expect(joinResult.success).toBe(true);
    expect(joinResult.player).toBeDefined();
    const player2 = joinResult.player!;
    
    gameManager.startGame(gameCode);
    
    // Get the game and manually set up hands for testing
    const game = gameManager.getGame(gameCode)!;
    const state = game.getState();
    
    // Set player 1 as current player
    state.currentPlayer = player1.id;
    
    // Set up hands
    state.hands[player1.id] = [
      { suit: 'hearts', value: '5' }
    ];
    state.hands[player2.id] = [
      { suit: 'hearts', value: 'A' }
    ];
    state.players[0].handSize = 1;
    state.players[1].handSize = 1;
    
    // Play a card
    const result = gameManager.playCard(gameCode, player1.id, { suit: 'hearts', value: '5' });

    // The playCard method should return success: true
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result.valid).toBe(true);
    expect(result.result.nextPlayer).toBe(player2.id);
    
    // Check game state
    expect(state.currentTrick).toHaveLength(1);
    expect(state.currentTrick[0].playerId).toBe(player1.id);
    expect(state.currentTrick[0].card).toEqual({ suit: 'hearts', value: '5' });
    expect(state.hands[player1.id]).toHaveLength(0);
    expect(state.players[0].handSize).toBe(0);
    expect(state.currentPlayer).toBe(player2.id);
  });

  test('should not play a card in a non-existent game', () => {
    const result = gameManager.playCard('invalid', 'player1', { suit: 'hearts', value: '5' });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Game not found');
  });

  test('should restart a game', () => {
    // Create and start a game
    const { gameCode } = gameManager.createGame('Player 1', 'socket1');
    gameManager.joinGame(gameCode, 'Player 2', 'socket2');
    gameManager.startGame(gameCode);
    
    // Get the game and manually set it as finished
    const game = gameManager.getGame(gameCode)!;
    const state = game.getState();
    state.gameOver = true;
    state.winner = state.players[0].id;
    state.status = 'finished';
    
    // Restart the game
    const result = gameManager.restartGame(gameCode);

    expect(result.success).toBe(true);
    expect(result.game).toBeDefined();
    
    // Check game state
    const newState = result.game!.getState();
    expect(newState.status).toBe('playing');
    expect(newState.gameOver).toBe(false);
    expect(newState.winner).toBeNull();
    expect(newState.trickNumber).toBe(1);
    expect(newState.currentPlayer).toBeDefined();
  });

  test('should not restart a non-existent game', () => {
    const result = gameManager.restartGame('invalid');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Game not found');
  });

  test('should remove a player from a game', () => {
    // Create a game with two players
    const { gameCode, player: player1 } = gameManager.createGame('Player 1', 'socket1');
    const joinResult = gameManager.joinGame(gameCode, 'Player 2', 'socket2');
    expect(joinResult.success).toBe(true);
    expect(joinResult.player).toBeDefined();
    const player2 = joinResult.player!;
    
    // Remove player 1
    const result = gameManager.removePlayer(player1.id, 'socket1');

    expect(result.success).toBe(true);
    expect(result.gameCode).toBe(gameCode);
    // The remainingPlayers array should exist and contain player2
    expect(result.remainingPlayers).toBeDefined();
    expect(result.remainingPlayers!.length).toBe(1);
    expect(result.remainingPlayers![0].id).toBe(player2.id);
    
    // Check game state
    const game = gameManager.getGame(gameCode)!;
    expect(game.getState().players).toHaveLength(1);
    expect(game.getState().players[0].id).toBe(player2.id);
    
    // Player 1 should no longer be in a game
    expect(gameManager.getGameByPlayerId(player1.id)).toBeUndefined();
  });

  test('should delete a game when the last player leaves', () => {
    // Create a game with one player
    const { gameCode, player } = gameManager.createGame('Player 1', 'socket1');
    
    // Remove the player
    const result = gameManager.removePlayer(player.id, 'socket1');

    expect(result.success).toBe(true);
    expect(result.gameCode).toBe(gameCode);
    expect(result.message).toBe('Player removed and game deleted');
    
    // Game should no longer exist
    expect(gameManager.getGame(gameCode)).toBeUndefined();
  });

  test('should find a player by socket ID', () => {
    // Create a game with one player
    const { gameCode, player } = gameManager.createGame('Player 1', 'socket1');
    
    // Find the player
    const playerInfo = gameManager.findPlayerBySocketId('socket1');

    expect(playerInfo).toBeDefined();
    expect(playerInfo!.playerId).toBe(player.id);
    expect(playerInfo!.gameCode).toBe(gameCode);
  });

  test('should return null when finding a non-existent socket ID', () => {
    const playerInfo = gameManager.findPlayerBySocketId('invalid');
    expect(playerInfo).toBeNull();
  });
}); 