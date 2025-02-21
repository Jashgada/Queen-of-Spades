// filepath: /Users/jashgada/Documents/Personal Web/Queen of Spades/backend/src/controllers/index.ts
import { Request, Response } from 'express';

export class IndexController {
    static index(req: Request, res: Response) {
        res.send('Welcome to Queen of Spades API');
    }
}