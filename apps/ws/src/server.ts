import { config, validateConfig } from "./config";
import { orderHistoryService } from "./services/orderHistoryService";
import { RedisService } from "./services/redis.service";
import { Logger } from "./utils/logger";

const redisService = new RedisService();
let currentAddresses: Set<string> = new Set();

async function processNotSyncedAddresses(): Promise<void> {
  try {
    Logger.info("🔍 Checking for not_synced addresses...");
    const notSyncedAddresses = await redisService.getNotSyncedProfiles();

    if (notSyncedAddresses.length === 0) {
      Logger.info("No not_synced addresses found");
      return;
    }

    Logger.info(`📥 Found ${notSyncedAddresses.length} address(es) in not_synced`);

    for (const address of notSyncedAddresses) {
      try {
        // Subscribe to WebSocket
        Logger.info(`➕ Subscribing to address: ${address.substring(0, 10)}...`);
        await orderHistoryService.addWallet(address);

        // Move from not_synced to active
        await redisService.moveToActive(address);

        // Update current addresses tracking
        currentAddresses.add(address);

        Logger.success(`✅ Successfully processed address: ${address.substring(0, 10)}...`);
      } catch (error) {
        Logger.error(`❌ Failed to process address ${address.substring(0, 10)}...`, error);
      }
    }

    Logger.success(`✅ Processed ${notSyncedAddresses.length} address(es) from not_synced`);
  } catch (error) {
    Logger.error("Error processing not_synced addresses", error);
  }
}

export async function syncAddressesFromRedis(): Promise<void> {
  try {
    const activeProfiles = await redisService.getActiveProfiles();
    const newAddresses = new Set(activeProfiles);

    // Find addresses to add
    const toAdd = activeProfiles.filter((addr) => !currentAddresses.has(addr));
    // Find addresses to remove
    const toRemove = Array.from(currentAddresses).filter(
      (addr) => !newAddresses.has(addr)
    );

    // Add new addresses
    for (const address of toAdd) {
      Logger.info(`➕ Adding new address from Redis: ${address.substring(0, 10)}...`);
      await orderHistoryService.addWallet(address);
    }

    // Remove addresses that are no longer active
    for (const address of toRemove) {
      Logger.info(`➖ Removing address from Redis: ${address.substring(0, 10)}...`);
      orderHistoryService.removeWallet(address);
    }

    // Update current addresses set
    currentAddresses = newAddresses;

    if (toAdd.length > 0 || toRemove.length > 0) {
      Logger.info(
        `📊 Active profiles: ${currentAddresses.size} (added: ${toAdd.length}, removed: ${toRemove.length})`
      );
    } else {
      Logger.info(`📊 Active profiles: ${currentAddresses.size} (no changes)`);
    }
  } catch (error) {
    Logger.error("Error syncing addresses from Redis", error);
  }
}

async function initializeServices(): Promise<void> {
  try {
    validateConfig();
    Logger.info("🔌 Initializing services...");

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

    // Initial sync from Redis
    Logger.info("📥 Fetching active profiles from Redis...");
    const initialAddresses = await redisService.getActiveProfiles();
    currentAddresses = new Set(initialAddresses);

    if (initialAddresses.length > 0) {
      Logger.info(
        `🎯 Starting monitoring for ${initialAddresses.length} wallet(s) from Redis`
      );
      await orderHistoryService.startMonitoring(initialAddresses);
      Logger.success("Monitoring started successfully");
    } else {
      Logger.warn("No active profiles found in Redis. Waiting for profiles to be added...");
      // Start monitoring with empty array
      await orderHistoryService.startMonitoring([]);
    }

    // Check for any existing not_synced addresses on startup
    await processNotSyncedAddresses();

    // Subscribe to Redis channel for signals from backend
    redisService.subscribeToChannel("ws:check", (message) => {
      Logger.info(`📨 Received signal from backend: ${message}`);
      processNotSyncedAddresses().catch((error) => {
        Logger.error("Error processing not_synced addresses after signal", error);
      });
    });
  } catch (error) {
    Logger.error("Failed to initialize services", error);
    process.exit(1);
  }
}

// Start the service
Logger.info("🚀 Order History Monitor starting...");
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
  orderHistoryService.stopMonitoring();
  await redisService.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  Logger.info("SIGINT received, shutting down...");
  orderHistoryService.stopMonitoring();
  await redisService.disconnect();
  process.exit(0);
});
