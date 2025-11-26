import * as dotenv from "dotenv";
dotenv.config();

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
  PrivateKey,
  PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import axios from "axios";
import { redisService } from "./services/redis.service";
import { prismaService } from "./services/prisma.service";
import { encryptionService } from "./services/encryption.service";
import { Logger } from "./utils/logger";
import { validateConfig } from "./config";

const STREAM_KEY = "orders:stream";
const BLOCK_TIME_MS = 5000;
const KANA_API_KEY = process.env.KANA_API_KEY || "";
const KANA_REST_URL =
  process.env.KANA_REST || "https://perps-tradeapi.kana.trade";

let isListening = false;
let lastProcessedId: string | null = null;

// Initialize Aptos client (mainnet) with gas optimization
const network = "mainnet" as Network;
const aptosConfig = new AptosConfig({ network });
const aptos = new Aptos(aptosConfig);

/**
 * Parse stream entry fields array to object
 */
function parseStreamEntry(fields: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    if (fields[i] && fields[i + 1]) {
      result[fields[i]] = fields[i + 1];
    }
  }
  return result;
}

/**
 * Display transaction data in terminal
 */
function displayTransaction(
  entryId: string,
  data: Record<string, string>
): void {
  console.log("\n" + "=".repeat(80));
  console.log("📦 NEW TRANSACTION RECEIVED FROM REDIS");
  console.log("=".repeat(80));
  console.log(`Entry ID: ${entryId}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("\nTransaction Data:");
  console.log("-".repeat(80));

  Object.entries(data).forEach(([key, value]) => {
    const displayValue =
      value.length > 60 ? `${value.substring(0, 60)}...` : value;
    console.log(`  ${key.padEnd(25)}: ${displayValue}`);
  });

  console.log("=".repeat(80) + "\n");
}

/**
 * Get user ID from wallet address
 */
async function getUserIdFromWalletAddress(
  walletAddress: string
): Promise<string | null> {
  try {
    const wallet = await prismaService.wallet.findUnique({
      where: { address: walletAddress },
      select: { user_id: true },
    });
    return wallet?.user_id || null;
  } catch (error) {
    Logger.error(`Error getting user ID for wallet ${walletAddress}`, error);
    return null;
  }
}

/**
 * Get private key for user
 */
async function getPrivateKeyForUser(userId: string): Promise<string | null> {
  try {
    const wallet = await prismaService.wallet.findUnique({
      where: { user_id: userId },
      select: { key: true },
    });

    if (!wallet) {
      return null;
    }

    const privateKeyPlain = encryptionService.decrypt(wallet.key);
    return privateKeyPlain;
  } catch (error) {
    Logger.error(`Error getting private key for user ${userId}`, error);
    return null;
  }
}

/**
 * Get subscribers for a trader address from Redis
 */
async function getSubscribers(
  traderAddress: string
): Promise<Map<string, string>> {
  const subscribers = new Map<string, string>();

  try {
    const subscriberData = await redisService.hgetall(
      `subs:profile:${traderAddress}`
    );

    if (subscriberData) {
      for (const [userAddress, allocatedAmount] of Object.entries(
        subscriberData
      )) {
        subscribers.set(userAddress, allocatedAmount);
      }
    }
  } catch (error) {
    Logger.error(
      `Error getting subscribers for trader ${traderAddress}`,
      error
    );
  }

  return subscribers;
}

/**
 * Display parameters that will be sent to Kana Labs API
 * Optimized: minimal logging for performance
 */
async function displayKanaApiParameters(
  entryId: string,
  orderData: Record<string, string>
): Promise<void> {
  try {
    // Parse order details
    const orderType = orderData.orderType || "MARKET";
    const tradeSide = orderData.tradeSide === "true";
    const direction = orderData.direction === "true";
    const marketId = orderData.marketId || orderData.market_id || "";
    const leverage = parseFloat(orderData.leverage || "1");
    const orderSize = parseFloat(orderData.size || "0");

    // Optimized: concise logging
    Logger.info(
      `📡 Order ${entryId}: ${orderType} | Market: ${marketId} | Size: ${orderSize} | Leverage: ${leverage} | ${tradeSide ? "LONG" : "SHORT"} | ${direction ? "CLOSE" : "OPEN"}`
    );
  } catch (error) {
    Logger.error("Error displaying Kana API parameters", error);
  }
}

/**
 * Place market order using Kana Labs API (with gas optimization)
 */
async function placeMarketOrder(
  userAddress: string,
  privateKey: string,
  marketId: string,
  size: number,
  leverage: number,
  tradeSide: boolean,
  direction: boolean
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    Logger.info(
      `🔧 [placeMarketOrder] Starting for ${userAddress.substring(0, 10)}...`
    );
    Logger.info(
      `   Market: ${marketId}, Size: ${size}, Leverage: ${leverage}, TradeSide: ${tradeSide} (${tradeSide ? "LONG" : "SHORT"}), Direction: ${direction} (${direction ? "CLOSE" : "OPEN"})`
    );

    // Format private key using PrivateKey.formatPrivateKey
    const formattedPrivateKey = PrivateKey.formatPrivateKey(
      privateKey.trim(),
      "ed25519" as PrivateKeyVariants
    );

    // Create account from private key
    const account = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(formattedPrivateKey),
    });

    // Check APT balance for gas fees
    try {
      const aptBalance = await aptos.getAccountAPTAmount({
        accountAddress: account.accountAddress,
      });
      const aptBalanceInAPT = Number(aptBalance) / 100000000;

      if (aptBalanceInAPT < 0.001) {
        return {
          success: false,
          error: `Insufficient APT for gas fees. Required: 0.001 APT, Available: ${aptBalanceInAPT.toFixed(8)} APT.`,
        };
      }
    } catch (error: any) {
      // Continue anyway
    }

    // Build query params using URLSearchParams
    const queryParams = new URLSearchParams({
      marketId: marketId,
      tradeSide: tradeSide.toString(),
      direction: direction.toString(),
      size: size.toString(),
      leverage: leverage.toString(),
    });

    Logger.info(
      `[placeMarketOrder] Calling Kana API: ${KANA_REST_URL}/placeMarketOrder`
    );

    // Get market order payload from Kana API
    const response = await axios.get(
      `${KANA_REST_URL}/placeMarketOrder?${queryParams.toString()}`,
      {
        headers: {
          "x-api-key": KANA_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.success) {
      return {
        success: false,
        error: response.data.message || "Failed to get market order payload",
      };
    }

    const payloadData = response.data.data;

    if (!payloadData) {
      return {
        success: false,
        error: "No payload data received from Kana API",
      };
    }

    // Build and submit transaction with gas optimization
    Logger.info(`[placeMarketOrder] Building Aptos transaction...`);
    const transactionPayload = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: payloadData,
      options: {
        maxGasAmount: 10000, // Gas optimization: lower gas limit
        gasUnitPrice: 100, // Gas optimization: lower gas price
      },
    });

    Logger.info(`[placeMarketOrder] Transaction built successfully`);

    // Sign and submit transaction
    Logger.info(`[placeMarketOrder] Signing and submitting transaction...`);
    const committedTxn = await aptos.transaction.signAndSubmitTransaction({
      transaction: transactionPayload,
      signer: account,
    });

    Logger.info(
      `[placeMarketOrder] Transaction submitted: ${committedTxn.hash}`
    );

    // Wait for transaction
    Logger.info(`[placeMarketOrder] Waiting for confirmation...`);
    const executedTxn = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    if (!executedTxn.success) {
      const txResult = executedTxn as any;
      const errorMessage =
        txResult.vm_status ||
        txResult.error?.message ||
        txResult.message ||
        txResult.transaction?.vm_status ||
        "Transaction failed on blockchain";

      Logger.error(`[placeMarketOrder] Transaction failed: ${errorMessage}`);
      return {
        success: false,
        error: `Transaction ${committedTxn.hash} failed: ${errorMessage}`,
      };
    }

    Logger.success(
      `[placeMarketOrder] Transaction confirmed: ${committedTxn.hash}`
    );
    Logger.info(
      `View on Aptos Explorer: https://explorer.aptoslabs.com/txn/${committedTxn.hash}`
    );

    return {
      success: true,
      txHash: committedTxn.hash,
    };
  } catch (error: any) {
    let errorMessage = error.message || "Failed to place market order";

    if (error.data?.message) {
      errorMessage = error.data.message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.vm_status) {
      errorMessage = error.vm_status;
    }

    Logger.error(`[placeMarketOrder] Error: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Execute trade for a single subscriber
 */
async function executeTradeForSubscriber(
  userAddress: string,
  orderType: string,
  tradeSide: boolean,
  direction: boolean,
  marketId: string,
  leverage: number,
  orderSize: number
): Promise<void> {
  try {
    // Get user ID from wallet address
    const userId = await getUserIdFromWalletAddress(userAddress);
    if (!userId) {
      Logger.warn(
        `User ID not found for wallet ${userAddress.substring(0, 10)}..., skipping`
      );
      return;
    }

    // Get private key
    const privateKey = await getPrivateKeyForUser(userId);
    if (!privateKey) {
      Logger.warn(`Private key not found for user ${userId}, skipping`);
      return;
    }

    Logger.info(
      `💼 Executing trade for ${userAddress.substring(0, 10)}...: Size=${orderSize}, Leverage=${leverage}, Type=${orderType}, Market=${marketId}, Side=${tradeSide ? "LONG" : "SHORT"}, Direction=${direction ? "CLOSE" : "OPEN"}`
    );

    // Place order based on orderType
    let result;
    if (orderType === "MARKET") {
      result = await placeMarketOrder(
        userAddress,
        privateKey,
        marketId,
        orderSize,
        leverage,
        tradeSide,
        direction
      );
    } else {
      Logger.error(`Unknown order type: ${orderType}, skipping`);
      return;
    }

    if (result.success) {
      Logger.success(
        `✅ Trade executed successfully for ${userAddress.substring(0, 10)}...: TX=${result.txHash}`
      );
    } else {
      Logger.error(
        `❌ Trade execution failed for ${userAddress.substring(0, 10)}...: ${result.error}`
      );
    }
  } catch (error) {
    Logger.error(
      `Error executing trade for subscriber ${userAddress.substring(0, 10)}...`,
      error
    );
  }
}

/**
 * Process order from Redis stream
 * Returns true if successful, false otherwise
 */
async function processOrder(
  entryId: string,
  orderData: Record<string, string>
): Promise<boolean> {
  try {
    // Parse order details (optimized format from Redis)
    let orderType = orderData.orderType || "MARKET";
    let tradeSide: boolean;
    let direction: boolean;
    const marketId = orderData.marketId || orderData.market_id || "";
    const leverage = parseFloat(orderData.leverage || "1");
    const orderSize = parseFloat(orderData.size || "0");

    // Check if using new optimized format
    if (
      orderData.tradeSide === undefined ||
      orderData.direction === undefined
    ) {
      Logger.warn(`Order ${entryId} missing tradeSide/direction, skipping`);
      return false;
    }

    tradeSide = orderData.tradeSide === "true";
    direction = orderData.direction === "true";

    // Get trader wallet address (already wallet address from Redis)
    const traderWalletAddress = orderData.address;
    if (!traderWalletAddress) {
      Logger.warn(`Order ${entryId} missing address, skipping`);
      return false;
    }

    // Get subscribers (optimized: fetch once)
    const subscribers = await getSubscribers(traderWalletAddress);
    if (subscribers.size === 0) {
      Logger.info(
        `No subscribers found for trader ${traderWalletAddress.substring(0, 10)}..., skipping execution`
      );
      return true; // Consider this successful (no work to do)
    }

    Logger.info(
      `📊 Processing order ${entryId}: ${subscribers.size} subscriber(s) for trader ${traderWalletAddress.substring(0, 10)}...`
    );

    // Execute trades for all subscribers in parallel (optimized)
    const executionPromises: Promise<boolean>[] = [];
    for (const [userAddress] of subscribers.entries()) {
      executionPromises.push(
        executeTradeForSubscriber(
          userAddress,
          orderType,
          tradeSide,
          direction,
          marketId,
          leverage,
          orderSize
        )
          .then(() => true)
          .catch(() => false)
      );
    }

    const results = await Promise.allSettled(executionPromises);
    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;
    const totalCount = results.length;

    Logger.success(
      `✅ Completed trade execution: ${successCount}/${totalCount} successful for order ${entryId}`
    );

    // Return true if at least one trade succeeded (or all succeeded)
    return successCount > 0;
  } catch (error) {
    Logger.error(`Error processing order ${entryId}`, error);
    return false;
  }
}

/**
 * Listen for new transactions in Redis stream
 */
async function listenToStream(): Promise<void> {
  if (isListening) {
    Logger.warn("Already listening to stream, skipping...");
    return;
  }

  isListening = true;
  Logger.info(`🎧 Starting to listen to stream: ${STREAM_KEY}`);

  // Get the last entry ID to start from
  if (!lastProcessedId) {
    const lastId = await redisService.getLastStreamId(STREAM_KEY);
    if (lastId) {
      Logger.info(`📌 Found existing stream, last ID: ${lastId}`);
      lastProcessedId = lastId;
    } else {
      Logger.info("📌 Stream is empty, waiting for new entries...");
      lastProcessedId = "$";
    }
  }

  // Continuously listen for new entries
  while (isListening) {
    try {
      const entries = await redisService.readStream(
        STREAM_KEY,
        lastProcessedId || "$",
        BLOCK_TIME_MS
      );

      if (entries && entries.length > 0) {
        Logger.info(
          `📥 Received ${entries.length} new transaction(s) - processing in parallel`
        );

        // Process all entries in parallel for maximum throughput
        const processingPromises = entries.map(async ([entryId, fields]) => {
          const transactionData = parseStreamEntry(fields);

          // Display transaction data (non-blocking, minimal)
          displayTransaction(entryId, transactionData);

          // Display API parameters (non-blocking)
          await displayKanaApiParameters(entryId, transactionData);

          // Process order and get result
          const success = await processOrder(entryId, transactionData);

          // Delete from Redis stream after successful processing
          if (success) {
            try {
              const deleted = await redisService.deleteStreamEntry(
                STREAM_KEY,
                entryId
              );
              if (deleted > 0) {
                Logger.info(
                  `🗑️  Deleted processed entry ${entryId} from Redis stream`
                );
              } else {
                Logger.warn(
                  `⚠️  Failed to delete entry ${entryId} from Redis stream (may have been already deleted)`
                );
              }
            } catch (error) {
              Logger.error(
                `Error deleting entry ${entryId} from Redis stream`,
                error
              );
            }
          } else {
            Logger.warn(
              `⚠️  Keeping entry ${entryId} in stream (processing failed)`
            );
          }

          return entryId;
        });

        // Wait for all entries to be processed in parallel
        const processedIds = await Promise.allSettled(processingPromises);

        // Update lastProcessedId to the highest ID processed
        const successfulIds = processedIds
          .filter(
            (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled"
          )
          .map((r) => r.value);

        if (successfulIds.length > 0) {
          // Sort IDs and get the latest one
          successfulIds.sort((a, b) => {
            const [aTime, aSeq] = a.split("-").map(Number);
            const [bTime, bSeq] = b.split("-").map(Number);
            if (aTime !== bTime) return aTime - bTime;
            return aSeq - bSeq;
          });
          lastProcessedId = successfulIds[successfulIds.length - 1];
        }

        Logger.success(`✅ Batch processed ${entries.length} transaction(s)`);
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
    Logger.info("⏳ Connecting to database...");
    await prismaService.connect();

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
    Logger.success("✅ Database connected");

    // Start listening to stream
    await listenToStream();

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
  isListening = false;
  await prismaService.disconnect();
  await redisService.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  Logger.info("SIGINT received, shutting down...");
  isListening = false;
  await prismaService.disconnect();
  await redisService.disconnect();
  process.exit(0);
});
