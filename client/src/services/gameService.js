import socket from './socketService';

// Game service functions - using the exact same format as test.html
export const gameService = {
  // Create a new game
  createGame: (playerName, callback) => {
    console.log('[gameService] Creating game with player name:', playerName);
    
    if (!socket.connected) {
      console.log('[gameService] Socket not connected, connecting...');
      socket.connect();
    }
    
    // Use the exact format from test.html
    socket.emit('game:create', { playerName }, callback);
  },
  
  // Join an existing game
  joinGame: (gameCode, playerName, callback) => {
    console.log('[gameService] Joining game with code:', gameCode, 'and name:', playerName);
    
    if (!socket.connected) {
      console.log('[gameService] Socket not connected, connecting...');
      socket.connect();
    }
    
    // Use the exact format from test.html
    socket.emit('game:join', { gameCode, playerName }, callback);
  },
  
  // Start a game
  startGame: (callback) => {
    console.log('[gameService] Starting game');
    
    if (!socket.connected) {
      console.log('[gameService] Socket not connected, connecting...');
      socket.connect();
    }
    
    // Use the exact format from test.html
    socket.emit('game:start', callback);
  },
  
  // Play a card
  playCard: (playerId, card, callback) => {
    console.log('[gameService] Playing card:', playerId, card);
    
    if (!socket.connected) {
      console.log('[gameService] Socket not connected, connecting...');
      socket.connect();
    }
    
    // Use the exact format from test.html
    socket.emit('game:playCard', { playerId, card }, callback);
  },
  
  // Request a rematch
  rematch: (callback) => {
    console.log('[gameService] Requesting rematch');
    
    if (!socket.connected) {
      console.log('[gameService] Socket not connected, connecting...');
      socket.connect();
    }
    
    // Use the exact format from test.html
    socket.emit('game:rematch', callback);
  }
};

export default gameService; 