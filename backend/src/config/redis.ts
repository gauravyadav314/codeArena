import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('[Redis] Connection max retries exceeded, disabling Redis queue/cache fallback.');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      logger.info(`[Redis] Connected successfully to ${env.REDIS_URL}`);
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      logger.warn(`[Redis] Connection warning: ${err.message}. Using in-memory fallback.`);
    });

    redisClient.connect().catch((err) => {
      isRedisAvailable = false;
      logger.warn(`[Redis] Initial connection error: ${err.message}. Standalone in-memory mode active.`);
    });

    return redisClient;
  } catch (error: any) {
    logger.warn(`[Redis] Failed to initialize Redis client: ${error?.message}`);
    return null;
  }
}

export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient?.status === 'ready';
}
