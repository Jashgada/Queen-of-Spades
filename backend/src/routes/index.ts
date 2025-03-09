
import { Express } from 'express';
import { IndexController } from '../controllers/index.js';
import { GameController } from '../controllers/game.js';

const setRoutes = (app: Express) => {
    app.get('/', IndexController.index);
    app.post('/create-game', GameController.createGame);
    app.post('/join-game', GameController.joinGame);
    app.get('/players/:gameCode', GameController.getAllPlayersInRoom);
};

export default setRoutes;