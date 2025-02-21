import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import setRoutes from './routes';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('io', io); // Store the io instance in the app

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize routes
setRoutes(app);

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle socket events here
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});