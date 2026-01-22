import express from 'express';
import controller from './adminController';

const adminRouter = express.Router();

adminRouter
    .route('/')
    .get(controller.getUser)
    .all((req, res, next) => {
        next();
    });



export default adminRouter;
