import { validateConfig } from "./config";
import { orderHistoryService } from "./services/orderHistoryService";
import { redisService } from "./services/redis.service";
import { Logger } from "./utils/logger";
let currentAddresses: Set<string> = new Set();
let isProcessingNotSynced = false;
let signalDebounceTimer: NodeJS.Timeout | null = null;

async function processNotSyncedAddresses(): Promise<void> {
  // Prevent concurrent processing
  if (isProcessingNotSynced) {
    Logger.debug("Already processing not_synced addresses, skipping...");
    return;
  }

  isProcessingNotSynced = true;

  try {
    Logger.info("🔍 Checking for not_synced addresses...");
    const notSyncedAddresses = await redisService.getNotSyncedProfiles();

    if (notSyncedAddresses.length === 0) {
      Logger.info("No not_synced addresses found");
      return;
    }

    Logger.info(
      `📥 Found ${notSyncedAddresses.length} address(es) in not_synced`
    );

    // Process addresses in parallel for better performance
    const processPromises = notSyncedAddresses.map(async (address) => {
      try {
        // Subscribe to WebSocket first
        Logger.info(
          `➕ Subscribing to address: ${address.substring(0, 10)}...`
        );
        await orderHistoryService.addWallet(address);

        // Only move to active if subscription succeeded
        await redisService.moveToActive(address);

        // Update current addresses tracking
        currentAddresses.add(address);

        Logger.success(
          `✅ Successfully processed address: ${address.substring(0, 10)}...`
        );
        return { address, success: true };
      } catch (error) {
        Logger.error(
          `❌ Failed to process address ${address.substring(0, 10)}...`,
          error
        );
        return { address, success: false, error };
      }
    });

    const results = await Promise.all(processPromises);
    const successful = results.filter((r) => r.success).length;

    Logger.success(
      `✅ Processed ${successful}/${notSyncedAddresses.length} address(es) from not_synced`
    );
  } catch (error) {
    Logger.error("Error processing not_synced addresses", error);
  } finally {
    isProcessingNotSynced = false;
  }
}

function debouncedProcessNotSynced(): void {
  // Clear existing timer
  if (signalDebounceTimer) {
    clearTimeout(signalDebounceTimer);
  }

  // Debounce: wait 100ms before processing to batch multiple signals
  signalDebounceTimer = setTimeout(() => {
    processNotSyncedAddresses().catch((error) => {
      Logger.error("Error processing not_synced addresses after signal", error);
    });
    signalDebounceTimer = null;
  }, 100);
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
      Logger.warn(
        "No active profiles found in Redis. Waiting for profiles to be added..."
      );
      // Start monitoring with empty array
      await orderHistoryService.startMonitoring([]);
    }

    // Check for any existing not_synced addresses on startup
    await processNotSyncedAddresses();

    // Subscribe to Redis channel for signals from backend
    redisService.subscribeToChannel("ws:check", (message) => {
      Logger.info(`📨 Received signal from backend: ${message}`);
      debouncedProcessNotSynced();
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
  if (signalDebounceTimer) {
    clearTimeout(signalDebounceTimer);
  }
  orderHistoryService.stopMonitoring();
  await redisService.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  Logger.info("SIGINT received, shutting down...");
  if (signalDebounceTimer) {
    clearTimeout(signalDebounceTimer);
  }
  orderHistoryService.stopMonitoring();
  await redisService.disconnect();
  process.exit(0);
});
