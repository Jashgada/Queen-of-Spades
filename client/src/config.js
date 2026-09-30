// Application configuration

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

const config = {
  apiUrl,
  
  // Game settings
  defaultTargetScore: 75,
  
  // Debug settings
  debug: {
    gameStateLogs: true
  }
};

// Log configuration in development mode
if (import.meta.env.DEV) {
  console.log('App configuration:', config);
}

export default config;
