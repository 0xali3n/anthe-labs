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
import { Logger } from "../utils/logger";
import { prismaService } from "./prisma.service";
import { encryptionService } from "./encryption.service";

const KANA_API_KEY = process.env.KANA_API_KEY || "";
const KANA_REST_URL =
  process.env.KANA_REST || "https://perps-tradeapi.kana.trade";

// Initialize Aptos client (mainnet) with gas optimization
const network = "mainnet" as Network;
const aptosConfig = new AptosConfig({ network });
const aptos = new Aptos(aptosConfig);

interface OrderParams {
  marketId: string;
  size: number;
  leverage: number;
  tradeSide: boolean;
  direction: boolean;
  price?: number;
  restriction?: number;
  percentage?: number; // For smart ratio calculation
}

interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class OrderExecutionService {
  // Queue for each account to ensure sequential transaction execution
  private accountQueues: Map<string, Promise<any>> = new Map();

  /**
   * Get user ID from wallet address
   */
  private async getUserIdFromWalletAddress(
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
  private async getPrivateKeyForUser(userId: string): Promise<string | null> {
    try {
      const wallet = await prismaService.wallet.findUnique({
        where: { user_id: userId },
        select: { key: true },
      });

      if (!wallet) return null;

      return encryptionService.decrypt(wallet.key);
    } catch (error) {
      Logger.error(`Error getting private key for user ${userId}`, error);
      return null;
    }
  }

  /**
   * Create Aptos account from private key
   */
  private createAccount(privateKey: string): Account {
    const formattedPrivateKey = PrivateKey.formatPrivateKey(
      privateKey.trim(),
      "ed25519" as PrivateKeyVariants
    );

    return Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(formattedPrivateKey),
    });
  }

  /**
   * Check APT balance for gas fees
   */
  private async checkBalance(account: Account): Promise<boolean> {
    try {
      const aptBalance = await aptos.getAccountAPTAmount({
        accountAddress: account.accountAddress,
      });
      const aptBalanceInAPT = Number(aptBalance) / 100000000;
      return aptBalanceInAPT >= 0.001;
    } catch {
      return true; // Continue anyway
    }
  }

  /**
   * Get trading balance from Kana Labs API
   */
  private async getTradingBalance(walletAddress: string): Promise<number> {
    try {
      const response = await axios.get(
        `${KANA_REST_URL}/getNetProfileBalance`,
        {
          params: {
            userAddress: walletAddress,
          },
          headers: {
            "x-api-key": KANA_API_KEY,
          },
        }
      );

      if (response.data.success && response.data.data !== undefined) {
        return Number(response.data.data);
      }

      return 0;
    } catch (error: any) {
      Logger.error(
        `Error fetching trading balance for ${walletAddress.substring(0, 10)}...`,
        error
      );
      return 0;
    }
  }

  /**
   * Get user positions from Kana Labs API
   */
  private async getPositions(
    walletAddress: string,
    marketId?: string
  ): Promise<any[]> {
    try {
      const params: any = {
        userAddress: walletAddress,
      };

      if (marketId) {
        params.marketId = marketId;
      }

      const response = await axios.get(`${KANA_REST_URL}/getPositions`, {
        params,
        headers: {
          "x-api-key": KANA_API_KEY,
        },
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      Logger.error(
        `Error fetching positions for ${walletAddress.substring(0, 10)}...`,
        error
      );
      return [];
    }
  }

  /**
   * Get user's current position size for a specific market and trade side
   */
  private async getUserPositionSize(
    walletAddress: string,
    marketId: string,
    tradeSide: boolean
  ): Promise<number> {
    try {
      const positions = await this.getPositions(walletAddress, marketId);

      // Find position matching market and trade side
      // tradeSide: true = LONG, false = SHORT
      // Position has: trade_side (boolean), size (string), market_id (string)
      for (const position of positions) {
        const positionMarketId = String(
          position.market_id || position.marketId || ""
        );
        const positionTradeSide =
          position.trade_side !== undefined
            ? position.trade_side
            : position.side
              ? position.side.toUpperCase() === "LONG"
              : null;

        // Match market ID and trade side
        if (positionMarketId === marketId && positionTradeSide === tradeSide) {
          const size = parseFloat(position.size || "0");
          if (size > 0) {
            Logger.info(
              `📍 Found position: Market=${marketId}, Side=${tradeSide ? "LONG" : "SHORT"}, Size=${size}`
            );
            return size;
          }
        }
      }

      Logger.warn(
        `⚠️  No position found: Market=${marketId}, Side=${tradeSide ? "LONG" : "SHORT"}`
      );
      return 0;
    } catch (error: any) {
      Logger.error(
        `Error getting position size for ${walletAddress.substring(0, 10)}...`,
        error
      );
      return 0;
    }
  }

  /**
   * Calculate smart ratio size
   * Value = User balance × percentage / 100
   * Value = Value × leverage
   * size = Value / price
   */
  private calculateSmartRatioSize(
    userBalance: number,
    percentage: number,
    price: number,
    leverage: number
  ): number {
    const value = (userBalance * percentage) / 100;
    const leveragedValue = value * leverage;
    const size = leveragedValue / price;
    return size;
  }

  /**
   * Submit transaction to Aptos blockchain with queuing per account
   */
  private async submitTransaction(
    account: Account,
    payloadData: any
  ): Promise<ExecutionResult> {
    const accountAddress = account.accountAddress.toString();

    // Get or create queue for this account
    const previousPromise =
      this.accountQueues.get(accountAddress) || Promise.resolve();

    // Create new promise that waits for previous transaction to complete
    const currentPromise = previousPromise
      .then(async () => {
        try {
          const transactionPayload = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: payloadData,
            options: {
              maxGasAmount: 10000,
              gasUnitPrice: 100,
            },
          });

          Logger.info(`🔐 Signing and submitting transaction...`);
          Logger.info(`  Sender: ${account.accountAddress.toString()}`);
          Logger.info(`  Gas: maxGasAmount=10000, gasUnitPrice=100`);

          const committedTxn = await aptos.transaction.signAndSubmitTransaction(
            {
              transaction: transactionPayload,
              signer: account,
            }
          );

          Logger.info(`📤 Transaction submitted: ${committedTxn.hash}`);
          Logger.info(`⏳ Waiting for confirmation...`);

          // Wait for transaction with timeout
          const executedTxn = (await Promise.race([
            aptos.waitForTransaction({
              transactionHash: committedTxn.hash,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Transaction timeout")), 30000)
            ),
          ])) as any;

          if (!executedTxn.success) {
            const errorMessage =
              executedTxn.vm_status ||
              executedTxn.error?.message ||
              executedTxn.message ||
              "Transaction failed";

            // Categorize error
            if (
              errorMessage.includes("E_INSUFFICIENT_BALANCE") ||
              errorMessage.includes("E_TRADE_SIZE_EXCEEDS") ||
              errorMessage.includes("E_LEVERAGE_MISMATCH")
            ) {
              return {
                success: false,
                error: `Business logic error: ${errorMessage}`,
              };
            }

            return { success: false, error: errorMessage };
          }

          return {
            success: true,
            txHash: committedTxn.hash,
          };
        } catch (error: any) {
          // Handle "already in mempool" error - wait and retry once
          if (
            error.message?.includes("already in mempool") ||
            error.message?.includes("invalid_transaction_update")
          ) {
            Logger.warn(
              `Transaction conflict for ${accountAddress.substring(0, 10)}..., waiting...`
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Retry once after delay
            try {
              const transactionPayload = await aptos.transaction.build.simple({
                sender: account.accountAddress,
                data: payloadData,
                options: {
                  maxGasAmount: 10000,
                  gasUnitPrice: 100,
                },
              });

              const committedTxn =
                await aptos.transaction.signAndSubmitTransaction({
                  transaction: transactionPayload,
                  signer: account,
                });

              const executedTxn = await aptos.waitForTransaction({
                transactionHash: committedTxn.hash,
              });

              if (!executedTxn.success) {
                const txResult = executedTxn as any;
                return {
                  success: false,
                  error:
                    txResult.vm_status ||
                    txResult.message ||
                    "Transaction failed after retry",
                };
              }

              return {
                success: true,
                txHash: committedTxn.hash,
              };
            } catch (retryError: any) {
              return {
                success: false,
                error: retryError.message || "Transaction failed after retry",
              };
            }
          }

          return {
            success: false,
            error: error.message || "Transaction submission failed",
          };
        }
      })
      .finally(() => {
        // Remove from queue after completion
        if (this.accountQueues.get(accountAddress) === currentPromise) {
          this.accountQueues.delete(accountAddress);
        }
      });

    // Update queue
    this.accountQueues.set(accountAddress, currentPromise);

    return currentPromise;
  }

  /**
   * Place market order
   */
  private async placeMarketOrder(
    account: Account,
    params: OrderParams
  ): Promise<ExecutionResult> {
    try {
      const queryParams = new URLSearchParams({
        marketId: params.marketId,
        tradeSide: params.tradeSide.toString(),
        direction: params.direction.toString(),
        size: params.size.toString(),
        leverage: params.leverage.toString(),
      });

      Logger.info("\n" + "=".repeat(80));
      Logger.info(`📤 KANA LABS API - PLACE MARKET ORDER`);
      Logger.info("=".repeat(80));
      Logger.info(`  API URL      : ${KANA_REST_URL}/placeMarketOrder`);
      Logger.info(`  Method       : GET`);
      Logger.info(`  Parameters   :`);
      Logger.info(`    - marketId  : ${params.marketId}`);
      Logger.info(
        `    - tradeSide : ${params.tradeSide} (${params.tradeSide ? "LONG" : "SHORT"})`
      );
      Logger.info(
        `    - direction : ${params.direction} (${params.direction ? "CLOSE" : "OPEN"})`
      );
      Logger.info(`    - size      : ${params.size}`);
      Logger.info(`    - leverage  : ${params.leverage}`);
      Logger.info(`  Query String : ${queryParams.toString()}`);
      Logger.info("=".repeat(80) + "\n");

      const response = await axios.get(
        `${KANA_REST_URL}/placeMarketOrder?${queryParams.toString()}`,
        {
          headers: {
            "x-api-key": KANA_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.success || !response.data.data) {
        Logger.error(
          `❌ API Error: ${response.data.message || "Failed to get market order payload"}`
        );
        return {
          success: false,
          error: response.data.message || "Failed to get market order payload",
        };
      }

      Logger.info(`✅ API Response received:`);
      Logger.info(`  Function: ${response.data.data.function || "N/A"}`);
      Logger.info(
        `  Function Arguments: ${JSON.stringify(response.data.data.functionArguments || []).substring(0, 200)}...`
      );
      Logger.info("");

      return this.submitTransaction(account, response.data.data);
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to place market order",
      };
    }
  }

  /**
   * Place limit order
   */
  private async placeLimitOrder(
    account: Account,
    params: OrderParams
  ): Promise<ExecutionResult> {
    try {
      if (!params.price) {
        return {
          success: false,
          error: "Price is required for limit orders",
        };
      }

      const queryParams = new URLSearchParams({
        marketId: params.marketId,
        tradeSide: params.tradeSide.toString(),
        direction: params.direction.toString(),
        size: params.size.toString(),
        price: params.price.toString(),
        leverage: params.leverage.toString(),
      });

      if (params.restriction !== undefined) {
        queryParams.append("restriction", params.restriction.toString());
      }

      Logger.info("\n" + "=".repeat(80));
      Logger.info(`📤 KANA LABS API - PLACE LIMIT ORDER`);
      Logger.info("=".repeat(80));
      Logger.info(`  API URL      : ${KANA_REST_URL}/placeLimitOrder`);
      Logger.info(`  Method       : GET`);
      Logger.info(`  Parameters   :`);
      Logger.info(`    - marketId    : ${params.marketId}`);
      Logger.info(
        `    - tradeSide   : ${params.tradeSide} (${params.tradeSide ? "LONG" : "SHORT"})`
      );
      Logger.info(
        `    - direction   : ${params.direction} (${params.direction ? "CLOSE" : "OPEN"})`
      );
      Logger.info(`    - size        : ${params.size}`);
      Logger.info(`    - price       : ${params.price}`);
      Logger.info(`    - leverage    : ${params.leverage}`);
      if (params.restriction !== undefined) {
        Logger.info(`    - restriction : ${params.restriction}`);
      }
      Logger.info(`  Query String : ${queryParams.toString()}`);
      Logger.info("=".repeat(80) + "\n");

      const response = await axios.get(
        `${KANA_REST_URL}/placeLimitOrder?${queryParams.toString()}`,
        {
          headers: {
            "x-api-key": KANA_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.success || !response.data.data) {
        Logger.error(
          `❌ API Error: ${response.data.message || "Failed to get limit order payload"}`
        );
        return {
          success: false,
          error: response.data.message || "Failed to get limit order payload",
        };
      }

      Logger.info(`✅ API Response received:`);
      Logger.info(`  Function: ${response.data.data.function || "N/A"}`);
      Logger.info(
        `  Function Arguments: ${JSON.stringify(response.data.data.functionArguments || []).substring(0, 200)}...`
      );
      Logger.info("");

      return this.submitTransaction(account, response.data.data);
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to place limit order",
      };
    }
  }

  /**
   * Execute trade for a subscriber
   */
  async executeTrade(
    userAddress: string,
    orderType: string,
    params: OrderParams
  ): Promise<ExecutionResult> {
    try {
      // Get user ID and private key
      const userId = await this.getUserIdFromWalletAddress(userAddress);
      if (!userId) {
        return {
          success: false,
          error: "User ID not found",
        };
      }

      const privateKey = await this.getPrivateKeyForUser(userId);
      if (!privateKey) {
        return {
          success: false,
          error: "Private key not found",
        };
      }

      // Create account and check balance
      const account = this.createAccount(privateKey);
      const hasBalance = await this.checkBalance(account);
      if (!hasBalance) {
        return {
          success: false,
          error: "Insufficient APT for gas fees",
        };
      }

      // Calculate size based on order direction
      let finalSize = params.size;

      if (params.direction) {
        // CLOSE order - use 100% of user's current position
        const userPositionSize = await this.getUserPositionSize(
          userAddress,
          params.marketId,
          params.tradeSide
        );

        if (userPositionSize > 0) {
          finalSize = userPositionSize;

          Logger.info("\n" + "=".repeat(80));
          Logger.info(
            `🔒 CLOSE ORDER - POSITION SIZE for ${userAddress.substring(0, 10)}...`
          );
          Logger.info("=".repeat(80));
          Logger.info(`  Order Type           : CLOSE`);
          Logger.info(`  Market ID            : ${params.marketId}`);
          Logger.info(
            `  Trade Side           : ${params.tradeSide ? "LONG" : "SHORT"}`
          );
          Logger.info(
            `  User Position Size   : ${userPositionSize.toFixed(6)}`
          );
          Logger.info(
            `  Closing 100%         : ${userPositionSize.toFixed(6)}`
          );
          Logger.info(`  Original Size        : ${params.size}`);
          Logger.info(`  Final Size (used)    : ${finalSize.toFixed(6)}`);
          Logger.info("=".repeat(80) + "\n");
        } else {
          Logger.warn(
            `⚠️  No position found for ${userAddress.substring(0, 10)}... (Market: ${params.marketId}, Side: ${params.tradeSide ? "LONG" : "SHORT"}), using original size: ${params.size}`
          );
        }
      } else if (params.percentage && params.price) {
        // OPEN order - use smart ratio calculation
        const tradingBalance = await this.getTradingBalance(userAddress);
        if (tradingBalance > 0) {
          const calculatedValue = (tradingBalance * params.percentage) / 100;
          const leveragedValue = calculatedValue * params.leverage;
          finalSize = this.calculateSmartRatioSize(
            tradingBalance,
            params.percentage,
            params.price,
            params.leverage
          );

          Logger.info("\n" + "=".repeat(80));
          Logger.info(
            `💡 SMART RATIO CALCULATION for ${userAddress.substring(0, 10)}...`
          );
          Logger.info("=".repeat(80));
          Logger.info(`  Order Type           : OPEN`);
          Logger.info(
            `  User Trading Balance : ${tradingBalance.toFixed(2)} USDT`
          );
          Logger.info(`  Percentage           : ${params.percentage}%`);
          Logger.info(`  Leverage             : ${params.leverage}x`);
          Logger.info(`  Price                : ${params.price}`);
          Logger.info(
            `  ──────────────────────────────────────────────────────────`
          );
          Logger.info(
            `  Step 1 - Value       : ${tradingBalance.toFixed(2)} × ${params.percentage}% / 100`
          );
          Logger.info(
            `  Calculated Value     : ${calculatedValue.toFixed(6)} USDT`
          );
          Logger.info(
            `  Step 2 - Leverage    : ${calculatedValue.toFixed(6)} × ${params.leverage}`
          );
          Logger.info(
            `  Leveraged Value      : ${leveragedValue.toFixed(6)} USDT`
          );
          Logger.info(
            `  Step 3 - Size        : ${leveragedValue.toFixed(6)} / ${params.price}`
          );
          Logger.info(`  Calculated Size      : ${finalSize.toFixed(6)}`);
          Logger.info(`  Original Size        : ${params.size}`);
          Logger.info(`  Final Size (used)    : ${finalSize.toFixed(6)}`);
          Logger.info("=".repeat(80) + "\n");
        } else {
          Logger.warn(
            `⚠️  Trading balance is 0 for ${userAddress.substring(0, 10)}..., using original size: ${params.size}`
          );
        }
      } else {
        Logger.info(
          `📊 Using original size: ${params.size} (no percentage/price for smart ratio)`
        );
      }

      // Update params with calculated size
      const finalParams = { ...params, size: finalSize };

      // Place order based on type
      if (orderType === "MARKET") {
        return this.placeMarketOrder(account, finalParams);
      }
      if (orderType === "LIMIT") {
        return this.placeLimitOrder(account, finalParams);
      }
      return {
        success: false,
        error: `Unknown order type: ${orderType}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Trade execution failed",
      };
    }
  }
}

export const orderExecutionService = new OrderExecutionService();
