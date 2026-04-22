import Redis from 'ioredis';
import { logger } from '../logger/logger';

const redis = new Redis({
    host: process.env['REDIS_HOST'] || 'pms-redis',
    port: Number(process.env['REDIS_PORT']) || 6379,
    lazyConnect: true,
});

redis.on('error', (err) => logger.error({ err }, 'Redis error'));
redis.on('connect', () => logger.info('Redis connected'));

export interface Session {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;   // unix ms
    email: string;
    roles: string[];
}

const SESSION_TTL_SECONDS = 3600;

export async function connectRedis(): Promise<void> {
    await redis.connect();
}

export async function setSession(sessionId: string, session: Session): Promise<void> {
    await redis.set(
        `session:${sessionId}`,
        JSON.stringify(session),
        'EX',
        SESSION_TTL_SECONDS
    );
}

export async function getSession(sessionId: string): Promise<Session | null> {
    const raw = await redis.get(`session:${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
}

export async function deleteSession(sessionId: string): Promise<void> {
    await redis.del(`session:${sessionId}`);
}

export async function refreshSession(sessionId: string, session: Session): Promise<void> {
    await setSession(sessionId, session);
}

export default redis;
