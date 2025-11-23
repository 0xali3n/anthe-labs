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

      // Connect WebSocket first (needed even if no addresses yet)
      await this.connectWebSocket();

      // Get profile addresses for all wallets (if any)
      if (targetWalletAddresses.length > 0) {
        await this.getProfileAddressesForWallets(targetWalletAddresses);
        this.subscribeToAllWallets();
      }

      this.isMonitoring = true;
      Logger.success(
        `Order history monitoring started${targetWalletAddresses.length > 0 ? ` for ${targetWalletAddresses.length} wallet(s)` : " (waiting for addresses from Redis)"}!`
      );
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

    Logger.info(
      `🔍 Resolving profile addresses for ${unresolved.length} wallet(s)...`
    );

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

    Logger.success(
      `✅ Resolved ${successful}/${unresolved.length} profile address(es)`
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
          // Resubscribe to all wallets after reconnection
          if (this.walletToProfile.size > 0) {
            this.subscribeToAllWallets();
          }
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
        topic: "order_history",
        address: profileAddress,
        from_timestamp: timestamp,
      });
      this.ws.send(subscriptionMessage);
    }

    Logger.success(`✅ Subscribed to ${this.walletToProfile.size} wallet(s)`);
  }

  private handleMessage(message: string): void {
    // Fast path: check message type before parsing
    if (
      !message.includes('"message":"order_history"') ||
      !message.includes('"data"')
    ) {
      return;
    }

    try {
      const data = JSON.parse(message) as {
        message?: string;
        data?: OrderData[];
      };

      if (data.message === "order_history" && data.data?.length) {
        // Process synchronously for lower latency
        this.processOrders(data.data);
      }
    } catch (error) {
      Logger.error("Error parsing WebSocket message", error);
    }
  }

  private processOrders(orders: OrderData[]): void {
    if (!orders.length) return;

    // Fast path: single order processing
    if (orders.length === 1) {
      const order = orders[0];
      // Early exit checks
      if (this.trackedOrders.has(order.order_id)) return;

      const orderTimestamp = parseInt(order.timestamp, 10);
      if (orderTimestamp < this.serviceStartTime) return;

      if (!this.profileToWallet.has(order.address)) return;

      this.trackedOrders.add(order.order_id);
      this.displayOrder(order);
      return;
    }

    // Batch processing for multiple orders
    const orderMap = new Map<string, OrderData>();
    for (const order of orders) {
      const existing = orderMap.get(order.order_id);
      if (!existing) {
        orderMap.set(order.order_id, order);
      } else if (order.status === "Filled" && existing.status !== "Filled") {
        orderMap.set(order.order_id, order);
      }
    }

    // Pre-parse timestamps and filter in single pass
    const newOrders: OrderData[] = [];
    for (const order of orderMap.values()) {
      // Fast rejection checks
      if (this.trackedOrders.has(order.order_id)) continue;

      const orderTimestamp = parseInt(order.timestamp, 10);
      if (orderTimestamp < this.serviceStartTime) continue;

      if (!this.profileToWallet.has(order.address)) continue;

      newOrders.push(order);
      this.trackedOrders.add(order.order_id);
    }

    if (newOrders.length === 0) return;

    // Log only if significant
    if (newOrders.length <= LOG_CONFIG.MAX_ORDERS_FOR_VERBOSE_LOG) {
      Logger.info(`📊 Processing ${newOrders.length} NEW orders...`);
    }

    // Process all new orders
    for (const order of newOrders) {
      this.displayOrder(order);
    }
  }

  private displayOrder(order: OrderData): void {
    // Cache lookups
    const ts = parseInt(order.timestamp, 10);
    const info = this.getOrderTypeInfo(order.order_type);
    const walletAddress = this.profileToWallet.get(order.address) || "Unknown";
    const market = MARKETS[order.market_id] || `Market ${order.market_id}`;
    const typeDesc =
      ORDER_TYPE_DESCRIPTIONS[order.order_type] ||
      `Unknown (${order.order_type})`;
    const price = parseFloat(order.price).toLocaleString();

    // Build output string for single console.log (faster)
    const time = new Date(ts * 1000).toLocaleString();
    const action = info.isBuy
      ? "🟢 ACTION: BUY (LONG)"
      : info.isSell
        ? "🔴 ACTION: SELL (SHORT)"
        : info.isExit
          ? "🟡 ACTION: EXIT"
          : "❓ ACTION: UNKNOWN";

    console.log(
      `\n${"=".repeat(80)}\n` +
        `🎯 NEW ORDER DETECTED\n` +
        `${"=".repeat(80)}\n` +
        `👤 Wallet: ${walletAddress}\n` +
        `📅 Time: ${time}\n` +
        `🆔 Order ID: ${order.order_id}\n` +
        `📊 Market: ${market} (ID: ${order.market_id})\n` +
        `📈 Type: ${typeDesc}\n` +
        `💰 Price: $${price}\n` +
        `📏 Size: ${order.size} | ⚡ Leverage: ${order.leverage}x\n` +
        `📊 Status: ${order.status}\n` +
        `📍 Profile Address: ${order.address}\n` +
        `${action}\n` +
        (config.nodeEnv !== "production"
          ? `🔍 Analysis: ${JSON.stringify({ isBuy: info.isBuy, isSell: info.isSell, isExit: info.isExit, isLong: info.isLong, isShort: info.isShort })}\n`
          : "") +
        `${"=".repeat(80)}\n`
    );
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
            topic: "order_history",
            address: profileAddress,
            from_timestamp: Math.floor(Date.now() / 1000),
          })
        );
        Logger.success(
          `✅ Added and subscribed to wallet ${walletAddress.substring(0, 10)}...`
        );
      }
    }
  }

  removeWallet(walletAddress: string): void {
    const profileAddress = this.walletToProfile.get(walletAddress);
    if (profileAddress) {
      this.walletToProfile.delete(walletAddress);
      this.profileToWallet.delete(profileAddress);
      Logger.info(
        `🗑️ Removed wallet ${walletAddress.substring(0, 10)}... (profile: ${profileAddress.substring(0, 10)}...) from monitoring`
      );
      Logger.info(
        `   Future orders from this address will be ignored. Currently monitoring ${this.walletToProfile.size} wallet(s)`
      );
    } else {
      Logger.warn(
        `Wallet ${walletAddress.substring(0, 10)}... was not being monitored`
      );
    }
  }

  getMonitoredWallets(): string[] {
    return Array.from(this.walletToProfile.keys());
  }
}

// Export singleton instance
export const orderHistoryService = new OrderHistoryService();
