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
import { redisService } from "./redis.service";
import { prismaService } from "./prisma.service";
import { encryptionService } from "./encryption.service";
import { Logger } from "../utils/logger";
import { config } from "../config";

export interface TradeOrder {
  address: string; // Profile address from stream
  orderType: string; // "MARKET", "LIMIT", "STOP" - already converted
  tradeSide: string; // "true" or "false" - already converted (true=long, false=short)
  direction: string; // "true" or "false" - already converted (false=open, true=close)
  marketId: string; // Market ID
  size: string; // Order size
  leverage: string; // Leverage
  price?: string; // Price (for limit/stop orders)
  restriction?: string; // Restriction (optional)
  takeProfit?: string; // Take profit (optional)
  stopLoss?: string; // Stop loss (optional)
  percentage?: string; // Percentage for scaling subscriber trades
  order_value?: string; // Order value
  timestamp?: string; // Timestamp
  order_id?: string; // Order ID
  transaction_version?: string; // Transaction version
  [key: string]: string | undefined;
}

export interface SubscriberInfo {
  userAddress: string;
  allocatedAmount: string;
  userId: string;
  privateKey: string;
}

export class TradeExecutionService {
  private kanaApiKey: string;
  private kanaRestUrl: string;
  private aptos: Aptos;

  constructor() {
    this.kanaApiKey = process.env.KANA_API_KEY || "";
    // Use kana.trade for mainnet
    this.kanaRestUrl =
      process.env.KANA_REST || "https://perps-tradeapi.kana.trade";

    if (!this.kanaApiKey) {
      throw new Error("KANA_API_KEY environment variable is required");
    }

    // Initialize Aptos client (mainnet)
    const network = "mainnet" as Network;
    const aptosConfig = new AptosConfig({ network });
    this.aptos = new Aptos(aptosConfig);

    Logger.success("✅ Trade Execution Service initialized");
  }

  /**
   * Convert order type to tradeSide and direction
   * Order types: 1=Long, 2=Short, 3=Exit Long, 4=Exit Short
   * API expects: tradeSide (true=long, false=short), direction (false=open, true=close)
   */
  private convertOrderTypeToTradeParams(orderType: number): {
    tradeSide: boolean;
    direction: boolean;
  } {
    switch (orderType) {
      case 1: // Long (open)
        return { tradeSide: true, direction: false };
      case 2: // Short (open)
        return { tradeSide: false, direction: false };
      case 3: // Exit Long (close)
        return { tradeSide: true, direction: true };
      case 4: // Exit Short (close)
        return { tradeSide: false, direction: true };
      default:
        // Default to long open
        return { tradeSide: true, direction: false };
    }
  }

  /**
   * Get wallet address from profile address
   * Note: The order.address in stream is profile address
   * We need to find the wallet address that corresponds to this profile
   * Strategy: Check all subscriber keys in Redis to find which wallet address
   * has subscribers, then verify if the profile matches
   */
  async getWalletAddressFromProfile(
    profileAddress: string
  ): Promise<string | null> {
    try {
      // Get all active profiles (these are wallet addresses)
      const activeProfiles = await redisService.smembers("profiles:active");

      // For each active profile, check if it has subscribers
      // and try to verify if the profile address matches
      for (const walletAddress of activeProfiles) {
        const subscriberKey = `subs:profile:${walletAddress}`;
        const hasSubscribers = (await redisService.hlen(subscriberKey)) > 0;

        if (hasSubscribers) {
          // Try to get profile address for this wallet to verify
          try {
            const response = await axios.get(
              `${this.kanaRestUrl}/getProfileAddress?userAddress=${walletAddress}`,
              {
                headers: {
                  "x-api-key": this.kanaApiKey,
                  "Content-Type": "application/json",
                },
              }
            );

            if (
              response.data?.success &&
              response.data.data === profileAddress
            ) {
              return walletAddress; // Found matching wallet address
            }
          } catch (error) {
            // Continue to next profile
            continue;
          }
        }
      }

      // If not found, try using profile address directly
      // (sometimes profile address and wallet address are the same)
      if (activeProfiles.includes(profileAddress)) {
        return profileAddress;
      }

      return null;
    } catch (error) {
      Logger.error(
        `Failed to get wallet address for profile ${profileAddress.substring(0, 10)}...`,
        error
      );
      // Fallback: return profile address as wallet address
      return profileAddress;
    }
  }

  /**
   * Get subscribers for a trader from Redis
   * Returns map of userAddress -> allocatedAmount
   */
  async getSubscribers(traderWalletAddress: string): Promise<
    Map<string, string>
  > {
    const subscriberKey = `subs:profile:${traderWalletAddress}`;
    const subscribers = new Map<string, string>();

    try {
      const subscriberData = await redisService.hgetall(subscriberKey);

      for (const [userAddress, allocatedAmount] of Object.entries(
        subscriberData
      )) {
        subscribers.set(userAddress, allocatedAmount);
      }

      Logger.info(
        `Found ${subscribers.size} subscriber(s) for trader ${traderWalletAddress.substring(0, 10)}...`
      );
    } catch (error) {
      Logger.error("Failed to get subscribers from Redis", error);
    }

    return subscribers;
  }

  /**
   * Get user ID from wallet address
   */
  async getUserIdFromWalletAddress(
    walletAddress: string
  ): Promise<string | null> {
    try {
      const wallet = await prismaService.wallet.findUnique({
        where: { address: walletAddress },
        select: { user_id: true },
      });

      return wallet?.user_id || null;
    } catch (error) {
      Logger.error(
        `Failed to get user ID for wallet ${walletAddress.substring(0, 10)}...`,
        error
      );
      return null;
    }
  }

  /**
   * Get private key for a user ID
   */
  async getPrivateKeyForUser(userId: string): Promise<string | null> {
    try {
      const wallet = await prismaService.wallet.findUnique({
        where: { user_id: userId },
        select: { key: true },
      });

      if (!wallet) {
        return null;
      }

      // Decrypt private key
      const privateKey = encryptionService.decrypt(wallet.key);
      return privateKey;
    } catch (error) {
      Logger.error(`Failed to get private key for user ${userId}`, error);
      return null;
    }
  }

  /**
   * Calculate trade size based on trader's order and subscriber's allocation
   * Smart ratio: Match the trader's position size ratio
   * If trader uses X% of their balance, subscriber uses X% of their allocated amount
   */
  calculateTradeSize(
    traderOrderSize: number,
    traderPercentage: number,
    subscriberAllocatedAmount: number
  ): number {
    // If percentage is 100%, use full allocated amount (scaled to trader's size ratio)
    if (traderPercentage >= 100) {
      // Use the trader's order size directly (same size as trader)
      return traderOrderSize;
    }

    // Calculate based on percentage:
    // If trader used X% of their balance for this trade,
    // subscriber should use X% of their allocated amount
    // But scale it to match the trader's actual order size proportionally
    const tradeSize = (subscriberAllocatedAmount * traderPercentage) / 100;

    // Ensure we don't exceed the allocated amount
    return Math.min(tradeSize, subscriberAllocatedAmount);
  }

  /**
   * Place market order using Kana Labs API
   * Now uses tradeSide and direction directly (no conversion needed)
   */
  async placeMarketOrder(
    userAddress: string,
    privateKey: string,
    marketId: string,
    size: number,
    leverage: number,
    tradeSide: boolean, // true=long, false=short
    direction: boolean // false=open, true=close
  ): Promise<{
    success: boolean;
    txHash?: string;
    version?: string;
    error?: string;
  }> {
    try {
      Logger.info(`🔧 [placeMarketOrder] Starting for ${userAddress.substring(0, 10)}...`);
      Logger.info(`   Market: ${marketId}, Size: ${size}, Leverage: ${leverage}, TradeSide: ${tradeSide} (${tradeSide ? "LONG" : "SHORT"}), Direction: ${direction} (${direction ? "CLOSE" : "OPEN"})`);

      // Format private key using PrivateKey.formatPrivateKey (as per previous implementation)
      Logger.debug(`[placeMarketOrder] Formatting private key...`);
      const formattedPrivateKey = PrivateKey.formatPrivateKey(
        privateKey.trim(),
        "ed25519" as PrivateKeyVariants
      );

      // Create account from private key
      Logger.debug(`[placeMarketOrder] Creating Aptos account...`);
      const account = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(formattedPrivateKey),
      });
      Logger.debug(`[placeMarketOrder] Account created: ${account.accountAddress.toString()}`);

      // Check APT balance for gas fees
      try {
        const aptBalance = await this.aptos.getAccountAPTAmount({
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

      // Build query params using URLSearchParams (exactly as test-trade.ts)
      const queryParams = new URLSearchParams({
        marketId: marketId,
        tradeSide: tradeSide.toString(),
        direction: direction.toString(),
        size: size.toString(),
        leverage: leverage.toString(),
      });

      Logger.info(`[placeMarketOrder] Calling Kana API: ${this.kanaRestUrl}/placeMarketOrder`);
      Logger.debug(`[placeMarketOrder] Query params: ${queryParams.toString()}`);

      // Get market order payload from Kana API (exactly as test-trade.ts)
      const response = await axios.get(
        `${this.kanaRestUrl}/placeMarketOrder?${queryParams.toString()}`,
        {
          headers: {
            "x-api-key": this.kanaApiKey,
            "Content-Type": "application/json",
          },
        }
      );

      Logger.debug(`[placeMarketOrder] API Response status: ${response.status}`);
      Logger.debug(`[placeMarketOrder] API Response data:`, JSON.stringify(response.data).substring(0, 500));

      if (!response.data.success) {
        Logger.error(`[placeMarketOrder] API returned error: ${response.data.message}`);
        return {
          success: false,
          error: response.data.message || "Failed to get market order payload",
        };
      }

      const payloadData = response.data.data;

      if (!payloadData) {
        Logger.error(`[placeMarketOrder] No payload data in response`);
        return {
          success: false,
          error: "No payload data received from Kana API",
        };
      }

      Logger.info(`[placeMarketOrder] Payload received, type: ${typeof payloadData}`);
      Logger.debug(`[placeMarketOrder] Payload structure:`, JSON.stringify(payloadData, null, 2).substring(0, 1000));

      // Build and submit transaction (exactly as test-trade.ts)
      Logger.info(`[placeMarketOrder] Building Aptos transaction...`);
      Logger.debug(`[placeMarketOrder] Payload functionArguments:`, payloadData.functionArguments);
      
      const transactionPayload = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payloadData,
        options: {
          maxGasAmount: 10000, // Set lower gas limit (as per test-trade.ts)
          gasUnitPrice: 100, // Set lower gas price (as per test-trade.ts)
        },
      });

      Logger.info(`[placeMarketOrder] Transaction built successfully`);

      Logger.info(`[placeMarketOrder] Signing and submitting transaction...`);
      // Exactly as test-trade.ts
      const committedTxn = await this.aptos.transaction.signAndSubmitTransaction({
        transaction: transactionPayload,
        signer: account,
      });

      Logger.info(`[placeMarketOrder] Transaction submitted: ${committedTxn.hash}`);
      Logger.info(`[placeMarketOrder] Waiting for confirmation...`);

      const executedTxn = await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      if (!executedTxn.success) {
        // Extract detailed error message from transaction
        // Aptos SDK returns error in different places depending on failure type
        const txResult = executedTxn as any;
        const errorMessage = txResult.vm_status || 
                            txResult.error?.message ||
                            txResult.message ||
                            txResult.transaction?.vm_status ||
                            "Transaction failed on blockchain";
        
        Logger.error(`[placeMarketOrder] Transaction failed on blockchain`);
        Logger.error(`[placeMarketOrder] Error details:`, {
          vm_status: txResult.vm_status,
          error: txResult.error,
          message: txResult.message,
          transaction: txResult.transaction,
        });
        
        return {
          success: false,
          error: `Transaction ${committedTxn.hash} failed with an error: ${errorMessage}`,
        };
      }

      const version =
        (executedTxn as any).version ||
        (executedTxn as any).transaction?.version;

      Logger.success(`[placeMarketOrder] Transaction confirmed: ${committedTxn.hash}`);

      return {
        success: true,
        txHash: committedTxn.hash,
        version: version || undefined,
      };
    } catch (error: any) {
      // Extract detailed error message
      let errorMessage = error.message || "Failed to place market order";
      
      // Check if it's an Aptos API error with detailed info
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.vm_status) {
        errorMessage = error.vm_status;
      }
      
      Logger.error(
        `[placeMarketOrder] Error placing market order for ${userAddress.substring(0, 10)}...`,
        error
      );
      Logger.error(`[placeMarketOrder] Error details:`, {
        message: errorMessage,
        fullError: error.message,
        stack: error.stack,
        name: error.name,
        data: error.data,
        response: error.response?.data,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Place limit order using Kana Labs API
   * Uses tradeSide and direction directly (no conversion needed)
   */
  async placeLimitOrder(
    userAddress: string,
    privateKey: string,
    marketId: string,
    size: number,
    leverage: number,
    tradeSide: boolean, // true=long, false=short
    direction: boolean, // false=open, true=close
    price: number,
    restriction: number = 0
  ): Promise<{
    success: boolean;
    txHash?: string;
    version?: string;
    error?: string;
  }> {
    try {
      Logger.info(`🔧 [placeLimitOrder] Starting for ${userAddress.substring(0, 10)}...`);
      Logger.info(`   Market: ${marketId}, Size: ${size}, Leverage: ${leverage}, Price: ${price}, TradeSide: ${tradeSide} (${tradeSide ? "LONG" : "SHORT"}), Direction: ${direction} (${direction ? "CLOSE" : "OPEN"})`);

      // Format private key
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
        const aptBalance = await this.aptos.getAccountAPTAmount({
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
        price: price.toString(),
        leverage: leverage.toString(),
      });

      if (restriction !== undefined) {
        queryParams.append("restriction", restriction.toString());
      }

      Logger.info(`[placeLimitOrder] Calling Kana API: ${this.kanaRestUrl}/placeLimitOrder`);
      Logger.debug(`[placeLimitOrder] Query params: ${queryParams.toString()}`);

      // Get limit order payload from Kana API
      const response = await axios.get(
        `${this.kanaRestUrl}/placeLimitOrder?${queryParams.toString()}`,
        {
          headers: {
            "x-api-key": this.kanaApiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || "Failed to get limit order payload",
        };
      }

      const payloadData = response.data.data;

      if (!payloadData) {
        return {
          success: false,
          error: "No payload data received from Kana API",
        };
      }

      // Build and submit transaction
      const transactionPayload = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payloadData,
        options: {
          maxGasAmount: 10000,
          gasUnitPrice: 100,
        },
      });

      const committedTxn = await this.aptos.transaction.signAndSubmitTransaction(
        {
          transaction: transactionPayload,
          signer: account,
        }
      );

      const executedTxn = await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      if (!executedTxn.success) {
        // Extract detailed error message from transaction
        const txResult = executedTxn as any;
        const errorMessage = txResult.vm_status || 
                            txResult.error?.message ||
                            txResult.message ||
                            txResult.transaction?.vm_status ||
                            "Transaction failed on blockchain";
        
        Logger.error(`[placeLimitOrder] Transaction failed on blockchain`);
        Logger.error(`[placeLimitOrder] Error details:`, {
          vm_status: txResult.vm_status,
          error: txResult.error,
          message: txResult.message,
          transaction: txResult.transaction,
        });
        
        return {
          success: false,
          error: `Transaction ${committedTxn.hash} failed with an error: ${errorMessage}`,
        };
      }

      const version =
        (executedTxn as any).version ||
        (executedTxn as any).transaction?.version;

      return {
        success: true,
        txHash: committedTxn.hash,
        version: version || undefined,
      };
    } catch (error: any) {
      // Extract detailed error message
      let errorMessage = error.message || "Failed to place limit order";
      
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.vm_status) {
        errorMessage = error.vm_status;
      }
      
      Logger.error(
        `[placeLimitOrder] Error placing limit order for ${userAddress.substring(0, 10)}...`,
        error
      );
      Logger.error(`[placeLimitOrder] Error details:`, {
        message: errorMessage,
        fullError: error.message,
        stack: error.stack,
        name: error.name,
        data: error.data,
        response: error.response?.data,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute trade for all subscribers
   * Now uses optimized fields directly from Redis (no conversion needed)
   */
  async executeTradeForSubscribers(order: TradeOrder): Promise<void> {
    try {
      Logger.info(
        `🔄 Processing trade execution for order: ${order.marketId} (Type: ${order.orderType})`
      );

      // The order.address is the profile address from the stream
      // We need to find the corresponding wallet address
      let traderWalletAddress = order.address;

      // Check if we can find it in Redis active profiles
      // If not found, try to get wallet address from profile
      const walletAddress = await this.getWalletAddressFromProfile(order.address);
      if (walletAddress) {
        traderWalletAddress = walletAddress;
      }

      // Get subscribers from Redis
      const subscribers = await this.getSubscribers(traderWalletAddress);

      if (subscribers.size === 0) {
        Logger.info("No subscribers found for this trader, skipping execution");
        return;
      }

      // Parse order details (all fields already optimized from Redis)
      // Support both new optimized format and old format for backward compatibility
      let orderType = order.orderType || "MARKET"; // "MARKET", "LIMIT", "STOP"
      let tradeSide: boolean;
      let direction: boolean;
      const marketId = order.marketId || order.market_id || "";
      const leverage = parseFloat(order.leverage || "1");
      const orderSize = parseFloat(order.size || "0");
      const percentage = parseFloat(order.percentage || "0");
      const price = order.price ? parseFloat(order.price) : undefined;

      // Check if using new optimized format (has tradeSide and direction)
      if (order.tradeSide !== undefined && order.direction !== undefined) {
        // New optimized format - use directly
        tradeSide = order.tradeSide === "true";
        direction = order.direction === "true";
      } else {
        // Old format - convert from order_type (backward compatibility)
        const numericOrderType = parseInt(order.order_type || "0");
        const converted = this.convertOrderTypeToTradeParams(numericOrderType);
        tradeSide = converted.tradeSide;
        direction = converted.direction;
        
        // Determine orderType from old format
        if (!order.orderType) {
          if (numericOrderType === 1 || numericOrderType === 4 || numericOrderType === 7 || numericOrderType === 10) {
            orderType = "MARKET";
          } else if (numericOrderType === 2 || numericOrderType === 5 || numericOrderType === 8 || numericOrderType === 11) {
            orderType = "LIMIT";
          } else if (numericOrderType === 3 || numericOrderType === 6 || numericOrderType === 9 || numericOrderType === 12) {
            orderType = "STOP";
          }
        }
      }

      Logger.info(
        `📊 Order details: Market=${marketId}, Type=${orderType}, TradeSide=${tradeSide} (${tradeSide ? "LONG" : "SHORT"}), Direction=${direction} (${direction ? "CLOSE" : "OPEN"}), Leverage=${leverage}, Size=${orderSize}, Percentage=${percentage}%`
      );

      // Process each subscriber
      const executionPromises: Promise<void>[] = [];

      for (const [userAddress, allocatedAmountStr] of subscribers.entries()) {
        executionPromises.push(
          this.executeTradeForSubscriber(
            userAddress,
            allocatedAmountStr,
            orderType,
            tradeSide,
            direction,
            marketId,
            leverage,
            orderSize,
            percentage,
            price
          )
        );
      }

      // Execute all trades in parallel
      await Promise.allSettled(executionPromises);

      Logger.success(
        `✅ Completed trade execution for ${subscribers.size} subscriber(s)`
      );
    } catch (error) {
      Logger.error("Error executing trade for subscribers", error);
    }
  }

  /**
   * Execute trade for a single subscriber
   * Now uses optimized fields directly (no conversion needed)
   */
  private async executeTradeForSubscriber(
    userAddress: string,
    allocatedAmountStr: string,
    orderType: string, // "MARKET", "LIMIT", "STOP"
    tradeSide: boolean, // true=long, false=short
    direction: boolean, // false=open, true=close
    marketId: string,
    leverage: number,
    orderSize: number,
    percentage: number,
    price?: number // For limit/stop orders
  ): Promise<void> {
    try {
      // Get user ID from wallet address
      const userId = await this.getUserIdFromWalletAddress(userAddress);

      if (!userId) {
        Logger.warn(
          `User ID not found for wallet ${userAddress.substring(0, 10)}..., skipping`
        );
        return;
      }

      // Get private key
      const privateKey = await this.getPrivateKeyForUser(userId);

      if (!privateKey) {
        Logger.warn(
          `Private key not found for user ${userId}, skipping`
        );
        return;
      }

      // Calculate trade size based on trader's order and subscriber's allocation
      const allocatedAmount = parseFloat(allocatedAmountStr);
      const tradeSize = this.calculateTradeSize(
        orderSize,
        percentage,
        allocatedAmount
      );

      if (tradeSize <= 0) {
        Logger.warn(
          `Calculated trade size is 0 for user ${userAddress.substring(0, 10)}..., skipping`
        );
        return;
      }

      Logger.info(
        `💼 Executing trade for ${userAddress.substring(0, 10)}...: Size=${tradeSize.toFixed(6)}, Leverage=${leverage}, Type=${orderType}, Market=${marketId}, Side=${tradeSide ? "LONG" : "SHORT"}, Direction=${direction ? "CLOSE" : "OPEN"}`
      );

      // Place order based on orderType
      let result;
      if (orderType === "MARKET") {
        result = await this.placeMarketOrder(
          userAddress,
          privateKey,
          marketId,
          tradeSize,
          leverage,
          tradeSide,
          direction
        );
      } else if (orderType === "LIMIT" || orderType === "STOP") {
        if (!price) {
          Logger.error(
            `Price required for ${orderType} order, skipping`
          );
          return;
        }
        result = await this.placeLimitOrder(
          userAddress,
          privateKey,
          marketId,
          tradeSize,
          leverage,
          tradeSide,
          direction,
          price
        );
      } else {
        Logger.error(
          `Unknown order type: ${orderType}, skipping`
        );
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
}

// Export singleton instance
export const tradeExecutionService = new TradeExecutionService();

