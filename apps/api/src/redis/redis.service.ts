import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private useMock = false;
  private mockStorage = new Map<string, string>();
  private mockSets = new Map<string, Set<string>>();

  constructor() {
    this.useMock = process.env.USE_MOCK_REDIS === 'true';

    if (this.useMock) {
      this.logger.warn('⚠️  USING MOCK REDIS SERVICE - DATA WILL BE LOST ON RESTART ⚠️');
      return;
    }

    // Create Redis client connection
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Handle connection events
    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis client error:', error);
    });

    this.client.on('close', () => {
      this.logger.warn('Redis client connection closed');
    });
  }

  async onModuleInit() {
    if (this.useMock) return;
    try {
      // Test connection with a ping
      const result = await this.client.ping();
      this.logger.log(`Redis connection test: ${result}`);
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
    }
  }

  async onModuleDestroy() {
    if (this.useMock) return;
    await this.client.quit();
    this.logger.log('Redis client disconnected');
  }

  // Get Redis client instance
  getClient(): Redis {
    if (this.useMock) {
      throw new Error('Cannot get raw Redis client in mock mode');
    }
    return this.client;
  }

  // Basic operations - we'll add more as needed
  async get(key: string): Promise<string | null> {
    if (this.useMock) {
      return this.mockStorage.get(key) || null;
    }
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (this.useMock) {
      this.mockStorage.set(key, value);
      if (ttl) {
        setTimeout(() => this.mockStorage.delete(key), ttl * 1000);
      }
      return 'OK';
    }
    if (ttl) {
      return await this.client.setex(key, ttl, value);
    }
    return await this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    if (this.useMock) {
      const existed = this.mockStorage.delete(key);
      return existed ? 1 : 0;
    }
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    if (this.useMock) {
      return this.mockStorage.has(key) ? 1 : 0;
    }
    return await this.client.exists(key);
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (this.useMock) {
      let set = this.mockSets.get(key);
      if (!set) {
        set = new Set();
        this.mockSets.set(key, set);
      }

      let added = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          added++;
        }
      }
      return added;
    }
    return await this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (this.useMock) {
      const set = this.mockSets.get(key);
      if (!set) return 0;
      let removed = 0;
      for (const member of members) {
        if (set.has(member)) {
          set.delete(member);
          removed++;
        }
      }
      return removed;
    }
    return await this.client.srem(key, ...members);
  }

  async scard(key: string): Promise<number> {
    if (this.useMock) {
      const set = this.mockSets.get(key);
      return set ? set.size : 0;
    }
    return await this.client.scard(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.client.hdel(key, ...fields);
  }

  async hlen(key: string): Promise<number> {
    return await this.client.hlen(key);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  async hexists(key: string, field: string): Promise<boolean> {
    const result = await this.client.hexists(key, field);
    return result === 1;
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message);
  }
}
