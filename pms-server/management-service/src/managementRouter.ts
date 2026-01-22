import express from 'express';
import controller from './managementController';

const managementRouter = express.Router();

managementRouter
    .route('/')
    .get(controller.getUser)
    .all((req, res, next) => {
        next();
    });



export default managementRouter;
