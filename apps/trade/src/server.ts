import { validateConfig } from "./config";
import { redisService } from "./services/redis.service";
import { Logger } from "./utils/logger";

async function initializeServices(): Promise<void> {
  try {
    validateConfig();
    Logger.info("🔌 Initializing Trade Service...");

    // Wait for Redis connection
    Logger.info("⏳ Waiting for Redis connection...");
    let retries = 0;
    const maxRetries = 10;
    while (!redisService.getIsConnected() && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;
    }

    if (!redisService.getIsConnected()) {
      const connected = await redisService.testConnection();
      if (!connected) {
        throw new Error("Failed to connect to Redis after retries");
      }
    }

    Logger.success("✅ Redis connected");

    // Service is ready
    Logger.success("🚀 Trade Service is ready and running");
  } catch (error) {
    Logger.error("Failed to initialize services", error);
    process.exit(1);
  }
}

// Start the service
Logger.info("🚀 Trade Service starting...");
initializeServices();

process.on("uncaughtException", (error: Error) => {
  Logger.error("Uncaught Exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  Logger.error("Unhandled Rejection", reason);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  Logger.info("SIGTERM received, shutting down...");
  await redisService.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  Logger.info("SIGINT received, shutting down...");
  await redisService.disconnect();
  process.exit(0);
});

