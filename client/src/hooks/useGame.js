import { useState, useEffect, useCallback, useRef } from 'react';
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
const RESUME_STORAGE_KEY = 'queen-of-spades:resume-session';

const clearResumeSession = () => {
  try {
    localStorage.removeItem(RESUME_STORAGE_KEY);
  } catch {
    // Ignore browsers that block local storage access.
  }
};

const saveResumeSession = (response) => {
  if (!response?.gameCode || !response?.player?.id || !response?.player?.resumeToken) return;
  try {
    localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify({
      gameCode: response.gameCode,
      playerId: response.player.id,
      resumeToken: response.player.resumeToken
    }));
  } catch {
    // The live game can still proceed if browser storage is unavailable.
  }
};

const mergePublicGameState = (previous, publicState) => ({
  ...previous,
  ...publicState,
  gameCode: publicState.code || publicState.gameCode || previous.gameCode,
  hostId: publicState.players?.[0]?.id || previous.hostId,
  gameStatus: publicState.status || previous.gameStatus
});

export const useGame = () => {
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState(null);
  const { socket, connected } = useSocket();
  const lastResumeSocketId = useRef(null);

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

    const handlePlayerLeft = (data) => {
      if (data?.gameState) {
        applyState({ success: true, gameState: data.gameState });
      } else if (data?.players) {
        setGameState(previous => ({
          ...previous,
          players: data.players,
          hostId: data.players[0]?.id || null,
          gameStatus: data.players.length === 0 ? 'waiting' : previous.gameStatus
        }));
      }
    };

    socket.on('game:playerJoined', handlePlayerJoined);
    socket.on('game:started', applyState);
    socket.on('game:biddingUpdated', applyState);
    socket.on('game:contractSet', applyState);
    socket.on('game:restarted', applyState);
    socket.on('game:resumed', applyState);
    socket.on('game:playerDisconnected', applyState);
    socket.on('game:playerReconnected', applyState);
    socket.on('game:playerLeft', handlePlayerLeft);
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
      socket.off('game:resumed', applyState);
      socket.off('game:playerDisconnected', applyState);
      socket.off('game:playerReconnected', applyState);
      socket.off('game:playerLeft', handlePlayerLeft);
      socket.off('game:cardPlayed', handleCardPlayed);
      socket.off('game:roundComplete', handleRoundComplete);
      socket.off('game:over', handleGameOver);
      socket.off('game:error', handleError);
      socket.off('game:playerState', handlePlayerState);
    };
  }, [connected, socket]);

  useEffect(() => {
    if (!connected || !socket.id || lastResumeSocketId.current === socket.id) return;
    lastResumeSocketId.current = socket.id;

    let session;
    try {
      session = JSON.parse(localStorage.getItem(RESUME_STORAGE_KEY) || 'null');
    } catch {
      clearResumeSession();
      return;
    }
    if (!session?.gameCode || !session?.playerId || !session?.resumeToken) return;

    gameService.resumeGame(session, response => {
      if (!response?.success) {
        clearResumeSession();
        setGameState(INITIAL_STATE);
        setErrorMessage(response?.message || 'Could not restore the saved game');
        return;
      }

      setGameState(previous => ({
        ...mergePublicGameState(previous, response.gameState),
        hand: response.hand || [],
        currentPlayerId: response.playerId,
        hostId: response.gameState.players?.[0]?.id || previous.hostId
      }));
      setErrorMessage(null);
    });
  }, [connected, socket]);

  const createGame = useCallback((playerName) => {
    setErrorMessage(null);
    return new Promise((resolve, reject) => {
      gameService.createGame(playerName, response => {
        if (response?.success) {
          saveResumeSession(response);
          const player = {
            id: response.player.id,
            name: response.player.name,
            handSize: response.player.handSize,
            connected: true
          };
          setGameState(() => ({
            ...INITIAL_STATE,
            gameCode: response.gameCode,
            currentPlayerId: player.id,
            hostId: player.id,
            players: [player]
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
          saveResumeSession(response);
          const player = {
            id: response.player.id,
            name: response.player.name,
            handSize: response.player.handSize,
            connected: true
          };
          setGameState(previous => ({
            ...INITIAL_STATE,
            gameCode: response.gameCode,
            currentPlayerId: player.id,
            hostId: response.hostId || previous.hostId,
            players: response.players || [player]
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
  const leaveGame = useCallback(() => {
    clearResumeSession();
    return runGameAction('leaveGame').finally(() => setGameState(INITIAL_STATE));
  }, [runGameAction]);
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
    leaveGame,
    isCurrentPlayer
  };
};
