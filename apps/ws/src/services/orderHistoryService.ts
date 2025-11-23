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

  public isMonitoring: boolean = false;
  // Map: walletAddress -> profileAddress
  private walletToProfile: Map<string, string> = new Map();
  // Map: profileAddress -> walletAddress (reverse lookup)
  private profileToWallet: Map<string, string> = new Map();

  async startMonitoring(targetWalletAddresses: string[]): Promise<void> {
    try {
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

        this.ws.on("open", () => {
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

        this.ws.on("close", () => {
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
          // Pong received
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
        // Process orders (now async to check Redis)
        this.processOrders(data.data).catch((error) => {
          Logger.error("Error processing orders", error);
        });
      }
    } catch (error) {
      Logger.error("Error parsing WebSocket message", error);
    }
  }

  private async processOrders(orders: OrderData[]): Promise<void> {
    if (!orders.length) return;

    const processedInBatch = new Set<string>();

    for (const order of orders) {
      // Fast filters
      if (!this.profileToWallet.has(order.address)) continue;
      if (order.status !== "Open") continue;

      const orderTimestamp = parseInt(order.timestamp, 10);
      if (orderTimestamp < this.serviceStartTime) continue;

      // Deduplicate within batch
      const transactionVersion = String(
        order.transaction_version || order.order_id
      );
      if (processedInBatch.has(transactionVersion)) continue;
      processedInBatch.add(transactionVersion);

      // Display in console (uses order object directly)
      this.displayOrder(order);

      // Push to Redis immediately after display (same order object, same technique)
      try {
        // Same technique as console.log - use Object.entries(order) directly
        const orderData: Record<string, string> = {};
        for (const [key, value] of Object.entries(order)) {
          orderData[key] = String(value);
        }
        await redisService.addOrderToStream(orderData);
      } catch (error) {
        Logger.error(`Failed to push order to Redis`, error);
      }
    }
  }

  private displayOrder(order: OrderData): void {
    console.log("\n" + "=".repeat(80));
    console.log("🎯 NEW ORDER");
    console.log("=".repeat(80));
    console.log(JSON.stringify(order, null, 2));

    console.log("=".repeat(80) + "\n");
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
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isMonitoring = false;
    this.walletToProfile.clear();
    this.profileToWallet.clear();
  }

  getStatus(): ServiceStatus {
    return {
      isMonitoring: this.isMonitoring,
      targetProfileAddress:
        Array.from(this.walletToProfile.values())[0] || null,
      trackedOrdersCount: 0, // No longer tracking orders
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
      }
    }
  }

  removeWallet(walletAddress: string): void {
    const profileAddress = this.walletToProfile.get(walletAddress);
    if (profileAddress) {
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
