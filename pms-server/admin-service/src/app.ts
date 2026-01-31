import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { logger } from "./logger/logger";
import healthRoute from "./routes/health.route";
import { authenticate } from './middleware/authenticate';
import adminRouter from './adminRouter';

const app: Express = express();

app.enable('trust proxy');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: '*',
        credentials: true,
    })
);

app.use("/health", healthRoute);

app.use(authenticate);
if (process.env['ENV'] === 'development') {
      logger.info(`Running in dev mode`);
}
app.use('/admin', adminRouter);

export default app;