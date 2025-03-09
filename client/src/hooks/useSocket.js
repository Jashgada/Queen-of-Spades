import { useEffect, useCallback } from 'react';
import mockSocket from '../services/mockSocket';

export const useSocket = () => {
  useEffect(() => {
    mockSocket.connect();
    return () => mockSocket.disconnect();
  }, []);

  const emit = useCallback((event, ...args) => {
    if (!mockSocket.connected) {
      console.warn('Socket not connected');
      return;
    }
    mockSocket.emit(event, ...args);
  }, []);

  const on = useCallback((event, callback) => {
    mockSocket.on(event, callback);
    return () => mockSocket.off(event, callback);
  }, []);

  return {
    connected: mockSocket.connected,
    emit,
    on,
  };
}; 