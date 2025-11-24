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

  getClient(): Redis | null {
    return this.client;
  }

  getIsConnected(): boolean {
    return this.isConnected;
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

