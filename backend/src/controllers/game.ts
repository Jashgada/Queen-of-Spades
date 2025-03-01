import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';

export class GameController {
    static createGame(req: Request, res: Response) {
        const io: Server = req.app.get('io');
        const gameCode = nanoid(6);
        const socketId = req.body.socketId;

        // Create a new Socket.IO room
        io.of('/').adapter.rooms.set(gameCode, new Set([socketId]));

        // Make the creator the admin of the room
        io.sockets.sockets.get(socketId)?.join(gameCode);
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            socket.emit('admin', true);
        }

        res.json({ gameCode, admin: socketId });
    }

    static joinGame(req: Request<{ gameCode: string; socketId: string }>, res: Response) {
        const io: Server = req.app.get('io');
        const { gameCode, socketId } = req.body;

        // Check if the room exists
        const room = io.of('/').adapter.rooms.get(gameCode);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Add the user to the room
        io.sockets.sockets.get(socketId)?.join(gameCode);

        res.json({ message: 'Joined game', gameCode, user: socketId });
    }
}