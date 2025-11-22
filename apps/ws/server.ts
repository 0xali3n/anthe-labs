import express, { Express } from "express";
import { config, getTimestamp, validateConfig } from "./config";
import { orderHistoryService } from "./orderHistoryService";

const app: Express = express();

// Middleware
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Order History Monitor is running",
    timestamp: getTimestamp(),
    config: {
      port: config.port,
      kanaConfigured: !!config.kanaApiKey,
      targetAddressConfigured: !!config.targetWalletAddress,
    },
  });
});

// API Routes
app.get("/api/status", (req, res) => {
  const status = orderHistoryService.getStatus();
  // Don't expose sensitive profile address in status
  res.json({
    status: "OK",
    message: "API is healthy",
    timestamp: getTimestamp(),
    services: {
      kana: !!config.kanaApiKey,
    },
    orderHistory: {
      isMonitoring: status.isMonitoring,
      trackedOrdersCount: status.trackedOrdersCount,
      reconnectAttempts: status.reconnectAttempts,
      // Don't expose targetProfileAddress for security
    },
  });
});

// Initialize services on server start
async function initializeServices() {
  try {
    // Validate configuration
    validateConfig();

    console.log(`${getTimestamp()} - 🔌 Initializing services...`);

    // Start order history monitoring
    if (config.targetWalletAddress) {
      // Mask wallet address in logs for security
      const maskedAddress =
        config.targetWalletAddress.length > 10
          ? `${config.targetWalletAddress.substring(0, 6)}...${config.targetWalletAddress.substring(config.targetWalletAddress.length - 4)}`
          : "***";
      console.log(
        `${getTimestamp()} - 🎯 Starting order history monitoring for: ${maskedAddress}`
      );
      await orderHistoryService.startMonitoring(config.targetWalletAddress);
      console.log(
        `${getTimestamp()} - ✅ Order history monitoring started successfully`
      );
    } else {
      console.log(
        `${getTimestamp()} - ⚠️  No target wallet address configured`
      );
    }
  } catch (error) {
    console.error(
      `${getTimestamp()} - ❌ Failed to initialize services:`,
      error
    );
    process.exit(1);
  }
}

app.listen(config.port, async () => {
  console.log(`🚀 Order History Monitor running on port ${config.port}`);
  console.log(`📊 Health check: http://localhost:${config.port}/health`);
  console.log(`🔧 API status: http://localhost:${config.port}/api/status`);

  // Initialize services
  await initializeServices();
});

export default app;
