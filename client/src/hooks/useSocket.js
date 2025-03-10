import { useEffect, useState, useCallback, useRef } from 'react';
import socket from '../services/socketService';

export const useSocket = () => {
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState(null);
  
  // Use a ref to avoid re-renders when not needed
  const socketRef = useRef(socket);

  // Connect to socket on component mount, disconnect on unmount
  useEffect(() => {
    const currentSocket = socketRef.current;
    
    console.log('[useSocket] Setting up socket connection');
    
    // Connect if not connected
    if (!currentSocket.connected) {
      console.log('[useSocket] Connecting to socket server');
      currentSocket.connect();
    }
    
    // Update state based on connection events
    const handleConnect = () => {
      console.log('[useSocket] Socket connected');
      setConnected(true);
      setError(null);
    };
    
    const handleDisconnect = (reason) => {
      console.log(`[useSocket] Socket disconnected: ${reason}`);
      setConnected(false);
    };
    
    const handleError = (err) => {
      console.error(`[useSocket] Socket error: ${err.message}`);
      setError(err.message);
    };
    
    // Register event handlers
    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    currentSocket.on('connect_error', handleError);
    
    // Set initial connected state
    setConnected(currentSocket.connected);
    
    // Clean up on unmount
    return () => {
      console.log('[useSocket] Cleaning up socket listeners');
      currentSocket.off('connect', handleConnect);
      currentSocket.off('disconnect', handleDisconnect);
      currentSocket.off('connect_error', handleError);
      // Note: We don't disconnect the socket on unmount to allow for background operations
    };
  }, []);
  
  // Emit method - exactly like in test.html
  const emit = useCallback((event, data, callback) => {
    console.log(`[useSocket] Emitting ${event}`, data);
    
    // Just like in test.html, if callback is provided, pass it directly
    if (callback && typeof callback === 'function') {
      socketRef.current.emit(event, data, callback);
    } else {
      socketRef.current.emit(event, data);
    }
  }, []);
  
  // Listen for events
  const on = useCallback((event, callback) => {
    console.log(`[useSocket] Adding listener for ${event}`);
    socketRef.current.on(event, callback);
    
    // Return a cleanup function
    return () => {
      console.log(`[useSocket] Removing listener for ${event}`);
      socketRef.current.off(event, callback);
    };
  }, []);
  
  // Remove event listener
  const off = useCallback((event, callback) => {
    console.log(`[useSocket] Removing listener for ${event}`);
    socketRef.current.off(event, callback);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    error,
    emit,
    on,
    off
  };
};

export default useSocket; 