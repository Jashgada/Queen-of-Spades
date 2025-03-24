import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import setRoutes from './routes';
import { setupSocketHandlers } from './controllers/socket';

// CORS Configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const corsOrigins = isDevelopment 
    ? 'http://localhost:5173'
    : process.env.FRONTEND_URL || '';

console.log('CORS Origins:', corsOrigins);
console.log('Environment:', process.env.NODE_ENV);

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with proper CORS and transport options
const io = new Server(server, {
    cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'], // Enable both WebSocket and polling
    allowEIO3: true, // Enable Engine.IO v3 compatibility
    path: '/socket.io/' // Explicitly set the Socket.IO path
});

app.set('io', io);

// Enable CORS for Express routes
app.use(cors({
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize routes (only basic routes, game operations are handled through Socket.IO)
setRoutes(app);

// Initialize Socket.IO handlers for all game operations
setupSocketHandlers(io);

// Global error handler for Express routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error in Express request:', err);
    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Process-level exception handling
process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down gracefully...', error);
    // Log to external monitoring service in production
    
    // Close server gracefully
    server.close(() => {
        console.log('Server closed');
        process.exit(1);
    });
    
    // If server doesn't close in 1 second, force shutdown
    setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
    }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: Error) => {
    console.error('UNHANDLED REJECTION! 💥', error.name, error.message);
    console.error(error.stack);
    // Log to external monitoring service in production
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});