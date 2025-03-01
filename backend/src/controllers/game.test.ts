import { GameController } from './game';
import { Request, Response } from 'express';

jest.mock('socket.io');

const mockSocketInstance = {
    join: jest.fn(),
    emit: jest.fn()
};

const mockRooms = new Map();

const mockServer = {
    of: jest.fn().mockReturnValue({
        adapter: {
            rooms: mockRooms
        }
    }),
    sockets: {
        sockets: {
            get: jest.fn().mockReturnValue(mockSocketInstance)
        }
    }
};

const mockRequest = <P>(body: P) => ({
    body,
    app: {
        get: jest.fn().mockReturnValue(mockServer)
    }
} as unknown as Request<P>);

const mockResponse = () => {
    const res = {} as Response;
    res.json = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    return res;
};

describe('GameController', () => {
    let req: Request<{ gameCode: string; socketId: string }>;
    let res: Response;

    beforeEach(() => {
        req = mockRequest<{ gameCode: string; socketId: string }>({ gameCode: 'testGameCode', socketId: 'testSocketId' });
        res = mockResponse();
        mockRooms.clear();
        jest.clearAllMocks();
    });

    test('createGame should create a new game and return game code and admin', () => {
        GameController.createGame(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            gameCode: expect.any(String),
            admin: 'testSocketId'
        }));
    });

    test('joinGame should join an existing game and return a success message', () => {
        req.body = { gameCode: 'testGameCode', socketId: 'testSocketId' };
        mockRooms.set('testGameCode', new Set(['anotherSocketId']));

        GameController.joinGame(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Joined game',
            gameCode: 'testGameCode',
            user: 'testSocketId'
        }));
    });

    test('joinGame should return 404 if the room does not exist', () => {
        req = mockRequest<{ gameCode: string; socketId: string }>({ gameCode: 'nonExistentGameCode', socketId: 'testSocketId' });

        GameController.joinGame(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Room not found' });
    });
}); 