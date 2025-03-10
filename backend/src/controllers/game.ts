import { Request, Response } from 'express';

// This controller is no longer used for game operations
// All game operations are now handled through Socket.IO events
export class GameController {
    // Kept for reference, but not used
    static async getAllPlayersInRoom(req: Request, res: Response) {
        res.status(501).json({ 
            error: 'This endpoint is deprecated. Use Socket.IO events instead.' 
        });
    }
}