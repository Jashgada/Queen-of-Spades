import { io } from 'socket.io-client';

// Create a socket connection to the backend
const socket = io('http://localhost:3000', {
  autoConnect: false, // We'll connect manually
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Debug logging
const DEBUG = true;

// Log all events when in debug mode
if (DEBUG) {
  socket.onAny((event, ...args) => {
    console.log(`[SOCKET] Received event: ${event}`, args);
  });

  // Also log outgoing events by monkey-patching emit
  const originalEmit = socket.emit;
  socket.emit = function(event, ...args) {
    console.log(`[SOCKET] Emitting event: ${event}`, args);
    return originalEmit.apply(this, [event, ...args]);
  };
}

// Connection management
socket.on('connect', () => {
  console.log(`[SOCKET] Connected with ID: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
  console.log(`[SOCKET] Disconnected. Reason: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.error(`[SOCKET] Connection error: ${error.message}`);
});

// Export the socket instance
export default socket; 