import { Express } from 'express';
import { IndexController } from '../controllers/index.js';

const setRoutes = (app: Express) => {
    app.get('/', IndexController.index);
    // Game-related operations are now handled through Socket.IO events
};

export default setRoutes;