import dotenv from 'dotenv';
import app from './app';
import { logger } from './logger/logger';
import { connectDB } from './config/db';

dotenv.config();
const PORT = process.env['PORT'] || 3000;

connectDB().then(() => {
    app.listen(PORT, () => {
        logger.info(`admin-service running on port ${PORT}`);
    });
});
