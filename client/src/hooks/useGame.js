import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import gameService from '../services/gameService';

// Initial game state
const INITIAL_STATE = {
  gameCode: null,
  currentPlayerId: null,
  currentPlayer: null,
  players: [],
  hand: [],
  playedCards: [],
  scores: {},
  trickNumber: 0,
  gameOver: false,
  winner: null,
  lastTrick: null,
  targetScore: 75,
  gameStatus: 'waiting'
};

export const useGame = () => {
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState(null);
  const { socket, connected } = useSocket();
  
  // Set up socket event listeners for game events
  useEffect(() => {
    if (!connected) {
      console.log('[useGame] Socket not connected, waiting...');
      return;
    }
    
    console.log('[useGame] Setting up game event listeners');
    
    // Handle player joined event
    const handlePlayerJoined = (data) => {
      console.log('[useGame] Player joined:', data);
      if (data) {
        setGameState(prev => ({
          ...prev,
          players: data.players || [data.player] || prev.players
        }));
      }
    };
    
    // Handle game started event
    const handleGameStarted = (data) => {
      console.log('[useGame] Game started:', data);
      if (data && data.success) {
        const { gameState: newState } = data;
        console.log('[useGame] Updating game state with new state:', newState);
        
        setGameState(prev => {
          // Determine the player's hand
          let newHand = [];
          if (newState.hand) {
            // If hand is provided directly
            newHand = newState.hand;
          } else if (newState.hands && prev.currentPlayerId) {
            // If hands is provided as a map of player IDs to hands
            newHand = newState.hands[prev.currentPlayerId] || [];
          }
          console.log('[useGame] Setting hand:', newHand, 'for player:', prev.currentPlayerId);
          
          return {
            ...prev,
            currentPlayer: newState.currentPlayer,
            hand: newHand,
            playedCards: newState.playedCards || [],
            scores: newState.scores || {},
            trickNumber: newState.trickNumber || 0,
            gameOver: newState.gameOver || false,
            winner: newState.winner,
            lastTrick: newState.lastTrick,
            targetScore: newState.targetScore || 75,
            gameStatus: 'playing'
          };
        });
      }
    };
    
    // Handle card played event
    const handleCardPlayed = (data) => {
      console.log('[useGame] Card played:', data);
      if (data && data.success) {
        setGameState(prev => {
          // Process the played card
          const updatedPlayedCards = [...prev.playedCards, data.play];
          
          // Remove the card from hand if it's the current player
          let updatedHand = [...prev.hand];
          if (data.play.playerId === prev.currentPlayerId) {
            updatedHand = updatedHand.filter(card => 
              card.suit !== data.play.card.suit || 
              card.value !== data.play.card.value
            );
          }
          
          return {
            ...prev,
            hand: updatedHand,
            playedCards: updatedPlayedCards,
            currentPlayer: data.nextPlayer
          };
        });
      }
    };
    
    // Handle trick complete event
    const handleTrickComplete = (data) => {
      console.log('[useGame] Trick complete:', data);
      if (data) {
        setGameState(prev => ({
          ...prev,
          playedCards: [],
          scores: data.scores || prev.scores,
          lastTrick: {
            winner: data.winner,
            points: data.points
          },
          trickNumber: prev.trickNumber + 1
        }));
      }
    };
    
    // Handle game over event
    const handleGameOver = (data) => {
      console.log('[useGame] Game over:', data);
      if (data) {
        setGameState(prev => ({
          ...prev,
          gameOver: true,
          winner: data.winner,
          scores: data.scores || prev.scores,
          gameStatus: 'finished'
        }));
      }
    };
    
    // Handle game restarted event
    const handleGameRestarted = (data) => {
      console.log('[useGame] Game restarted:', data);
      if (data && data.success) {
        const { gameState: newState } = data;
        setGameState(prev => ({
          ...prev,
          currentPlayer: newState.currentPlayer,
          hand: newState.hands[prev.currentPlayerId] || [],
          playedCards: [],
          scores: newState.scores || {},
          trickNumber: 0,
          gameOver: false,
          winner: null,
          lastTrick: null,
          gameStatus: 'playing'
        }));
      }
    };
    
    // Handle error event
    const handleError = (data) => {
      console.error('[useGame] Game error:', data);
      if (data) {
        setErrorMessage(data.message || 'An unknown error occurred');
      }
    };
    
    // Handle player state event (for getting hand)
    const handlePlayerState = (data) => {
      console.log('[useGame] Player state received:', data);
      if (data && data.hand) {
        setGameState(prev => ({
          ...prev,
          hand: data.hand,
          currentPlayerId: data.currentPlayerId || prev.currentPlayerId
        }));
      }
    };
    
    // Register event handlers
    socket.on('game:playerJoined', handlePlayerJoined);
    socket.on('game:started', handleGameStarted);
    socket.on('game:cardPlayed', handleCardPlayed);
    socket.on('game:trickComplete', handleTrickComplete);
    socket.on('game:over', handleGameOver);
    socket.on('game:restarted', handleGameRestarted);
    socket.on('game:error', handleError);
    socket.on('game:playerState', handlePlayerState);
    
    // Clean up on unmount or when socket changes
    return () => {
      console.log('[useGame] Cleaning up game event listeners');
      socket.off('game:playerJoined', handlePlayerJoined);
      socket.off('game:started', handleGameStarted);
      socket.off('game:cardPlayed', handleCardPlayed);
      socket.off('game:trickComplete', handleTrickComplete);
      socket.off('game:over', handleGameOver);
      socket.off('game:restarted', handleGameRestarted);
      socket.off('game:error', handleError);
      socket.off('game:playerState', handlePlayerState);
    };
  }, [connected, socket]);
  
  // Game operations - using our gameService
  
  // Create a new game
  const createGame = useCallback((playerName) => {
    console.log('[useGame] Creating game with player name:', playerName);
    setErrorMessage(null);
    
    return new Promise((resolve, reject) => {
      gameService.createGame(playerName, (response) => {
        console.log('[useGame] Create game response:', response);
        
        if (response && response.success) {
          // Update game state
          setGameState(prev => ({
            ...prev,
            gameCode: response.gameCode,
            currentPlayerId: response.player.id,
            players: [response.player],
            gameStatus: 'waiting'
          }));
          resolve(response);
        } else {
          // Handle error
          const errorMsg = response ? response.message : 'Failed to create game';
          setErrorMessage(errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });
  }, []);
  
  // Join an existing game
  const joinGame = useCallback((gameCode, playerName) => {
    console.log('[useGame] Joining game with code:', gameCode, 'and name:', playerName);
    setErrorMessage(null);
    
    return new Promise((resolve, reject) => {
      gameService.joinGame(gameCode, playerName, (response) => {
        console.log('[useGame] Join game response:', response);
        
        if (response && response.success) {
          // Update game state
          setGameState(prev => ({
            ...prev,
            gameCode: response.gameCode,
            currentPlayerId: response.player.id,
            players: response.players || [response.player],
            gameStatus: 'waiting'
          }));
          resolve(response);
        } else {
          // Handle error
          const errorMsg = response ? response.message : 'Failed to join game';
          setErrorMessage(errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });
  }, []);
  
  // Start a game
  const startGame = useCallback(() => {
    console.log('[useGame] Starting game');
    setErrorMessage(null);
    
    return new Promise((resolve, reject) => {
      gameService.startGame((response) => {
        console.log('[useGame] Start game response:', response);
        
        if (response && response.success) {
          // Game state will be updated via the game:started event handler
          resolve(response);
        } else {
          // Handle error
          const errorMsg = response ? response.message : 'Failed to start game';
          setErrorMessage(errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });
  }, []);
  
  // Play a card
  const playCard = useCallback((playerId, card) => {
    console.log('[useGame] Playing card:', playerId, card);
    setErrorMessage(null);
    
    // Validate inputs
    if (!playerId || !card || !card.suit || !card.value) {
      const errorMsg = 'Invalid card or player ID';
      setErrorMessage(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    
    // Make sure it's the player's turn
    if (gameState.currentPlayer !== playerId) {
      const errorMsg = 'Not your turn';
      setErrorMessage(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    
    return new Promise((resolve, reject) => {
      gameService.playCard(playerId, card, (response) => {
        console.log('[useGame] Play card response:', response);
        
        if (response && response.success) {
          // Card play will be handled via the game:cardPlayed event handler
          resolve(response);
        } else {
          // Handle error
          const errorMsg = response ? response.message : 'Failed to play card';
          setErrorMessage(errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });
  }, [gameState.currentPlayer]);
  
  // Request a rematch
  const rematch = useCallback(() => {
    console.log('[useGame] Requesting rematch');
    setErrorMessage(null);
    
    return new Promise((resolve, reject) => {
      gameService.rematch((response) => {
        console.log('[useGame] Rematch response:', response);
        
        if (response && response.success) {
          // Game state will be updated via the game:restarted event handler
          resolve(response);
        } else {
          // Handle error
          const errorMsg = response ? response.message : 'Failed to request rematch';
          setErrorMessage(errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });
  }, []);
  
  // Utility function to check if it's the current player's turn
  const isCurrentPlayer = useCallback(() => {
    return gameState.currentPlayer === gameState.currentPlayerId;
  }, [gameState.currentPlayer, gameState.currentPlayerId]);
  
  return {
    gameState,
    errorMessage,
    createGame,
    joinGame,
    startGame,
    playCard,
    rematch,
    isCurrentPlayer
  };
}; 