import { mockEventResponses } from './mockData';
import broadcastService from './broadcastService';

class MockSocket {
  constructor() {
    this.listeners = {};
    this.connected = false;
    this.gameState = null;
    this.currentGame = null;

    // Subscribe to broadcast events
    broadcastService.subscribe('playerJoined', (data) => {
      if (data.gameCode === this.currentGame) {
        this._trigger('game:playerJoined', data);
      }
    });

    broadcastService.subscribe('gameStarted', (data) => {
      if (data.gameCode === this.currentGame) {
        this.gameState = data.gameState;
        this._trigger('game:started', data);
      }
    });

    broadcastService.subscribe('cardPlayed', (data) => {
      if (data.gameCode === this.currentGame) {
        this._trigger('game:cardPlayed', data);
        
        // If the trick is complete, emit a trick completed event
        if (data.trickComplete) {
          this._trigger('game:trickComplete', {
            winner: data.trickWinner,
            points: data.trickPoints,
            scores: data.scores
          });
        }
        
        // If the game is over, emit a game over event
        if (data.gameOver) {
          this._trigger('game:over', {
            winner: data.winner,
            scores: data.scores
          });
        }
      }
    });

    broadcastService.subscribe('gameRestarted', (data) => {
      if (data.gameCode === this.currentGame) {
        this.gameState = data.gameState;
        this._trigger('game:restarted', data);
      }
    });
  }

  connect() {
    this.connected = true;
    if (this.listeners['connect']) {
      this.listeners['connect']();
    }
  }

  disconnect() {
    this.connected = false;
    if (this.listeners['disconnect']) {
      this.listeners['disconnect']();
    }
  }

  emit(event, ...args) {
    console.log(`Emitting ${event}`, args); // Debug log
    // Simulate network delay
    setTimeout(() => {
      switch (event) {
        case 'game:create': {
          const response = mockEventResponses[event](args[0]);
          console.log('Create game response:', response); // Debug log
          if (response.success) {
            this.currentGame = response.gameCode;
            this._trigger('game:created', response);
            this._trigger('game:playerJoined', {
              ...response,
              players: [response.player]
            });
          } else {
            this._trigger('game:error', response);
          }
          break;
        }
        case 'game:join': {
          const [gameCode, playerName] = args;
          const response = mockEventResponses[event](gameCode, playerName);
          if (response.success) {
            this.currentGame = response.gameCode;
            // Broadcast to all tabs that a player joined
            broadcastService.broadcast('playerJoined', response);
            this._trigger('game:playerJoined', response);
          } else {
            this._trigger('game:error', response);
          }
          break;
        }
        case 'game:start': {
          if (!this.currentGame) {
            this._trigger('game:error', { 
              success: false, 
              message: 'No game code available' 
            });
            return;
          }
          const response = mockEventResponses[event](this.currentGame);
          if (response.success) {
            this.gameState = response.gameState;
            // Broadcast to all tabs that the game started
            broadcastService.broadcast('gameStarted', {
              ...response,
              gameCode: this.currentGame
            });
            this._trigger('game:started', response);
          } else {
            this._trigger('game:error', response);
          }
          break;
        }
        case 'game:playCard': {
          if (!this.currentGame) {
            this._trigger('game:error', { 
              success: false, 
              message: 'No game code available' 
            });
            return;
          }
          const response = mockEventResponses[event](this.currentGame, args[0], args[1]);
          if (response.success) {
            // Broadcast to all tabs that a card was played
            broadcastService.broadcast('cardPlayed', {
              ...response,
              gameCode: this.currentGame
            });
            this._trigger('game:cardPlayed', response);
            
            // If the trick is complete, emit a trick completed event
            if (response.trickComplete) {
              this._trigger('game:trickComplete', {
                winner: response.trickWinner,
                points: response.trickPoints,
                scores: response.scores
              });
            }
            
            // If the game is over, emit a game over event
            if (response.gameOver) {
              this._trigger('game:over', {
                winner: response.winner,
                scores: response.scores
              });
            }
          } else {
            this._trigger('game:error', response);
          }
          break;
        }
        case 'game:rematch': {
          if (!this.currentGame) {
            this._trigger('game:error', { 
              success: false, 
              message: 'No game code available' 
            });
            return;
          }
          const response = mockEventResponses[event](this.currentGame);
          if (response.success) {
            this.gameState = response.gameState;
            // Broadcast to all tabs that the game was restarted
            broadcastService.broadcast('gameRestarted', {
              ...response,
              gameCode: this.currentGame
            });
            this._trigger('game:restarted', response);
          } else {
            this._trigger('game:error', response);
          }
          break;
        }
        default:
          console.warn(`No mock handler for event: ${event}`);
      }
    }, 100); // Simulate 100ms delay
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  _trigger(event, ...args) {
    console.log(`Triggering ${event}`, args); // Debug log
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(...args));
    }
  }
}

// Singleton instance
const mockSocket = new MockSocket();

export default mockSocket; 