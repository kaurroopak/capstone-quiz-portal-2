import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6389';
let redisClient: RedisClientType | null = null;
let isRedisConnected = false;

export const connectRedis = async () => {
  try {
    redisClient = createClient({ url: redisUrl }) as RedisClientType;
    redisClient.on('error', (err) => {
      console.warn('[Redis] Connection error (Redis is optional):', err.message);
      isRedisConnected = false;
    });
    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully.');
      isRedisConnected = true;
    });
    await redisClient.connect();
    isRedisConnected = true;
  } catch (err: any) {
    console.warn('[Redis] Could not connect — quiz auto-save will use in-memory fallback:', err.message);
    redisClient = null;
    isRedisConnected = false;
  }
};

// In-memory fallback store when Redis is unavailable
const memoryStore: Record<string, string> = {};

export const saveQuizProgress = async (attemptId: string, progress: any): Promise<void> => {
  const key = `quiz_attempt:${attemptId}`;
  const value = JSON.stringify(progress);
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.setEx(key, 12 * 60 * 60, value); // 12h expiry
      return;
    } catch { /* fallback below */ }
  }
  memoryStore[key] = value;
};

export const getQuizProgress = async (attemptId: string): Promise<any | null> => {
  const key = `quiz_attempt:${attemptId}`;
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch { /* fallback below */ }
  }
  return memoryStore[key] ? JSON.parse(memoryStore[key]) : null;
};

export const deleteQuizProgress = async (attemptId: string): Promise<void> => {
  const key = `quiz_attempt:${attemptId}`;
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch { /* fallback below */ }
  }
  delete memoryStore[key];
};

export default redisClient;
