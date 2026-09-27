import { Server, Socket } from 'socket.io';
import { GameManager } from '../models/GameManager';
import { BidParams, ContractParams, CreateGameParams, JoinGameParams, PlayCardParams, ResumeGameParams } from '../types';

// Create a singleton instance of GameManager
const gameManager = new GameManager();
const RECONNECT_GRACE_MS = 60_000;
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('A user connected:', socket.id);

    // Handle game creation
    socket.on('game:create', (params: CreateGameParams, callback) => {
      try {
        const { playerName } = params;
        console.log(`Creating game for player: ${playerName} (${socket.id})`);
        
        const { gameCode, player } = gameManager.createGame(playerName, socket.id);
        
        console.log(`Game created successfully: ${gameCode}`);
        console.log(`Player ${player.name} (${player.id}) joined as the creator`);

        // Join the Socket.IO room
        socket.join(gameCode);
        console.log(`Socket ${socket.id} joined room: ${gameCode}`);

        // Send response to the client
        if (callback) {
          callback({
            success: true,
            gameCode,
            player: {
              id: player.id,
              name: player.name,
              handSize: player.handSize,
              resumeToken: player.resumeToken
            },
            message: 'Game created successfully'
          });
        }
      } catch (error) {
        console.error('Error creating game:', error);
        if (callback) {
          callback({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to create game'
          });
        }
      }
    });

    // Handle joining a game
    socket.on('game:join', (params: JoinGameParams, callback) => {
      try {
        const { gameCode, playerName } = params;
        console.log(`Player ${playerName} (${socket.id}) attempting to join game: ${gameCode}`);
        
        const result = gameManager.joinGame(gameCode, playerName, socket.id);

        if (!result.success) {
          console.log(`Failed to join game ${gameCode}: ${result.message}`);
          if (callback) {
            callback({
              success: false,
              message: result.message
            });
          }
          return;
        }

        // Join the Socket.IO room
        socket.join(gameCode);
        console.log(`Socket ${socket.id} joined room: ${gameCode}`);

        // Get all players in the game
        const players = result.game!.getState().players.map(p => ({
          id: p.id,
          name: p.name,
          handSize: p.handSize,
          connected: p.connected
        }));
        
        console.log(`Player ${playerName} (${result.player!.id}) successfully joined game: ${gameCode}`);
        console.log(`Current players in game ${gameCode}: ${players.map(p => p.name).join(', ')}`);

        // Send response to the client
        if (callback) {
          callback({
            success: true,
            gameCode,
            player: {
              id: result.player!.id,
              name: result.player!.name,
              handSize: result.player!.handSize,
              resumeToken: result.player!.resumeToken
            },
            players,
            message: 'Joined game successfully'
          });
        }

        // Broadcast to other players
        socket.to(gameCode).emit('game:playerJoined', {
          gameCode,
          player: {
            id: result.player!.id,
            name: result.player!.name,
            handSize: result.player!.handSize,
            connected: result.player!.connected
          },
          players,
          message: `${playerName} joined the game`
        });
      } catch (error) {
        console.error('Error joining game:', error);
        if (callback) {
          callback({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to join game'
          });
        }
      }
    });

    socket.on('game:resume', (params: ResumeGameParams, callback) => {
      const result = gameManager.resumePlayer(
        params?.gameCode || '',
        params?.playerId || '',
        params?.resumeToken || '',
        socket.id
      );
      if (!result.success || !result.game || !result.player || !result.gameCode) {
        callback?.({ success: false, message: result.message });
        return;
      }

      const pendingTimer = disconnectTimers.get(result.player.id);
      if (pendingTimer) clearTimeout(pendingTimer);
      disconnectTimers.delete(result.player.id);

      if (result.previousSocketId && result.previousSocketId !== socket.id) {
        const previousSocket = io.sockets.sockets.get(result.previousSocketId);
        if (previousSocket) {
          previousSocket.leave(result.gameCode);
          previousSocket.disconnect(true);
        }
      }

      socket.join(result.gameCode);
      const gameState = result.game.getState();
      const playerHand = gameState.hands[result.player.id] || [];
      socket.emit('game:playerState', { hand: playerHand, currentPlayerId: result.player.id });
      socket.emit('game:resumed', { success: true, gameState: result.game.getPublicState() });
      socket.to(result.gameCode).emit('game:playerReconnected', {
        playerId: result.player.id,
        gameState: result.game.getPublicState()
      });

      callback?.({
        success: true,
        gameCode: result.gameCode,
        playerId: result.player.id,
        hand: playerHand,
        gameState: result.game.getPublicState()
      });
    });

    socket.on('game:leave', (callback) => {
      const playerInfo = gameManager.findPlayerBySocketId(socket.id);
      if (!playerInfo) {
        callback?.({ success: false, message: 'Player not found in a game' });
        return;
      }

      const timer = disconnectTimers.get(playerInfo.playerId);
      if (timer) clearTimeout(timer);
      disconnectTimers.delete(playerInfo.playerId);

      const result = gameManager.removePlayer(playerInfo.playerId, socket.id);
      if (!result.success) {
        callback?.({ success: false, message: result.message });
        return;
      }

      socket.leave(playerInfo.gameCode);
      const game = gameManager.getGame(playerInfo.gameCode);
      io.in(playerInfo.gameCode).emit('game:playerLeft', {
        playerId: playerInfo.playerId,
        gameState: game?.getPublicState(),
        players: game?.getPublicState().players || [],
        message: 'A player left the game'
      });
      callback?.({ success: true, message: 'Left game successfully' });
    });

    // Handle starting a game
    socket.on('game:start', (callback) => {
      try {
        // Find the player and game
        const playerInfo = gameManager.findPlayerBySocketId(socket.id);
        if (!playerInfo) {
          console.log(`Failed to start game: Player not found for socket ${socket.id}`);
          if (callback) {
            callback({
              success: false,
              message: 'Player not found'
            });
          }
          return;
        }

        const { gameCode } = playerInfo;
        console.log(`Starting game ${gameCode} initiated by socket ${socket.id}`);
        
        const result = gameManager.startGame(gameCode);

        if (!result.success) {
          console.log(`Failed to start game ${gameCode}: ${result.message}`);
          if (callback) {
            callback({
              success: false,
              message: result.message
            });
          }
          return;
        }

        const game = result.game!;
        const gameState = game.getState();
        
        console.log(`Game ${gameCode} started successfully`);
        console.log(`Players in game: ${gameState.players.map(p => `${p.name} (${p.id})`).join(', ')}`);
        console.log(`First player: ${gameState.currentPlayer}`);

        // Deliver each private hand before announcing that bidding is open.
        gameState.players.forEach(player => {
          const socketId = player.socketId;
          const playerSocket = io.sockets.sockets.get(socketId);
          
          if (playerSocket) {
            console.log(`Sending hand to player ${player.name} (${player.id}): ${gameState.hands[player.id].length} cards`);
            playerSocket.emit('game:playerState', {
              hand: gameState.hands[player.id],
              currentPlayerId: player.id
            });
          }
        });

        io.in(gameCode).emit('game:started', {
          success: true,
          gameState: game.getPublicState(),
          message: 'Game started successfully'
        });

        if (callback) {
          callback({
            success: true,
            message: 'Game started successfully'
          });
        }
      } catch (error) {
        console.error('Error starting game:', error);
        if (callback) {
          callback({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to start game'
          });
        }
      }
    });

    const emitGameState = (gameCode: string, game: ReturnType<typeof gameManager.getGame>, event: string) => {
      if (!game) return;
      io.in(gameCode).emit(event, { success: true, gameState: game.getPublicState() });
    };

    // Handle a raise or pass during the bidding phase.
    socket.on('game:bid', (params: BidParams, callback) => {
      const playerInfo = gameManager.findPlayerBySocketId(socket.id);
      const game = playerInfo ? gameManager.getGame(playerInfo.gameCode) : undefined;
      if (!playerInfo || !game) {
        callback?.({ success: false, message: 'Player not found in a game' });
        return;
      }

      const result = game.submitBid(playerInfo.playerId, params?.amount);
      if (!result.success) {
        callback?.(result);
        return;
      }

      emitGameState(playerInfo.gameCode, game, 'game:biddingUpdated');
      callback?.({ success: true, gameState: game.getPublicState() });
    });

    socket.on('game:pass', (callback) => {
      const playerInfo = gameManager.findPlayerBySocketId(socket.id);
      const game = playerInfo ? gameManager.getGame(playerInfo.gameCode) : undefined;
      if (!playerInfo || !game) {
        callback?.({ success: false, message: 'Player not found in a game' });
        return;
      }

      const result = game.submitBid(playerInfo.playerId, null);
      if (!result.success) {
        callback?.(result);
        return;
      }

      emitGameState(playerInfo.gameCode, game, 'game:biddingUpdated');
      callback?.({ success: true, gameState: game.getPublicState() });
    });

    // The winning bidder names partner cards and declares the trump (cut) suit.
    socket.on('game:setContract', (params: ContractParams, callback) => {
      const playerInfo = gameManager.findPlayerBySocketId(socket.id);
      const game = playerInfo ? gameManager.getGame(playerInfo.gameCode) : undefined;
      if (!playerInfo || !game) {
        callback?.({ success: false, message: 'Player not found in a game' });
        return;
      }

      const result = game.submitContract(playerInfo.playerId, params?.partnerCalls || [], params?.cutSuit);
      if (!result.success) {
        callback?.(result);
        return;
      }

      emitGameState(playerInfo.gameCode, game, 'game:contractSet');
      callback?.({ success: true, gameState: game.getPublicState() });
    });

    // Handle playing a card
    socket.on('game:playCard', (params: PlayCardParams, callback) => {
      try {
        const playerInfo = gameManager.findPlayerBySocketId(socket.id);
        const playerId = playerInfo?.playerId;
        const { card } = params;

        // Find the player's game
        const game = playerId ? gameManager.getGameByPlayerId(playerId) : undefined;
        if (!playerId || !game) {
          if (callback) {
            callback({
              success: false,
              message: 'Game not found'
            });
          }
          return;
        }

        const gameCode = game.getState().code;
        const result = gameManager.playCard(gameCode, playerId, card);

        if (!result.success) {
          if (callback) {
            callback({
              success: false,
              message: result.message
            });
          }
          return;
        }

        const playResult = result.result;
        const gameState = result.game!.getState();

        // Prepare response data
        const responseData = {
          success: true,
          play: {
            playerId,
            card
          },
          nextPlayer: playResult.nextPlayer,
          roundComplete: playResult.roundComplete,
          roundWinner: playResult.roundWinner,
          roundPoints: playResult.roundPoints,
          scores: gameState.scores,
          gameOver: gameState.gameOver,
          winner: gameState.winner,
          winningTeamPlayerIds: gameState.winningTeamPlayerIds,
          contract: gameState.contract,
          contractResult: gameState.contractResult,
          roundNumber: gameState.roundNumber,
          message: 'Card played successfully'
        };

        // Send response to the client
        if (callback) {
          callback(responseData);
        }

        // Broadcast to all players in the game
        io.in(gameCode).emit('game:cardPlayed', responseData);

        // If the round is complete, broadcast the winner and its points.
        if (playResult.roundComplete) {
          console.log(`Round completed in game ${gameCode}`);
          console.log(`Round winner: ${getPlayerNameById(playResult.roundWinner!, gameState.players)}`);
          console.log(`Points earned: ${playResult.roundPoints}`);
          console.log(`Updated scores: ${JSON.stringify(gameState.scores)}`);
          
          io.in(gameCode).emit('game:roundComplete', {
            winner: playResult.roundWinner,
            points: playResult.roundPoints,
            scores: gameState.scores,
            lastRound: gameState.lastRound,
            roundNumber: gameState.roundNumber
          });
        }

        // If the game is over, emit a game over event
        if (gameState.gameOver) {
          const winnerName = getPlayerNameById(gameState.winner!, gameState.players);
          console.log(`Game ${gameCode} is over`);
          console.log(`Winner: ${winnerName} (${gameState.winner})`);
          console.log(`Final scores: ${JSON.stringify(gameState.scores)}`);
          
          io.in(gameCode).emit('game:over', {
            winner: gameState.winner,
            winningTeamPlayerIds: gameState.winningTeamPlayerIds,
            contractResult: gameState.contractResult,
            scores: gameState.scores,
            gameOver: true,
            gameStatus: 'finished'
          });
        }
      } catch (error) {
        console.error('Error playing card:', error);
        if (callback) {
          callback({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to play card'
          });
        }
      }
    });

    // Helper function to get player name by ID
    function getPlayerNameById(playerId: string, players: any[]): string {
      const player = players.find(p => p.id === playerId);
      return player ? player.name : 'Unknown';
    }

    // Handle game rematch
    socket.on('game:rematch', (callback) => {
      try {
        // Find the player and game
        const playerInfo = gameManager.findPlayerBySocketId(socket.id);
        if (!playerInfo) {
          if (callback) {
            callback({
              success: false,
              message: 'Player not found'
            });
          }
          return;
        }

        const { gameCode } = playerInfo;
        const result = gameManager.restartGame(gameCode);

        if (!result.success) {
          if (callback) {
            callback({
              success: false,
              message: result.message
            });
          }
          return;
        }

        const game = result.game!;
        const gameState = game.getState();

        // Deliver each private hand before announcing that the new bidding phase is open.
        gameState.players.forEach(player => {
          const socketId = player.socketId;
          const playerSocket = io.sockets.sockets.get(socketId);
          
          if (playerSocket) {
            playerSocket.emit('game:playerState', {
              hand: gameState.hands[player.id],
              currentPlayerId: player.id
            });
          }
        });

        io.in(gameCode).emit('game:restarted', {
          success: true,
          gameState: game.getPublicState(),
          message: 'Game restarted successfully'
        });

        if (callback) {
          callback({
            success: true,
            message: 'Game restarted successfully'
          });
        }
      } catch (error) {
        console.error('Error restarting game:', error);
        if (callback) {
          callback({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to restart game'
          });
        }
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      try {
        console.log('User disconnected:', socket.id);

        const playerInfo = gameManager.findPlayerBySocketId(socket.id);
        if (!playerInfo) {
          console.log(`No game found for disconnected socket ${socket.id}`);
          return;
        }

        const { playerId, gameCode } = playerInfo;
        const disconnected = gameManager.markPlayerDisconnected(playerId, socket.id);
        if (!disconnected) return;

        const previousTimer = disconnectTimers.get(playerId);
        if (previousTimer) clearTimeout(previousTimer);

        io.to(gameCode).emit('game:playerDisconnected', {
          playerId,
          gracePeriodMs: RECONNECT_GRACE_MS,
          gameState: disconnected.game.getPublicState()
        });

        const timer = setTimeout(() => {
          disconnectTimers.delete(playerId);
          const result = gameManager.removePlayer(playerId, socket.id);
          if (!result.success) return;

          const game = gameManager.getGame(gameCode);
          io.to(gameCode).emit('game:playerLeft', {
            playerId,
            gameState: game?.getPublicState(),
            players: game?.getPublicState().players || [],
            message: 'The reconnect window expired; the player was removed from the game'
          });
        }, RECONNECT_GRACE_MS);
        timer.unref?.();
        disconnectTimers.set(playerId, timer);
      } catch (error) {
        // Catch-all error handler to prevent server crashes
        console.error('Unhandled error in disconnect handler:', error);
      }
    });
  });
};
