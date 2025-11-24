import Redis from "ioredis";
import { Logger } from "../utils/logger";
import { config } from "../config";

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
        host: config.redisHost,
        port: config.redisPort,
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
      const connected = result === "PONG";
      this.isConnected = connected;
      return connected;
    } catch (error) {
      Logger.error("Redis ping failed", error);
      this.isConnected = false;
      return false;
    }
  }

  async getActiveProfiles(): Promise<string[]> {
    if (!this.client) {
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
    if (!this.client) {
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
    if (!this.client) {
      throw new Error("Redis client not available");
    }

    try {
      // Remove from not_synced and add to active atomically
      const results = await this.client
        .multi()
        .srem("profiles:not_synced", address)
        .sadd("profiles:active", address)
        .exec();

      // Check if transaction succeeded
      if (!results || results.some((result) => result[0] !== null)) {
        throw new Error("Redis transaction failed");
      }

      Logger.info(
        `✅ Moved address ${address.substring(0, 10)}... from not_synced to active`
      );
    } catch (error) {
      Logger.error("Failed to move address to active", error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  subscribeToChannel(
    channel: string,
    callback: (message: string) => void
  ): void {
    if (!this.client) {
      Logger.error("Redis client not available for subscription");
      return;
    }

    // Create a separate connection for pub/sub
    this.subscriber = new Redis({
      host: config.redisHost,
      port: config.redisPort,
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

  // Stream operations for storing orders
  async transactionVersionExists(transactionVersion: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Read recent entries from the stream (last 100 entries should be enough)
      // Using XREVRANGE to get the most recent entries first
      const entries = await this.client.xrevrange("orders:stream", "+", "-", "COUNT", 100);

      // Check if any entry has the same transaction_version
      for (const entry of entries) {
        const [, fields] = entry;
        // fields is an array of [key1, value1, key2, value2, ...]
        for (let i = 0; i < fields.length; i += 2) {
          if (
            fields[i] === "transaction_version" &&
            fields[i + 1] === transactionVersion
          ) {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      Logger.error(
        "Failed to check transaction_version in Redis stream",
        error
      );
      return false;
    }
  }

  async addOrderToStream(
    orderData: Record<string, string>
  ): Promise<string | null> {
    if (!this.client) {
      Logger.error("Redis client not available, cannot add order to stream");
      return null;
    }

    try {
      // Use XADD to add order to stream
      // Stream key: orders:stream
      // Auto-generate ID with * (Redis generates timestamp-based ID)
      const streamId = await this.client.xadd(
        "orders:stream",
        "*", // Auto-generate ID
        ...Object.entries(orderData).flat() // Flatten object to [key1, value1, key2, value2, ...]
      );
      return streamId as string;
    } catch (error) {
      Logger.error("Failed to add order to Redis stream", error);
      return null;
    }
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

// Export singleton instance
export const redisService = new RedisService();
