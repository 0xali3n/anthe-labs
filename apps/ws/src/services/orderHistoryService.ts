import WebSocket from "ws";
import { config } from "../config";
import { Logger } from "../utils/logger";
import {
  ORDER_TYPE_DESCRIPTIONS,
  MARKETS,
  WEBSOCKET_CONFIG,
  LOG_CONFIG,
} from "../constants";
import type { OrderData, OrderTypeInfo, ServiceStatus } from "../types";

export class OrderHistoryService {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private serviceStartTime: number = 0;

  public isMonitoring: boolean = false;
  // Map: walletAddress -> profileAddress
  private walletToProfile: Map<string, string> = new Map();
  // Map: profileAddress -> walletAddress (reverse lookup)
  private profileToWallet: Map<string, string> = new Map();
  public trackedOrders: Set<string> = new Set();

  async startMonitoring(targetWalletAddresses: string[]): Promise<void> {
    try {
      this.serviceStartTime =
        Math.floor(Date.now() / 1000) - WEBSOCKET_CONFIG.SERVICE_START_BUFFER;

      Logger.info(
        `🎯 Starting order history monitoring for ${targetWalletAddresses.length} wallet(s)`
      );

      // Get profile addresses for all wallets
      await this.getProfileAddressesForWallets(targetWalletAddresses);

      await this.connectWebSocket();
      this.subscribeToAllWallets();

      this.isMonitoring = true;
      Logger.success(
        `Order history monitoring started for ${targetWalletAddresses.length} wallet(s)!`
      );
    } catch (error) {
      Logger.error("Failed to start order history monitoring", error);
      throw error;
    }
  }

  private async getProfileAddressesForWallets(
    walletAddresses: string[]
  ): Promise<void> {
    Logger.info(
      `🔍 Resolving profile addresses for ${walletAddresses.length} wallet(s)...`
    );

    const promises = walletAddresses.map(async (walletAddress) => {
      try {
        const response = await fetch(
          `${config.kanaRestUrl}/getProfileAddress?userAddress=${walletAddress}`,
          {
            headers: {
              "x-api-key": config.kanaApiKey,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as {
          success?: boolean;
          data?: string;
          message?: string;
        };

        if (data?.success && data.data) {
          this.walletToProfile.set(walletAddress, data.data);
          this.profileToWallet.set(data.data, walletAddress);
          Logger.info(
            `✅ Wallet ${walletAddress.substring(0, 10)}... -> Profile ${data.data.substring(0, 10)}...`
          );
          return { walletAddress, profileAddress: data.data, success: true };
        } else {
          throw new Error(
            `Failed to get profile address: ${data?.message || "Unknown error"}`
          );
        }
      } catch (error) {
        Logger.error(
          `❌ Failed to get profile for wallet ${walletAddress.substring(0, 10)}...`,
          error
        );
        return { walletAddress, success: false, error };
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter((r) => r.success).length;

    if (successful === 0) {
      throw new Error("Failed to resolve profile addresses for any wallet");
    }

    Logger.success(
      `✅ Resolved ${successful}/${walletAddresses.length} profile address(es)`
    );
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        Logger.info("🔌 Connecting to Kana Labs WebSocket...");
        this.ws = new WebSocket(config.kanaWsUrl);

        this.ws.on("open", () => {
          Logger.success("WebSocket connected successfully!");
          this.reconnectAttempts = 0;
          this.startPingInterval();
          resolve();
        });

        this.ws.on("message", (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on("close", (code: number, reason: Buffer) => {
          Logger.warn(
            `WebSocket disconnected. Code: ${code}, Reason: ${reason.toString()}`
          );
          this.stopPingInterval();
          if (
            this.reconnectAttempts < WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS
          ) {
            this.scheduleReconnect();
          }
        });

        this.ws.on("error", (error: Error) => {
          Logger.error("WebSocket error", error);
          reject(error);
        });

        this.ws.on("pong", () => {
          Logger.debug("🏓 Received pong from server");
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private subscribeToAllWallets(): void {
    if (!this.ws || this.walletToProfile.size === 0) {
      Logger.error(
        "Cannot subscribe: WebSocket or profile addresses not available"
      );
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    let subscribedCount = 0;

    for (const [walletAddress, profileAddress] of this.walletToProfile) {
      const subscriptionMessage = {
        topic: "order_history",
        address: profileAddress,
        from_timestamp: timestamp,
      };

      this.ws.send(JSON.stringify(subscriptionMessage));
      subscribedCount++;
      Logger.info(
        `📡 Subscribed to wallet ${walletAddress.substring(0, 10)}... (profile: ${profileAddress.substring(0, 10)}...)`
      );
    }

    Logger.success(`✅ Subscribed to ${subscribedCount} wallet(s)`);
  }

  private handleMessage(message: string): void {
    try {
      const data = JSON.parse(message) as {
        message?: string;
        data?: OrderData[];
      };

      if (data.message === "order_history" && data.data) {
        this.processOrders(data.data).catch((error) => {
          Logger.error("Error processing orders", error);
        });
      }
    } catch (error) {
      Logger.error("Error parsing WebSocket message", error);
    }
  }

  private async processOrders(orders: OrderData[]): Promise<void> {
    // First, deduplicate within the batch - prefer "Filled" status over others
    const orderMap = new Map<string, OrderData>();
    for (const order of orders) {
      const existing = orderMap.get(order.order_id);
      if (!existing) {
        orderMap.set(order.order_id, order);
      } else if (order.status === "Filled" && existing.status !== "Filled") {
        // Prefer Filled status if we have multiple statuses for same order
        orderMap.set(order.order_id, order);
      }
    }

    // Now filter out already tracked orders and historical orders
    const newOrders = Array.from(orderMap.values()).filter((order) => {
      if (this.trackedOrders.has(order.order_id)) {
        return false;
      }

      const orderTimestamp = parseInt(order.timestamp, 10);
      if (orderTimestamp < this.serviceStartTime) {
        return false;
      }

      return true;
    });

    if (newOrders.length === 0) {
      return;
    }

    if (newOrders.length <= LOG_CONFIG.MAX_ORDERS_FOR_VERBOSE_LOG) {
      Logger.info(`📊 Processing ${newOrders.length} NEW orders...`);
    } else {
      Logger.info(
        `📊 Received ${orders.length} orders, deduplicated to ${orderMap.size}, processing ${newOrders.length} NEW orders...`
      );
    }

    for (const order of newOrders) {
      this.trackedOrders.add(order.order_id);
      this.displayOrder(order);
    }
  }

  private displayOrder(order: OrderData): void {
    const ts = parseInt(order.timestamp, 10);
    const time = new Date(ts * 1000).toLocaleString();
    const info = this.getOrderTypeInfo(order.order_type);
    const market = MARKETS[order.market_id] || `Market ${order.market_id}`;
    const typeDesc =
      ORDER_TYPE_DESCRIPTIONS[order.order_type] ||
      `Unknown (${order.order_type})`;

    // Find which wallet this order belongs to
    const walletAddress = this.profileToWallet.get(order.address) || "Unknown";

    console.log("\n" + "=".repeat(80));
    console.log("🎯 NEW ORDER DETECTED");
    console.log("=".repeat(80));
    console.log(`👤 Wallet: ${walletAddress}`);
    console.log(`📅 Time: ${time}`);
    console.log(`🆔 Order ID: ${order.order_id}`);
    console.log(`📊 Market: ${market} (ID: ${order.market_id})`);
    console.log(`📈 Type: ${typeDesc}`);
    console.log(`💰 Price: $${parseFloat(order.price).toLocaleString()}`);
    console.log(`📏 Size: ${order.size} | ⚡ Leverage: ${order.leverage}x`);
    console.log(`📊 Status: ${order.status}`);
    console.log(`📍 Profile Address: ${order.address}`);

    if (info.isBuy) console.log("🟢 ACTION: BUY (LONG)");
    else if (info.isSell) console.log("🔴 ACTION: SELL (SHORT)");
    else if (info.isExit) console.log("🟡 ACTION: EXIT");
    else console.log("❓ ACTION: UNKNOWN");

    if (config.nodeEnv !== "production") {
      console.log(`🔍 Analysis:`, {
        isBuy: info.isBuy,
        isSell: info.isSell,
        isExit: info.isExit,
        isLong: info.isLong,
        isShort: info.isShort,
      });
    }

    console.log("=".repeat(80) + "\n");
  }

  private getOrderTypeInfo(orderType: number): OrderTypeInfo {
    return {
      isBuy:
        (orderType >= 1 && orderType <= 3) ||
        (orderType >= 16 && orderType <= 18),
      isSell:
        (orderType >= 4 && orderType <= 6) ||
        (orderType >= 13 && orderType <= 15),
      isExit: orderType >= 7 && orderType <= 12,
      isLong:
        (orderType >= 1 && orderType <= 3) ||
        (orderType >= 7 && orderType <= 9) ||
        (orderType >= 16 && orderType <= 18),
      isShort:
        (orderType >= 4 && orderType <= 6) ||
        (orderType >= 10 && orderType <= 12) ||
        (orderType >= 13 && orderType <= 15),
    };
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
        if (Math.random() < LOG_CONFIG.PING_LOG_PROBABILITY) {
          Logger.debug("🏓 Connection alive (ping sent)");
        }
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

    Logger.warn(
      `Scheduling reconnection attempt ${this.reconnectAttempts}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS} in ${delay / 1000} seconds...`
    );

    setTimeout(() => {
      this.connectWebSocket().catch((error) => {
        Logger.error("Reconnection failed", error);
      });
    }, delay);
  }

  stopMonitoring(): void {
    Logger.info("🛑 Stopping order history monitoring...");
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isMonitoring = false;
    this.walletToProfile.clear();
    this.profileToWallet.clear();
    this.trackedOrders.clear();
    Logger.success("Order history monitoring stopped.");
  }

  getStatus(): ServiceStatus {
    return {
      isMonitoring: this.isMonitoring,
      targetProfileAddress:
        Array.from(this.walletToProfile.values())[0] || null,
      trackedOrdersCount: this.trackedOrders.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Public methods for dynamic wallet management (for future bot feature)
  async addWallet(walletAddress: string): Promise<void> {
    if (this.walletToProfile.has(walletAddress)) {
      Logger.warn(
        `Wallet ${walletAddress.substring(0, 10)}... already being monitored`
      );
      return;
    }

    await this.getProfileAddressesForWallets([walletAddress]);

    if (this.ws && this.walletToProfile.has(walletAddress)) {
      const profileAddress = this.walletToProfile.get(walletAddress)!;
      const subscriptionMessage = {
        topic: "order_history",
        address: profileAddress,
        from_timestamp: Math.floor(Date.now() / 1000),
      };
      this.ws.send(JSON.stringify(subscriptionMessage));
      Logger.success(
        `✅ Added and subscribed to wallet ${walletAddress.substring(0, 10)}...`
      );
    }
  }

  removeWallet(walletAddress: string): void {
    const profileAddress = this.walletToProfile.get(walletAddress);
    if (profileAddress) {
      this.walletToProfile.delete(walletAddress);
      this.profileToWallet.delete(profileAddress);
      Logger.info(
        `🗑️ Removed wallet ${walletAddress.substring(0, 10)}... from monitoring`
      );
    }
  }

  getMonitoredWallets(): string[] {
    return Array.from(this.walletToProfile.keys());
  }
}

// Export singleton instance
export const orderHistoryService = new OrderHistoryService();
