// Application configuration

// Determine the backend URL based on environment
const getBackendUrl = () => {
  // For production, use the environment variable if available
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For local development, use localhost
  return 'http://localhost:3000';
};

const config = {
  // Backend API URL
  apiUrl: getBackendUrl(),
  
  // Game settings
  defaultTargetScore: 75,
  
  // Socket.IO settings
  socket: {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    // Additional socket options
    pingInterval: 10000,
    pingTimeout: 5000,
    autoConnect: false,
    forceNew: false,
    transports: ['websocket', 'polling'] // Try WebSocket first, fall back to polling
  },
  
  // Debug settings
  debug: {
    socketLogs: true,
    gameStateLogs: true
  }
};

// Log configuration in development mode
if (import.meta.env.DEV) {
  console.log('App configuration:', config);
}

export default config; 