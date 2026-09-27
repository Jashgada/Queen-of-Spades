import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import gameService from '../services/gameService';

const INITIAL_STATE = {
  gameCode: null,
  currentPlayerId: null,
  currentPlayer: null,
  players: [],
  hand: [],
  currentRound: [],
  rounds: [],
  scores: {},
  roundNumber: 0,
  gameOver: false,
  winner: null,
  winningTeamPlayerIds: [],
  lastRound: null,
  currentBid: null,
  currentBidder: null,
  passedPlayers: [],
  bidHistory: [],
  contract: null,
  contractResult: null,
  gameStatus: 'waiting',
  hostId: null
};

const mergePublicGameState = (previous, publicState) => ({
  ...previous,
  ...publicState,
  gameCode: publicState.code || publicState.gameCode || previous.gameCode,
  gameStatus: publicState.status || previous.gameStatus
});

export const useGame = () => {
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!connected) return undefined;

    const applyState = (data) => {
      if (data?.success && data.gameState) {
        setGameState(previous => mergePublicGameState(previous, data.gameState));
      }
    };

    const handlePlayerJoined = (data) => {
      if (!data) return;
      setGameState(previous => ({
        ...previous,
        players: data.players || [...previous.players, data.player].filter(Boolean),
        hostId: previous.hostId || (data.players?.length === 1 ? data.players[0].id : null)
      }));
    };

    const handleCardPlayed = (data) => {
      if (!data?.success) return;
      setGameState(previous => {
        const hand = data.play.playerId === previous.currentPlayerId
          ? previous.hand.filter(card => !(card.suit === data.play.card.suit && card.value === data.play.card.value))
          : previous.hand;
        const currentRound = [...previous.currentRound, data.play].filter((play, index, plays) =>
          plays.findIndex(candidate => candidate.playerId === play.playerId && candidate.card.suit === play.card.suit && candidate.card.value === play.card.value) === index
        );

        return {
          ...previous,
          hand,
          currentRound,
          currentPlayer: data.nextPlayer,
          scores: data.scores || previous.scores,
          contract: data.contract || previous.contract,
          gameOver: data.gameOver ?? previous.gameOver,
          winner: data.winner ?? previous.winner,
          winningTeamPlayerIds: data.winningTeamPlayerIds || previous.winningTeamPlayerIds,
          contractResult: data.contractResult || previous.contractResult,
          roundNumber: data.roundNumber ?? previous.roundNumber
        };
      });
    };

    const handleRoundComplete = (data) => {
      if (!data) return;
      setGameState(previous => ({
        ...previous,
        currentRound: [],
        rounds: data.round ? [...previous.rounds, data.round] : previous.rounds,
        scores: data.scores || previous.scores,
        lastRound: data.lastRound || { winner: data.winner, points: data.points },
        roundNumber: data.roundNumber ?? previous.roundNumber
      }));
    };

    const handleGameOver = (data) => {
      if (!data) return;
      setGameState(previous => ({
        ...previous,
        gameOver: true,
        winner: data.winner,
        winningTeamPlayerIds: data.winningTeamPlayerIds || [],
        contractResult: data.contractResult || previous.contractResult,
        scores: data.scores || previous.scores,
        gameStatus: 'finished'
      }));
    };

    const handleError = (data) => setErrorMessage(data?.message || 'An unknown game error occurred');

    const handlePlayerState = (data) => {
      if (!data?.hand) return;
      setGameState(previous => ({
        ...previous,
        hand: data.hand,
        currentPlayerId: data.currentPlayerId || previous.currentPlayerId
      }));
    };

    socket.on('game:playerJoined', handlePlayerJoined);
    socket.on('game:started', applyState);
    socket.on('game:biddingUpdated', applyState);
    socket.on('game:contractSet', applyState);
    socket.on('game:restarted', applyState);
    socket.on('game:cardPlayed', handleCardPlayed);
    socket.on('game:roundComplete', handleRoundComplete);
    socket.on('game:over', handleGameOver);
    socket.on('game:error', handleError);
    socket.on('game:playerState', handlePlayerState);

    return () => {
      socket.off('game:playerJoined', handlePlayerJoined);
      socket.off('game:started', applyState);
      socket.off('game:biddingUpdated', applyState);
      socket.off('game:contractSet', applyState);
      socket.off('game:restarted', applyState);
      socket.off('game:cardPlayed', handleCardPlayed);
      socket.off('game:roundComplete', handleRoundComplete);
      socket.off('game:over', handleGameOver);
      socket.off('game:error', handleError);
      socket.off('game:playerState', handlePlayerState);
    };
  }, [connected, socket]);

  const createGame = useCallback((playerName) => {
    setErrorMessage(null);
    return new Promise((resolve, reject) => {
      gameService.createGame(playerName, response => {
        if (response?.success) {
          setGameState(() => ({
            ...INITIAL_STATE,
            gameCode: response.gameCode,
            currentPlayerId: response.player.id,
            hostId: response.player.id,
            players: [response.player]
          }));
          resolve(response);
          return;
        }
        const message = response?.message || 'Failed to create game';
        setErrorMessage(message);
        reject(new Error(message));
      });
    });
  }, []);

  const joinGame = useCallback((gameCode, playerName) => {
    setErrorMessage(null);
    return new Promise((resolve, reject) => {
      gameService.joinGame(gameCode, playerName, response => {
        if (response?.success) {
          setGameState(previous => ({
            ...INITIAL_STATE,
            gameCode: response.gameCode,
            currentPlayerId: response.player.id,
            hostId: response.hostId || previous.hostId,
            players: response.players || [response.player]
          }));
          resolve(response);
          return;
        }
        const message = response?.message || 'Failed to join game';
        setErrorMessage(message);
        reject(new Error(message));
      });
    });
  }, []);

  const runGameAction = useCallback((action, ...args) => {
    setErrorMessage(null);
    return new Promise((resolve, reject) => {
      gameService[action](...args, response => {
        if (response?.success) {
          resolve(response);
          return;
        }
        const message = response?.message || 'Game action failed';
        setErrorMessage(message);
        reject(new Error(message));
      });
    });
  }, []);

  const startGame = useCallback(() => runGameAction('startGame'), [runGameAction]);
  const placeBid = useCallback(amount => runGameAction('placeBid', amount), [runGameAction]);
  const passBid = useCallback(() => runGameAction('passBid'), [runGameAction]);
  const setContract = useCallback((partnerCalls, cutSuit) => runGameAction('setContract', partnerCalls, cutSuit), [runGameAction]);

  const playCard = useCallback((playerId, card) => {
    if (!playerId || !card?.suit || !card?.value) {
      return Promise.reject(new Error('Invalid card or player ID'));
    }
    if (gameState.currentPlayer !== playerId) {
      return Promise.reject(new Error('Not your turn'));
    }
    return runGameAction('playCard', playerId, card);
  }, [gameState.currentPlayer, runGameAction]);

  const rematch = useCallback(() => runGameAction('rematch'), [runGameAction]);
  const isCurrentPlayer = useCallback(() => gameState.currentPlayer === gameState.currentPlayerId, [gameState.currentPlayer, gameState.currentPlayerId]);

  return {
    gameState,
    errorMessage,
    createGame,
    joinGame,
    startGame,
    placeBid,
    passBid,
    setContract,
    playCard,
    rematch,
    isCurrentPlayer
  };
};
