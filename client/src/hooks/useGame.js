import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { isValidPlay } from '../services/gameRules';

const INITIAL_STATE = {
  players: [],
  currentPlayer: null,
  gameStatus: 'waiting', // waiting, playing, finished
  hand: [],
  playedCards: [],
  scores: {},
  currentPlayerId: null, // Track the current client's player ID
  gameCode: null, // Track the current game code
  trickNumber: 0,
  gameOver: false,
  winner: null,
  lastTrick: null,
  targetScore: 75 // Default target score
};

export const useGame = () => {
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState(null);
  const { emit, on } = useSocket();

  // Set up socket event listeners
  useEffect(() => {
    const handleGameCreated = (response) => {
      if (response.success) {
        setGameState(prev => ({
          ...prev,
          gameCode: response.gameCode,
          currentPlayerId: response.player.id,
          players: [response.player]
        }));
      }
    };

    const handlePlayerJoined = (response) => {
      if (response.success) {
        setGameState(prev => ({
          ...prev,
          currentPlayerId: prev.currentPlayerId || response.player.id,
          gameCode: response.gameCode,
          players: response.players || [...prev.players, response.player]
        }));
      }
    };

    const handleGameStarted = (response) => {
      if (response.success) {
        setGameState(prev => ({
          ...prev,
          gameStatus: 'playing',
          currentPlayer: response.gameState.currentPlayer,
          hand: response.gameState.hands[prev.currentPlayerId] || [],
          scores: response.gameState.scores,
          playedCards: [],
          trickNumber: response.gameState.trickNumber,
          gameOver: response.gameState.gameOver,
          winner: response.gameState.winner,
          targetScore: response.gameState.targetScore || 75
        }));
      }
    };

    const handleCardPlayed = (response) => {
      if (response.success) {
        setGameState(prev => ({
          ...prev,
          playedCards: [...prev.playedCards, response.play],
          hand: prev.hand.filter(card => 
            !(card.suit === response.play.card.suit && card.value === response.play.card.value)
          ),
          currentPlayer: response.nextPlayer,
          scores: response.scores || prev.scores
        }));
      }
    };

    const handleTrickComplete = (response) => {
      setGameState(prev => ({
        ...prev,
        playedCards: [],
        trickNumber: prev.trickNumber + 1,
        scores: response.scores,
        lastTrick: {
          winner: response.winner,
          points: response.points
        }
      }));
    };

    const handleGameOver = (response) => {
      setGameState(prev => ({
        ...prev,
        gameStatus: 'finished',
        gameOver: true,
        winner: response.winner,
        scores: response.scores
      }));
    };

    const handleGameRestarted = (response) => {
      if (response.success) {
        setGameState(prev => ({
          ...prev,
          gameStatus: 'playing',
          currentPlayer: response.gameState.currentPlayer,
          hand: response.gameState.hands[prev.currentPlayerId] || [],
          scores: response.gameState.scores,
          playedCards: [],
          trickNumber: response.gameState.trickNumber,
          gameOver: response.gameState.gameOver,
          winner: response.gameState.winner,
          lastTrick: null,
          targetScore: response.gameState.targetScore || prev.targetScore
        }));
      }
    };

    const handleError = (response) => {
      console.error('Game error:', response.message);
      setErrorMessage(response.message);
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
    };

    // Subscribe to events
    const unsubscribes = [
      on('game:created', handleGameCreated),
      on('game:playerJoined', handlePlayerJoined),
      on('game:started', handleGameStarted),
      on('game:cardPlayed', handleCardPlayed),
      on('game:trickComplete', handleTrickComplete),
      on('game:over', handleGameOver),
      on('game:restarted', handleGameRestarted),
      on('game:error', handleError)
    ];

    // Cleanup subscriptions
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [on]);

  const createGame = useCallback((playerName) => {
    emit('game:create', playerName);
  }, [emit]);

  const joinGame = useCallback((gameCode, playerName) => {
    emit('game:join', gameCode, playerName);
  }, [emit]);

  const startGame = useCallback(() => {
    emit('game:start');
  }, [emit]);

  const playCard = useCallback((playerId, card) => {
    // Check if it's a valid play locally before sending to server
    const isFirstPlay = gameState.playedCards.length === 0 && gameState.trickNumber === 0;
    const valid = isValidPlay(card, gameState.hand, gameState.playedCards, isFirstPlay);
    
    if (!valid) {
      setErrorMessage('Invalid move: you must follow suit if possible');
      setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
      return;
    }
    
    emit('game:playCard', playerId, card);
  }, [emit, gameState.hand, gameState.playedCards, gameState.trickNumber]);

  const rematch = useCallback(() => {
    emit('game:rematch');
  }, [emit]);

  const getNextPlayer = (players, currentPlayerId) => {
    const currentIndex = players.findIndex(p => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % players.length;
    return players[nextIndex]?.id;
  };

  return {
    gameState,
    errorMessage,
    createGame,
    joinGame,
    startGame,
    playCard,
    rematch,
    isCurrentPlayer: gameState.currentPlayer === gameState.currentPlayerId
  };
}; 