import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { Server } from 'socket.io';

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
            socket.data = { isAdmin: true };
        }

        res.json({ gameCode, admin: socketId });
    }
}