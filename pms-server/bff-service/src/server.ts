import 'dotenv/config';
import app from './app';
import { connectRedis } from './session/store';
import { logger } from './logger/logger';

const PORT = Number(process.env['PORT']) || 4000;

async function start() {
    await connectRedis();
    app.listen(PORT, () => {
        logger.info(`bff-service listening on port ${PORT}`);
    });
}

start().catch((err) => {
    logger.error({ err }, 'Failed to start bff-service');
    process.exit(1);
});
