import Redis from "ioredis";
import { Logger } from "../utils/logger";

export class RedisService {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on("connect", () => {
        Logger.info("🔌 Redis client connected");
        this.isConnected = true;
      });

      this.client.on("ready", () => {
        Logger.success("✅ Redis client ready");
        this.isConnected = true;
      });

      this.client.on("error", (error) => {
        Logger.error("Redis client error", error);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        Logger.warn("Redis client connection closed");
        this.isConnected = false;
      });
    } catch (error) {
      Logger.error("Failed to create Redis client", error);
      this.isConnected = false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      Logger.error("Redis ping failed", error);
      return false;
    }
  }

  async getActiveProfiles(): Promise<string[]> {
    if (!this.client || !this.isConnected) {
      Logger.warn("Redis not connected, returning empty array");
      return [];
    }

    try {
      const profiles = await this.client.smembers("profiles:active");
      return profiles.filter((addr) => addr && addr.trim().length > 0);
    } catch (error) {
      Logger.error("Failed to get active profiles from Redis", error);
      return [];
    }
  }

  async getNotSyncedProfiles(): Promise<string[]> {
    if (!this.client || !this.isConnected) {
      Logger.warn("Redis not connected, returning empty array");
      return [];
    }

    try {
      const profiles = await this.client.smembers("profiles:not_synced");
      return profiles.filter((addr) => addr && addr.trim().length > 0);
    } catch (error) {
      Logger.error("Failed to get not_synced profiles from Redis", error);
      return [];
    }
  }

  async moveToActive(address: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      Logger.warn("Redis not connected, cannot move address to active");
      return;
    }

    try {
      // Remove from not_synced and add to active atomically
      await this.client.multi()
        .srem("profiles:not_synced", address)
        .sadd("profiles:active", address)
        .exec();
      Logger.info(`✅ Moved address ${address.substring(0, 10)}... from not_synced to active`);
    } catch (error) {
      Logger.error("Failed to move address to active", error);
    }
  }

  subscribeToChannel(channel: string, callback: (message: string) => void): void {
    if (!this.client) {
      Logger.error("Redis client not available for subscription");
      return;
    }

    // Create a separate connection for pub/sub
    this.subscriber = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subscriber.on("message", (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });

    this.subscriber.on("error", (error) => {
      Logger.error("Redis subscriber error", error);
    });

    this.subscriber.subscribe(channel, (err) => {
      if (err) {
        Logger.error(`Failed to subscribe to channel ${channel}`, err);
      } else {
        Logger.success(`📡 Subscribed to Redis channel: ${channel}`);
      }
    });
  }

  getClient(): Redis | null {
    return this.client;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      Logger.info("Redis client disconnected");
    }
  }
}

