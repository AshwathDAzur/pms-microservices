import pino from 'pino';

export const logger = pino({
    level: process.env['LOG_LEVEL'] || 'info',
    transport: process.env['ENV'] !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
});
