import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Connection configuration for BullMQ
export const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    // MaxRetriesPerRequest is required for BullMQ
    maxRetriesPerRequest: null,
};

// Create a singleton Redis instance for general use
const globalForRedis = global as unknown as { redis: Redis };

export const redis = globalForRedis.redis || new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
});

// Logging Redis connection status
redis.on('connect', () => console.log('--- Redis: Connecting... ---'));
redis.on('ready', () => console.log('--- Redis: Ready and Connected! ---'));
redis.on('error', (err) => console.error('--- Redis: Connection Error! ---', err));

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
