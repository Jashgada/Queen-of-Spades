import { useEffect, useState } from 'react';
import socket from '../services/socketService';

const RESUME_STORAGE_KEY = 'queen-of-spades:resume-session';

export const useSocket = () => {
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      setError(null);
    };
    const handleDisconnect = () => setConnected(false);
    const handleError = event => setError(event?.message || 'WebSocket connection failed');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleError);

    try {
      const session = JSON.parse(localStorage.getItem(RESUME_STORAGE_KEY) || 'null');
      if (session?.gameCode) socket.connect(session.gameCode).catch(handleError);
    } catch {
      try {
        localStorage.removeItem(RESUME_STORAGE_KEY);
      } catch {
        // Storage can be unavailable in restricted browsing contexts.
      }
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleError);
    };
  }, []);

  return { socket, connected, error };
};

export default useSocket;
