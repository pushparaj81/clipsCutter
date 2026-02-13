import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisService {
  private static instance: IORedis;

  private constructor() {}

  public static getInstance(): IORedis {
    if (!RedisService.instance) {
      RedisService.instance = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null,
      });
    }
    return RedisService.instance;
  }
}

export const redis = RedisService.getInstance();
