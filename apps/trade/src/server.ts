import * as dotenv from "dotenv";
dotenv.config();

import * as http from "http";
import { Logger } from "./utils/logger";
import { validateConfig } from "./config";
import { redisService } from "./services/redis.service";
import { prismaService } from "./services/prisma.service";
import { streamProcessorService } from "./services/stream-processor.service";

const STREAM_KEY = "orders:stream";
const BLOCK_TIME_MS = 5000;

let isListening = false;
let lastProcessedId: string | null = null;

/**
 * Listen for new transactions in Redis stream
 */
async function listenToStream(): Promise<void> {
  if (isListening) {
    Logger.warn("Already listening to stream");
    return;
  }

  isListening = true;
  Logger.info(`🎧 Listening to stream: ${STREAM_KEY}`);

  // Get the last entry ID to start from
  if (!lastProcessedId) {
    const lastId = await redisService.getLastStreamId(STREAM_KEY);
    lastProcessedId = lastId || "$";
  }

  // Continuously listen for new entries
  while (isListening) {
    try {
      const entries = await redisService.readStream(
        STREAM_KEY,
        lastProcessedId || "$",
        BLOCK_TIME_MS,
      );

      if (entries && entries.length > 0) {
        Logger.info(`📥 Received ${entries.length} transaction(s)`);

        // Process all entries in parallel
        const processedIds = await streamProcessorService.processBatch(entries);

        // Update lastProcessedId to the highest ID processed
        if (processedIds.length > 0) {
          processedIds.sort((a, b) => {
            const [aTime, aSeq] = a.split("-").map(Number);
            const [bTime, bSeq] = b.split("-").map(Number);
            if (aTime !== bTime) return aTime - bTime;
            return aSeq - bSeq;
          });
          lastProcessedId = processedIds[processedIds.length - 1];
        }

        Logger.success(`✅ Processed ${entries.length} transaction(s)`);
      }
    } catch (error) {
      Logger.error("Error reading from stream", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Initialize services
 */
async function initializeServices(): Promise<void> {
  try {
    validateConfig();
    Logger.info("🔌 Initializing Trade Service...");

    // Connect to database
    await prismaService.connect();

    // Wait for Redis connection
    let retries = 0;
    const maxRetries = 10;
    while (!redisService.getIsConnected() && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;
    }

    if (!redisService.getIsConnected()) {
      const connected = await redisService.testConnection();
      if (!connected) {
        throw new Error("Failed to connect to Redis");
      }
    }

    Logger.success("✅ Services connected");

    // Start listening to stream (don't await; it runs until shutdown)
    void listenToStream();
  } catch (error) {
    Logger.error("Failed to initialize services", error);
    process.exit(1);
  }
}

/**
 * Start HTTP server for health checks (init first, then health; retry on EADDRINUSE)
 */
function startHealthServer(): void {
  const port = Number(process.env.PORT) || 4003;

  const createAndListen = (): void => {
    const server = http.createServer((req, res) => {
      if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            message: "✅ Trade service is running!",
            timestamp: new Date().toISOString(),
          })
        );
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        Logger.warn(`Port ${port} in use or TIME_WAIT; retrying in 5s...`);
        server.removeAllListeners();
        setTimeout(createAndListen, 5000);
      } else {
        Logger.error("Health server error", err);
        process.exit(1);
      }
    });

    server.listen(port, "0.0.0.0", () => {
      Logger.info(`🏥 Health check server running on port ${port}`);
    });
  };

  createAndListen();
}

// Start the service (initialize Redis/DB and stream first, then health server)
Logger.info("🚀 Trade Service starting...");
initializeServices()
  .then(() => {
    startHealthServer();
  })
  .catch((error) => {
    Logger.error("Failed to initialize services", error);
    process.exit(1);
  });

process.on("uncaughtException", (error: Error) => {
  Logger.error("Uncaught Exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  Logger.error("Unhandled Rejection", reason);
  process.exit(1);
});

const shutdown = async () => {
  Logger.info("Shutting down...");
  isListening = false;
  await prismaService.disconnect();
  await redisService.disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
