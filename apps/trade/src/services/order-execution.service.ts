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
   * Submit transaction to Aptos blockchain with queuing per account
   */
  private async submitTransaction(
    account: Account,
    payloadData: any
  ): Promise<ExecutionResult> {
    const accountAddress = account.accountAddress.toString();
    
    // Get or create queue for this account
    const previousPromise = this.accountQueues.get(accountAddress) || Promise.resolve();
    
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

          const committedTxn = await aptos.transaction.signAndSubmitTransaction({
            transaction: transactionPayload,
            signer: account,
          });

          // Wait for transaction with timeout
          const executedTxn = await Promise.race([
            aptos.waitForTransaction({
              transactionHash: committedTxn.hash,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Transaction timeout")), 30000)
            ),
          ]) as any;

          if (!executedTxn.success) {
            const errorMessage =
              executedTxn.vm_status ||
              executedTxn.error?.message ||
              executedTxn.message ||
              "Transaction failed";

            // Categorize error
            if (errorMessage.includes("E_INSUFFICIENT_BALANCE") || 
                errorMessage.includes("E_TRADE_SIZE_EXCEEDS") ||
                errorMessage.includes("E_LEVERAGE_MISMATCH")) {
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
          if (error.message?.includes("already in mempool") || 
              error.message?.includes("invalid_transaction_update")) {
            Logger.warn(`Transaction conflict for ${accountAddress.substring(0, 10)}..., waiting...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
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

              const committedTxn = await aptos.transaction.signAndSubmitTransaction({
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
                  error: txResult.vm_status || txResult.message || "Transaction failed after retry",
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
        return {
          success: false,
          error: response.data.message || "Failed to get market order payload",
        };
      }

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
        return {
          success: false,
          error: response.data.message || "Failed to get limit order payload",
        };
      }

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

      // Place order based on type
      if (orderType === "MARKET") {
        return this.placeMarketOrder(account, params);
      }
      if (orderType === "LIMIT") {
        return this.placeLimitOrder(account, params);
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

