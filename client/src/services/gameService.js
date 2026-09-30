import config from '../config';
import socket from './socketService';

const reportFailure = (callback, error) => {
  callback?.({
    success: false,
    code: 'CONNECTION_FAILED',
    message: error?.message || 'Could not reach the game server'
  });
};

const connectAndSend = (gameCode, type, payload, callback) => {
  socket.connect(gameCode)
    .then(() => socket.emit(type, payload, callback))
    .catch(error => reportFailure(callback, error));
};

export const gameService = {
  createGame: async (playerName, callback) => {
    try {
      const allocation = await fetch(`${config.apiUrl}/api/rooms`, { method: 'POST' });
      const result = await allocation.json();
      if (!allocation.ok || !result.success) throw new Error(result.message || 'Could not allocate a room');
      connectAndSend(result.gameCode, 'game.create', { playerName }, callback);
    } catch (error) {
      reportFailure(callback, error);
    }
  },

  joinGame: (gameCode, playerName, callback) => {
    connectAndSend(gameCode, 'game.join', { playerName }, callback);
  },

  resumeGame: (session, callback) => {
    connectAndSend(session.gameCode, 'game.resume', {
      playerId: session.playerId,
      resumeToken: session.resumeToken
    }, callback);
  },

  leaveGame: callback => {
    if (!socket.connected) {
      socket.disconnect();
      callback?.({ success: true });
      return;
    }
    socket.emit('game.leave', {}, response => {
      socket.disconnect();
      callback?.(response);
    });
  },

  startGame: callback => socket.emit('game.start', {}, callback),
  placeBid: (amount, callback) => socket.emit('game.bid', { amount }, callback),
  passBid: callback => socket.emit('game.pass', {}, callback),
  setContract: (partnerCalls, cutSuit, callback) => socket.emit('game.setContract', { partnerCalls, cutSuit }, callback),
  playCard: (_playerId, card, callback) => socket.emit('game.playCard', { card }, callback),
  rematch: callback => socket.emit('game.nextDeal', {}, callback)
};

export default gameService;
