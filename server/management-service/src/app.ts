import express, { Express } from 'express';
import cors from 'cors';
import { logger } from "./logger/logger";
import healthRoute from "./routes/health.route";
import { authenticate } from './middleware/authenticate';
import managementRouter from './managementRouter';

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

// app.use(authenticate);
if (process.env['ENV'] === 'development') {
      logger.info(`Running in dev mode`);
}
app.use('/management', managementRouter);

export default app;