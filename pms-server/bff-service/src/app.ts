import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.route';
import { proxyRouter } from './routes/proxy.route';

const app: Express = express();

app.enable('trust proxy');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// All BFF routes live under /bff
app.use('/bff', authRouter);
app.use('/bff', proxyRouter);

export default app;
