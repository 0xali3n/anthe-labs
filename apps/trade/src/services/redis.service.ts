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

  // Hash operations
  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client) {
      return {};
    }
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      Logger.error(`Failed to get hash ${key}`, error);
      return {};
    }
  }

  async hlen(key: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    try {
      return await this.client.hlen(key);
    } catch (error) {
      Logger.error(`Failed to get hash length ${key}`, error);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    try {
      return await this.client.smembers(key);
    } catch (error) {
      Logger.error(`Failed to get set members ${key}`, error);
      return [];
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

  /**
   * Read new entries from Redis stream
   * Uses XREAD with BLOCK to wait for new entries
   * @param streamKey - The stream key (e.g., "orders:stream")
   * @param lastId - Last processed entry ID (use "$" for new entries only, or "0" for all)
   * @param blockMs - Block time in milliseconds (0 = no blocking)
   * @returns Array of stream entries
   */
  async readStream(
    streamKey: string,
    lastId: string = "$",
    blockMs: number = 0
  ): Promise<Array<[string, string[]]>> {
    if (!this.client) {
      Logger.error("Redis client not available for stream reading");
      return [];
    }

    try {
      // XREAD BLOCK blockMs STREAMS streamKey lastId
      const result = await this.client.xread(
        "BLOCK",
        blockMs,
        "STREAMS",
        streamKey,
        lastId
      );

      if (!result || result.length === 0) {
        return [];
      }

      // Result format: [[streamKey, [[entryId, [field1, value1, field2, value2, ...]], ...]]]
      const [, entries] = result[0];
      return entries as Array<[string, string[]]>;
    } catch (error) {
      Logger.error(`Failed to read from stream ${streamKey}`, error);
      return [];
    }
  }

  /**
   * Get the last entry ID from a stream
   * @param streamKey - The stream key
   * @returns Last entry ID or null if stream is empty
   */
  async getLastStreamId(streamKey: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      // XREVRANGE streamKey + - COUNT 1 (get last entry)
      const result = await this.client.xrevrange(streamKey, "+", "-", "COUNT", 1);
      if (result && result.length > 0) {
        return result[0][0] as string; // Return entry ID
      }
      return null;
    } catch (error) {
      Logger.error(`Failed to get last stream ID from ${streamKey}`, error);
      return null;
    }
  }

  /**
   * Delete entry from Redis stream
   * @param streamKey - The stream key
   * @param entryId - The entry ID to delete
   * @returns Number of entries deleted (0 or 1)
   */
  async deleteStreamEntry(streamKey: string, entryId: string): Promise<number> {
    if (!this.client) {
      Logger.error("Redis client not available for stream deletion");
      return 0;
    }

    try {
      // XDEL streamKey entryId
      const result = await this.client.xdel(streamKey, entryId);
      return result;
    } catch (error) {
      Logger.error(`Failed to delete entry ${entryId} from stream ${streamKey}`, error);
      return 0;
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

