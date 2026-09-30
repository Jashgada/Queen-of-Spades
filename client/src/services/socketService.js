import config from '../config';

const PROTOCOL_VERSION = 1;
const listeners = new Map();
const pendingRequests = new Map();
let webSocket = null;
let roomCode = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let connectionId = null;
let connectPromise = null;
let manuallyClosed = false;

const notify = (event, payload) => {
  listeners.get(event)?.forEach(listener => listener(payload));
};

const rejectPendingRequests = (message) => {
  pendingRequests.forEach(({ callback }) => {
    callback?.({ success: false, code: 'CONNECTION_LOST', message });
  });
  pendingRequests.clear();
};

const makeSocketUrl = code => {
  const base = new URL(config.apiUrl);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = `/ws/${encodeURIComponent(code)}`;
  base.search = '';
  base.hash = '';
  return base.toString();
};

const openConnection = code => {
  const normalizedCode = code.toUpperCase();
  if (webSocket?.readyState === WebSocket.OPEN && roomCode === normalizedCode) {
    return Promise.resolve(webSocket);
  }
  if (connectPromise && roomCode === normalizedCode) {
    return connectPromise;
  }

  if (webSocket) closeConnection(false);
  manuallyClosed = false;
  roomCode = normalizedCode;

  const current = new WebSocket(makeSocketUrl(roomCode), ['qos.v1']);
  webSocket = current;
  let settled = false;
  let resolveConnect;
  let rejectConnect;
  const promise = new Promise((resolve, reject) => {
    resolveConnect = resolve;
    rejectConnect = reject;
  });
  connectPromise = promise;

  current.addEventListener('open', () => {
    if (webSocket !== current) return;
    connectionId = crypto.randomUUID();
    reconnectAttempts = 0;
    settled = true;
    connectPromise = null;
    notify('connect');
    resolveConnect(current);
  }, { once: true });

  current.addEventListener('message', event => {
    if (webSocket !== current) return;
    receiveMessage(event.data);
  });

  current.addEventListener('error', () => {
    if (!settled) {
      settled = true;
      connectPromise = null;
      rejectConnect(new Error('Could not connect to the game server'));
    }
    notify('connect_error', new Error('WebSocket connection failed'));
  });

  current.addEventListener('close', event => {
    if (webSocket !== current) return;
    webSocket = null;
    connectionId = null;
    connectPromise = null;
    rejectPendingRequests('Connection to the game server was lost');
    if (!settled) {
      settled = true;
      rejectConnect(new Error(event.reason || 'Could not connect to the game server'));
    }
    notify('disconnect', event.reason || 'Connection closed');
    scheduleReconnect();
  });

  return promise;
};

function receiveMessage(raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    notify('protocol.error', { code: 'INVALID_MESSAGE', message: 'Server sent invalid JSON' });
    return;
  }

  if (message?.v !== PROTOCOL_VERSION) {
    notify('protocol.error', { code: 'UNSUPPORTED_VERSION', message: 'Server protocol version is unsupported' });
    return;
  }
  if (message.type === 'response') {
    const pending = pendingRequests.get(message.requestId);
    if (!pending) return;
    pendingRequests.delete(message.requestId);
    if (message.ok) {
      pending.callback?.({ success: true, ...(message.payload || {}) });
    } else {
      pending.callback?.({
        success: false,
        message: message.error?.message || 'Game request failed',
        code: message.error?.code
      });
    }
    return;
  }
  if (message.type === 'event' && typeof message.event === 'string') {
    notify(message.event, message.payload);
  }
}

function scheduleReconnect() {
  if (manuallyClosed || !roomCode || reconnectTimer) return;
  if (reconnectAttempts >= 5) {
    notify('reconnect_failed');
    return;
  }
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    openConnection(roomCode).catch(() => scheduleReconnect());
  }, Math.min(1000 * (2 ** (reconnectAttempts - 1)), 10_000));
}

function closeConnection(clearRoom = true) {
  manuallyClosed = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (clearRoom) roomCode = null;
  const current = webSocket;
  webSocket = null;
  connectionId = null;
  connectPromise = null;
  if (current && current.readyState < WebSocket.CLOSING) current.close(1000, 'Client disconnected');
  rejectPendingRequests('Connection closed');
  notify('disconnect', 'Client disconnected');
}

const socket = {
  get connected() {
    return webSocket?.readyState === WebSocket.OPEN;
  },
  get id() {
    return connectionId;
  },
  get roomCode() {
    return roomCode;
  },
  connect: openConnection,
  disconnect: () => closeConnection(true),
  emit(type, payload = {}, callback) {
    if (!socket.connected) {
      callback?.({ success: false, code: 'NOT_CONNECTED', message: 'Not connected to a game room' });
      return;
    }
    const requestId = crypto.randomUUID();
    pendingRequests.set(requestId, { callback });
    webSocket.send(JSON.stringify({
      v: PROTOCOL_VERSION,
      type,
      requestId,
      payload: payload || {}
    }));
  },
  on(event, listener) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(listener);
    return socket;
  },
  off(event, listener) {
    listeners.get(event)?.delete(listener);
    return socket;
  }
};

export default socket;
