import { Server, Socket } from 'socket.io';
import { GameManager } from '../models/GameManager';
import { CreateGameParams, JoinGameParams, PlayCardParams } from '../types';

// Create a singleton instance of GameManager
const gameManager = new GameManager();

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
              handSize: player.handSize
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
          handSize: p.handSize
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
              handSize: result.player!.handSize
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
            handSize: result.player!.handSize
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

        // Send game state to all players
        io.in(gameCode).emit('game:started', {
          success: true,
          gameState: {
            gameCode,
            players: gameState.players.map(p => ({
              id: p.id,
              name: p.name,
              handSize: p.handSize
            })),
            currentPlayer: gameState.currentPlayer,
            trickNumber: gameState.trickNumber,
            scores: gameState.scores,
            gameOver: gameState.gameOver,
            winner: gameState.winner,
            targetScore: gameState.targetScore,
            status: gameState.status
          },
          message: 'Game started successfully'
        });

        // Send player-specific data to each player
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

    // Handle playing a card
    socket.on('game:playCard', (params: PlayCardParams, callback) => {
      try {
        const { playerId, card } = params;

        // Find the player's game
        const game = gameManager.getGameByPlayerId(playerId);
        if (!game) {
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
          trickComplete: playResult.trickComplete,
          trickWinner: playResult.trickWinner,
          trickPoints: playResult.trickPoints,
          scores: gameState.scores,
          gameOver: gameState.gameOver,
          winner: gameState.winner,
          message: 'Card played successfully'
        };

        // Send response to the client
        if (callback) {
          callback(responseData);
        }

        // Broadcast to all players in the game
        io.in(gameCode).emit('game:cardPlayed', responseData);

        // If the trick is complete, emit a trick complete event
        if (playResult.trickComplete) {
          console.log(`Trick completed in game ${gameCode}`);
          console.log(`Trick winner: ${getPlayerNameById(playResult.trickWinner!, gameState.players)}`);
          console.log(`Points earned: ${playResult.trickPoints}`);
          console.log(`Updated scores: ${JSON.stringify(gameState.scores)}`);
          
          io.in(gameCode).emit('game:trickComplete', {
            winner: playResult.trickWinner,
            points: playResult.trickPoints,
            scores: gameState.scores,
            lastTrick: gameState.lastTrick
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

        // Send game state to all players
        io.in(gameCode).emit('game:restarted', {
          success: true,
          gameState: {
            gameCode,
            players: gameState.players.map(p => ({
              id: p.id,
              name: p.name,
              handSize: p.handSize
            })),
            currentPlayer: gameState.currentPlayer,
            trickNumber: gameState.trickNumber,
            scores: gameState.scores,
            gameOver: gameState.gameOver,
            winner: gameState.winner,
            targetScore: gameState.targetScore,
            status: gameState.status
          },
          message: 'Game restarted successfully'
        });

        // Send player-specific data to each player
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

        // Find the player and remove them from their game
        const playerInfo = gameManager.findPlayerBySocketId(socket.id);
        if (playerInfo) {
          const { playerId, gameCode } = playerInfo;
          console.log(`Player ${playerId} in game ${gameCode} disconnected`);
          
          try {
            const result = gameManager.removePlayer(playerId, socket.id);

            if (result.success) {
              console.log(`Successfully removed player ${playerId} from game ${gameCode}`);
              
              if (result.remainingPlayers && result.remainingPlayers.length > 0) {
                console.log(`Notifying ${result.remainingPlayers.length} remaining players in game ${gameCode}`);
                
                // Notify remaining players
                socket.to(gameCode).emit('game:playerLeft', {
                  playerId,
                  players: result.remainingPlayers.map(p => ({
                    id: p.id,
                    name: p.name,
                    handSize: p.handSize
                  })),
                  message: 'A player has left the game'
                });
              } else {
                console.log(`No players remaining in game ${gameCode} after player ${playerId} left`);
              }
            } else {
              console.log(`Failed to remove player ${playerId} from game: ${result.message}`);
            }
          } catch (removeError) {
            console.error(`Error removing player ${playerId} from game ${gameCode}:`, removeError);
          }
        } else {
          console.log(`No game found for disconnected socket ${socket.id}`);
        }
      } catch (error) {
        // Catch-all error handler to prevent server crashes
        console.error('Unhandled error in disconnect handler:', error);
      }
    });
  });
}; 