import WebSocket from "ws";
import { config } from "../config";
import { Logger } from "../utils/logger";
import { WEBSOCKET_CONFIG } from "../constants";
import type { OrderData, ServiceStatus } from "../types";
import { redisService } from "./redis.service";

export class OrderHistoryService {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private serviceStartTime: number = 0;
  private isStopped: boolean = false;

  public isMonitoring: boolean = false;
  // Map: walletAddress -> profileAddress
  private walletToProfile: Map<string, string> = new Map();
  // Map: profileAddress -> walletAddress (reverse lookup)
  private profileToWallet: Map<string, string> = new Map();
  // Track recently processed transaction versions (TTL: 5 minutes)
  private processedTransactions: Map<string, number> = new Map();

  async startMonitoring(targetWalletAddresses: string[]): Promise<void> {
    try {
      this.isStopped = false;
      this.serviceStartTime =
        Math.floor(Date.now() / 1000) - WEBSOCKET_CONFIG.SERVICE_START_BUFFER;

      // Connect WebSocket first (needed even if no addresses yet)
      await this.connectWebSocket();

      // Get profile addresses for all wallets (if any)
      if (targetWalletAddresses.length > 0) {
        await this.getProfileAddressesForWallets(targetWalletAddresses);
        this.subscribeToAllWallets();
      }

      this.isMonitoring = true;
    } catch (error) {
      Logger.error("Failed to start order history monitoring", error);
      throw error;
    }
  }

  private async getProfileAddressesForWallets(
    walletAddresses: string[]
  ): Promise<void> {
    // Filter out already resolved addresses
    const unresolved = walletAddresses.filter(
      (addr) => !this.walletToProfile.has(addr)
    );
    if (unresolved.length === 0) return;

    // Parallel fetch with optimized headers
    const headers = {
      "x-api-key": config.kanaApiKey,
      "Content-Type": "application/json",
    };
    const baseUrl = `${config.kanaRestUrl}/getProfileAddress?userAddress=`;

    const promises = unresolved.map(async (walletAddress) => {
      try {
        const response = await fetch(baseUrl + walletAddress, { headers });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as {
          success?: boolean;
          data?: string;
          message?: string;
        };

        if (data?.success && data.data) {
          this.walletToProfile.set(walletAddress, data.data);
          this.profileToWallet.set(data.data, walletAddress);
          return { success: true };
        } else {
          throw new Error(data?.message || "Unknown error");
        }
      } catch (error) {
        Logger.error(
          `❌ Failed to get profile for wallet ${walletAddress.substring(0, 10)}...`,
          error
        );
        return { success: false, error };
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter((r) => r.success).length;

    if (successful === 0) {
      throw new Error("Failed to resolve profile addresses for any wallet");
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(config.kanaWsUrl);
        let isResolved = false;

        this.ws.on("open", () => {
          this.reconnectAttempts = 0;
          this.startPingInterval();
          // Resubscribe to all wallets after reconnection
          if (this.walletToProfile.size > 0) {
            this.subscribeToAllWallets();
          }
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        });

        this.ws.on("message", (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on("close", () => {
          this.stopPingInterval();
          if (
            !this.isStopped &&
            this.reconnectAttempts < WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS
          ) {
            this.scheduleReconnect();
          }
        });

        this.ws.on("error", (error: Error) => {
          Logger.error("WebSocket error", error);
          // Only reject if connection hasn't been established yet
          if (!isResolved) {
            isResolved = true;
            reject(error);
          }
        });

        this.ws.on("pong", () => {
          // Pong received - connection is alive
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private subscribeToAllWallets(): void {
    if (
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      this.walletToProfile.size === 0
    ) {
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Batch send subscriptions for lower latency
    for (const profileAddress of this.walletToProfile.values()) {
      const subscriptionMessage = JSON.stringify({
        topic: "order_history_v2",
        address: profileAddress,
        from_timestamp: timestamp,
      });
      this.ws.send(subscriptionMessage);
    }
  }

  private handleMessage(message: string): void {
    // Fast path: check message type before parsing
    // Only process order_history_v2 (skip snapshots)
    if (
      !message.includes('"message":"order_history_v2"') ||
      !message.includes('"data"')
    ) {
      return;
    }

    try {
      const data = JSON.parse(message) as {
        message?: string;
        type?: string;
        data?: OrderData | OrderData[];
      };

      // Skip snapshot messages - only process new orders
      if (data.type === "snapshot") {
        Logger.debug("Skipping snapshot message");
        return;
      }

      if (data.message === "order_history_v2" && data.data) {
        // Handle both single object and array formats
        let orders: OrderData[] = [];
        
        if (Array.isArray(data.data)) {
          orders = data.data;
        } else {
          // Single object - convert to array
          orders = [data.data];
        }
        
        if (orders.length > 0) {
          // Process orders (now async to check Redis)
          this.processOrders(orders).catch((error) => {
            Logger.error("Error processing orders", error);
          });
        }
      }
    } catch (error) {
      Logger.error("Error parsing WebSocket message", error);
    }
  }

  private async processOrders(orders: OrderData[]): Promise<void> {
    if (!orders.length) return;

    const processedInBatch = new Set<string>();
    const validOrders: OrderData[] = [];
    const now = Date.now();
    const TTL_MS = 5 * 60 * 1000; // 5 minutes

    // Clean up old entries from processedTransactions
    for (const [txVersion, timestamp] of this.processedTransactions.entries()) {
      if (now - timestamp > TTL_MS) {
        this.processedTransactions.delete(txVersion);
      }
    }

    // Filter and validate orders first
    for (const order of orders) {
      // Fast filters
      if (!this.profileToWallet.has(order.address)) continue;
      if (order.status !== "Open") continue;

      const orderTimestamp = parseInt(String(order.timestamp), 10);
      if (orderTimestamp < this.serviceStartTime) continue;

      // Deduplicate within batch and across recent messages
      const transactionVersion = String(
        order.transaction_version || order.order_id
      );

      // Skip if already processed in this batch
      if (processedInBatch.has(transactionVersion)) continue;

      // Skip if recently processed (within last 5 minutes)
      if (this.processedTransactions.has(transactionVersion)) {
        Logger.debug(`Skipping duplicate order: ${transactionVersion}`);
        continue;
      }

      processedInBatch.add(transactionVersion);
      this.processedTransactions.set(transactionVersion, now);
      validOrders.push(order);
    }

    // Process valid orders
    for (const order of validOrders) {
      // Display in console (only in dev mode)
      this.displayOrder(order);

      // Push to Redis (with additional deduplication check)
      try {
        // Check Redis for existing entry before adding
        const transactionVersion = String(
          order.transaction_version || order.order_id
        );
        const exists =
          await redisService.transactionVersionExists(transactionVersion);

        if (exists) {
          Logger.debug(`Order already exists in Redis: ${transactionVersion}`);
          continue;
        }

        // Convert order to optimized format for trade service
        const orderType = order.order_type;
        
        // Get wallet address from profile address (order.address is profile address)
        // We need to push WALLET address to Redis, not profile address
        const profileAddress = order.address;
        const walletAddress = this.profileToWallet.get(profileAddress) || profileAddress;
        
        // Map order_type (1-8) to optimized format
        // Order types: 1=OPEN_LONG, 2=OPEN_SHORT, 3=INCREASE_LONG, 4=INCREASE_SHORT,
        //              5=DECREASE_LONG, 6=DECREASE_SHORT, 7=CLOSE_LONG, 8=CLOSE_SHORT
        const optimizedOrder = this.convertOrderToOptimizedFormat(order);

        const orderData: Record<string, string> = {
          // Core optimized fields
          address: walletAddress, // Use WALLET address, not profile address
          orderType: optimizedOrder.orderType, // "MARKET", "LIMIT", or "STOP"
          tradeSide: optimizedOrder.tradeSide, // "true" or "false"
          direction: optimizedOrder.direction, // "false" (open/increase) or "true" (close/decrease)
          marketId: order.market_id,
          size: order.size,
          leverage: String(order.leverage),
          
          // Optional fields
          ...(order.price && { price: order.price }),
          ...(order.order_value && { order_value: order.order_value }),
          ...(order.order_id && { order_id: String(order.order_id) }),
          ...(order.timestamp && { timestamp: String(order.timestamp) }),
          ...(order.transaction_version && { transaction_version: String(order.transaction_version) }),
        };

        // Log optimized format being pushed to Redis
        Logger.info(
          `📤 Pushing optimized order to Redis: Wallet=${walletAddress.substring(0, 10)}..., orderType=${optimizedOrder.orderType}, tradeSide=${optimizedOrder.tradeSide} (${optimizedOrder.tradeSide === "true" ? "LONG" : "SHORT"}), direction=${optimizedOrder.direction} (${optimizedOrder.direction === "true" ? "CLOSE" : "OPEN"}), marketId=${order.market_id}, size=${order.size}`
        );

        // Order types 7,8 - set percentage to 100% directly (no calculation needed)
        if (orderType === 7 || orderType === 8) {
          orderData.percentage = "100.000000";

          console.log("\n" + "=".repeat(80));
          console.log("📊 PERCENTAGE SET (Order Types 7-8)");
          console.log("=".repeat(80));
          console.log(
            `Order Type: ${orderType} (7-8, setting percentage to 100%)`
          );
          console.log(`Profile Address: ${order.address}`);
          console.log(`Market ID: ${order.market_id}`);
          console.log(`Percentage: 100.000000% (directly set, no calculation)`);
          console.log("=".repeat(80) + "\n");
        } else if (orderType >= 1 && orderType <= 4) {
          try {
            // Get wallet address from profile address
            // getProfileBalanceSnapshot requires WALLET address, not profile address
            const walletAddress = this.profileToWallet.get(order.address);

            if (!walletAddress) {
              Logger.warn(
                `Wallet address not found for profile: ${order.address}, skipping percentage calculation`
              );
            } else {
              // Fetch balance from API using WALLET address (not profile address)
              const userBalance = await this.getProfileBalance(walletAddress);

              // Get order_value and leverage
              const orderValue = parseFloat(
                String(order.order_value || order.size || "0")
              );
              const leverage = parseFloat(String(order.leverage || "1"));

              // Calculate percentage:
              // 1. user_balance = api (balance from API)
              // 2. user_trade = trade_value / leverage
              // 3. user_real_balance = api + user_trade
              // 4. percentage = user_trade / user_real_balance
              const userTrade = orderValue / leverage;
              const userRealBalance = userBalance + userTrade;
              const percentage =
                userRealBalance > 0
                  ? (userTrade / userRealBalance) * 100 // Convert to percentage (0-100)
                  : 0;

              // Add percentage to order data
              orderData.percentage = percentage.toFixed(6);

              // Display calculations in console
              console.log("\n" + "=".repeat(80));
              console.log("📊 PERCENTAGE CALCULATION");
              console.log("=".repeat(80));
              console.log(
                `Order Type: ${orderType} (1-4, calculating percentage)`
              );
              console.log(`Wallet Address: ${walletAddress}`);
              console.log(`Profile Address: ${order.address}`);
              console.log(`User Balance (from API): ${userBalance}`);
              console.log(`Order Value: ${orderValue}`);
              console.log(`Leverage: ${leverage}`);
              console.log(
                `User Trade = ${orderValue} / ${leverage} = ${userTrade.toFixed(6)}`
              );
              console.log(
                `User Real Balance = ${userBalance} + ${userTrade.toFixed(6)} = ${userRealBalance.toFixed(6)}`
              );
              console.log(
                `Percentage = ${userTrade.toFixed(6)} / ${userRealBalance.toFixed(6)} = ${percentage.toFixed(6)}%`
              );
              console.log("=".repeat(80) + "\n");
            }
          } catch (error) {
            Logger.error(
              `Failed to calculate percentage for order ${transactionVersion}`,
              error
            );
            // Continue without percentage if calculation fails
          }
        } else if (orderType === 5 || orderType === 6) {
          // Order types 5,6,7,8 - fetch positions and display
          try {
            // Get wallet address from profile address
            const walletAddress = this.profileToWallet.get(order.address);

            if (!walletAddress) {
              Logger.warn(
                `Wallet address not found for profile: ${order.address}, skipping positions fetch`
              );
            } else {
              // Fetch positions from API using WALLET address
              const positions = await this.getPositions(
                walletAddress,
                order.market_id
              );

              // Find position matching the order's market_id
              const position = Array.isArray(positions)
                ? positions.find((p: any) => p.market_id === order.market_id)
                : null;

              if (!position) {
                Logger.warn(
                  `Position not found for market ${order.market_id}, skipping percentage calculation`
                );
                console.log("\n" + "=".repeat(80));
                console.log("📊 POSITIONS API RESPONSE (Order Types 5-8)");
                console.log("=".repeat(80));
                console.log(
                  `Order Type: ${orderType} (5-8, fetching positions)`
                );
                console.log(`Wallet Address: ${walletAddress}`);
                console.log(`Profile Address: ${order.address}`);
                console.log(`Market ID: ${order.market_id}`);
                console.log("\nPositions Response:");
                console.log(JSON.stringify(positions, null, 2));
                console.log("=".repeat(80) + "\n");
              } else {
                // Calculate percentage:
                // total_size = ws_order.size + api_position.available_order_size
                // percentage = ws_order.size / total_size
                const wsOrderSize = parseFloat(String(order.size || "0"));
                const availableOrderSize = parseFloat(
                  String(position.available_order_size || "0")
                );
                const totalSize = wsOrderSize + availableOrderSize;
                const percentage =
                  totalSize > 0
                    ? (wsOrderSize / totalSize) * 100 // Convert to percentage (0-100)
                    : 0;

                // Add percentage to order data
                orderData.percentage = percentage.toFixed(6);

                // Display calculations in console
                console.log("\n" + "=".repeat(80));
                console.log("📊 PERCENTAGE CALCULATION (Order Types 5-8)");
                console.log("=".repeat(80));
                console.log(
                  `Order Type: ${orderType} (5-8, calculating percentage)`
                );
                console.log(`Wallet Address: ${walletAddress}`);
                console.log(`Profile Address: ${order.address}`);
                console.log(`Market ID: ${order.market_id}`);
                console.log(`WS Order Size: ${wsOrderSize}`);
                console.log(`API Available Order Size: ${availableOrderSize}`);
                console.log(
                  `Total Size = ${wsOrderSize} + ${availableOrderSize} = ${totalSize.toFixed(6)}`
                );
                console.log(
                  `Percentage = ${wsOrderSize} / ${totalSize.toFixed(6)} = ${percentage.toFixed(6)}%`
                );
                console.log("\nPosition Details:");
                console.log(JSON.stringify(position, null, 2));
                console.log("=".repeat(80) + "\n");
              }
            }
          } catch (error) {
            Logger.error(
              `Failed to fetch positions for order ${transactionVersion}`,
              error
            );
            // Continue processing even if positions fetch fails
          }
        }

        await redisService.addOrderToStream(orderData);
      } catch (error) {
        Logger.error(`Failed to push order to Redis`, error);
        // Continue processing other orders even if one fails
      }
    }
  }

  /**
   * Convert order to optimized format for trade service
   * Maps order_type (1-8) to orderType, tradeSide, and direction
   * 
   * Order Types:
   * 1 = OPEN_LONG
   * 2 = OPEN_SHORT
   * 3 = INCREASE_LONG
   * 4 = INCREASE_SHORT
   * 5 = DECREASE_LONG
   * 6 = DECREASE_SHORT
   * 7 = CLOSE_LONG
   * 8 = CLOSE_SHORT
   */
  private convertOrderToOptimizedFormat(order: OrderData): {
    orderType: string; // "MARKET", "LIMIT", or "STOP"
    tradeSide: string; // "true" (long) or "false" (short)
    direction: string; // "false" (open/increase) or "true" (close/decrease)
  } {
    const orderType = order.order_type;
    
    // Determine tradeSide (long/short)
    // Types 1,3,5,7 = LONG (true)
    // Types 2,4,6,8 = SHORT (false)
    const tradeSide = (orderType === 1 || orderType === 3 || orderType === 5 || orderType === 7) 
      ? "true" 
      : "false";
    
    // Determine direction (open/close)
    // Types 1,2,3,4 = OPEN/INCREASE (false = open position)
    // Types 5,6,7,8 = DECREASE/CLOSE (true = close position)
    const direction = (orderType >= 5 && orderType <= 8) 
      ? "true" 
      : "false";
    
    // Determine orderType (MARKET, LIMIT, or STOP)
    // Priority: Check is_market_order field first, then price field, then stop fields
    let orderTypeStr = "MARKET"; // Default to MARKET
    
    // Check for is_market_order field (most reliable)
    if ((order as any).is_market_order !== undefined) {
      const isMarket = (order as any).is_market_order === true || 
                       (order as any).is_market_order === "true" || 
                       (order as any).is_market_order === 1 ||
                       (order as any).is_market_order === "1";
      orderTypeStr = isMarket ? "MARKET" : "LIMIT";
    }
    // Check for stop-related fields
    else if ((order as any).stop_price || (order as any).trigger_price || (order as any).stopPrice) {
      orderTypeStr = "STOP";
    }
    // Check if price field exists and is valid (indicates LIMIT order)
    else if (order.price && order.price !== "0" && order.price !== "" && parseFloat(order.price) > 0) {
      orderTypeStr = "LIMIT";
    }
    // Default to MARKET if we can't determine
    
    Logger.debug(
      `Converted order_type ${orderType} to: orderType=${orderTypeStr}, tradeSide=${tradeSide}, direction=${direction}`
    );
    
    return {
      orderType: orderTypeStr,
      tradeSide,
      direction,
    };
  }

  private displayOrder(order: OrderData): void {
    // Only log in development mode to reduce production noise
    if (process.env.NODE_ENV !== "production") {
      console.log("\n" + "=".repeat(80));
      console.log("🎯 NEW ORDER");
      console.log("=".repeat(80));
      console.log(JSON.stringify(order, null, 2));
      console.log("=".repeat(80) + "\n");
    }
  }

  /**
   * Fetch positions from Kana Labs API
   * Note: This API requires WALLET address, not profile address
   * @param walletAddress - The wallet address (not profile address)
   * @param marketId - Optional market ID to filter positions
   */
  private async getPositions(
    walletAddress: string,
    marketId?: string
  ): Promise<any> {
    try {
      let url = `${config.kanaRestUrl}/getPositions?userAddress=${walletAddress}`;
      if (marketId) {
        url += `&marketId=${marketId}`;
      }

      const response = await fetch(url, {
        headers: {
          "x-api-key": config.kanaApiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as {
        success?: boolean;
        data?: any;
        message?: string;
      };

      if (data?.success) {
        return data.data || [];
      } else {
        throw new Error(data?.message || "Invalid response format");
      }
    } catch (error) {
      Logger.error(
        `Failed to fetch positions for wallet ${walletAddress.substring(0, 10)}...`,
        error
      );
      throw error;
    }
  }

  /**
   * Fetch profile balance from Kana Labs API
   * Note: This API requires WALLET address, not profile address
   * @param walletAddress - The wallet address (not profile address)
   */
  private async getProfileBalance(walletAddress: string): Promise<number> {
    try {
      const url = `${config.kanaRestUrl}/getProfileBalanceSnapshot?userAddress=${walletAddress}`;
      const response = await fetch(url, {
        headers: {
          "x-api-key": config.kanaApiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as {
        success?: boolean;
        data?: number;
        message?: string;
      };

      if (data?.success && typeof data.data === "number") {
        return data.data;
      } else {
        throw new Error(data?.message || "Invalid response format");
      }
    } catch (error) {
      Logger.error(
        `Failed to fetch balance for wallet ${walletAddress.substring(0, 10)}...`,
        error
      );
      throw error;
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, WEBSOCKET_CONFIG.PING_INTERVAL);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = WEBSOCKET_CONFIG.RECONNECT_DELAY * this.reconnectAttempts;

    setTimeout(() => {
      this.connectWebSocket().catch((error) => {
        Logger.error("Reconnection failed", error);
      });
    }, delay);
  }

  stopMonitoring(): void {
    this.isStopped = true;
    this.stopPingInterval();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.isMonitoring = false;
    this.reconnectAttempts = 0;
    this.walletToProfile.clear();
    this.profileToWallet.clear();
  }

  getStatus(): ServiceStatus {
    return {
      isMonitoring: this.isMonitoring,
      monitoredWalletsCount: this.walletToProfile.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Public methods for dynamic wallet management
  async addWallet(walletAddress: string): Promise<void> {
    // Fast path: check if already monitoring
    if (this.walletToProfile.has(walletAddress)) {
      return;
    }

    await this.getProfileAddressesForWallets([walletAddress]);

    // Subscribe immediately if WebSocket is ready
    if (this.ws?.readyState === WebSocket.OPEN) {
      const profileAddress = this.walletToProfile.get(walletAddress);
      if (profileAddress) {
        this.ws.send(
          JSON.stringify({
            topic: "order_history_v2",
            address: profileAddress,
            from_timestamp: Math.floor(Date.now() / 1000),
          })
        );
      }
    }
  }

  removeWallet(walletAddress: string): void {
    const profileAddress = this.walletToProfile.get(walletAddress);
    if (profileAddress) {
      // Unsubscribe from WebSocket if connected
      if (this.ws?.readyState === WebSocket.OPEN) {
        const unsubscribeMessage = JSON.stringify({
          action: "unsubscribe",
          topic: "order_history_v2",
          address: profileAddress,
        });
        this.ws.send(unsubscribeMessage);
        Logger.info(
          `➖ Unsubscribed from address: ${walletAddress.substring(0, 10)}... (profile: ${profileAddress.substring(0, 10)}...)`
        );
      }
      
      // Remove from maps
      this.walletToProfile.delete(walletAddress);
      this.profileToWallet.delete(profileAddress);
    }
  }

  getMonitoredWallets(): string[] {
    return Array.from(this.walletToProfile.keys());
  }
}

// Export singleton instance
export const orderHistoryService = new OrderHistoryService();
