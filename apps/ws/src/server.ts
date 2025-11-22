import { config, validateConfig } from "./config";
import { orderHistoryService } from "./services/orderHistoryService";
import { Logger } from "./utils/logger";

async function initializeServices(): Promise<void> {
  try {
    validateConfig();
    Logger.info("🔌 Initializing services...");

    if (config.targetWalletAddresses.length > 0) {
      Logger.info(
        `🎯 Starting monitoring for ${config.targetWalletAddresses.length} wallet(s)`
      );
      await orderHistoryService.startMonitoring(config.targetWalletAddresses);
      Logger.success("Monitoring started successfully");
    } else {
      Logger.warn("No target wallet addresses configured");
    }
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

process.on("SIGTERM", () => {
  Logger.info("SIGTERM received, shutting down...");
  orderHistoryService.stopMonitoring();
  process.exit(0);
});

process.on("SIGINT", () => {
  Logger.info("SIGINT received, shutting down...");
  orderHistoryService.stopMonitoring();
  process.exit(0);
});
