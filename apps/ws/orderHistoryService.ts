import { config, getTimestamp } from "./config";
import WebSocket from "ws";

interface OrderData {
  address: string;
  market_id: string;
  order_type: number;
  price: string;
  size: string;
  leverage: number;
  order_id: string;
  timestamp: string;
  status: string;
}

interface OrderHistoryService {
  isMonitoring: boolean;
  targetProfileAddress: string | null;
  trackedOrders: Set<string>;
  startMonitoring(targetWalletAddress: string): Promise<void>;
  stopMonitoring(): void;
  getStatus(): any;
}

class KanaOrderHistoryService implements OrderHistoryService {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 5000;
  private pingInterval: NodeJS.Timeout | null = null;
  private serviceStartTime: number = 0; // Track when service started to filter historical orders

  public isMonitoring: boolean = false;
  public targetProfileAddress: string | null = null;
  public trackedOrders: Set<string> = new Set();

  async startMonitoring(targetWalletAddress: string): Promise<void> {
    try {
      // Set service start time to filter out historical orders
      this.serviceStartTime = Math.floor(Date.now() / 1000) - 30; // 30 seconds buffer

      // Mask wallet address in logs for security
      const maskedAddress = targetWalletAddress.length > 10
        ? `${targetWalletAddress.substring(0, 6)}...${targetWalletAddress.substring(targetWalletAddress.length - 4)}`
        : "***";
      console.log(
        `${getTimestamp()} - 🎯 Starting order history monitoring for: ${maskedAddress}`
      );

      // Step 1: Get profile address for the target wallet
      await this.getTargetProfileAddress(targetWalletAddress);

      // Step 2: Connect to WebSocket
      await this.connectWebSocket();

      // Step 3: Subscribe to order history
      this.subscribeToOrderHistory();

      this.isMonitoring = true;
      console.log(
        `${getTimestamp()} - ✅ Order history monitoring started successfully!`
      );
      console.log(
        `${getTimestamp()} - 📊 Monitoring address: ${targetWalletAddress}`
      );
    } catch (error) {
      console.error(
        `${getTimestamp()} - ❌ Failed to start order history monitoring:`,
        error
      );
      throw error;
    }
  }

  private async getTargetProfileAddress(
    targetWalletAddress: string
  ): Promise<void> {
    try {
      // Mask wallet address in logs
      const maskedAddress = targetWalletAddress.length > 10
        ? `${targetWalletAddress.substring(0, 6)}...${targetWalletAddress.substring(targetWalletAddress.length - 4)}`
        : "***";
      console.log(
        `${getTimestamp()} - 🔍 Getting profile address for wallet: ${maskedAddress}`
      );

      const response = await fetch(
        `${config.kanaRestUrl}/getProfileAddress?userAddress=${targetWalletAddress}`,
        {
          headers: {
            "x-api-key": config.kanaApiKey,
            "Content-Type": "application/json",
          },
        }
      );

      const data: any = await response.json();

      if (data?.success) {
        this.targetProfileAddress = data.data;
        // Don't log full profile address - only show partial for security
        const maskedAddress = data.data ? `${data.data.substring(0, 8)}...${data.data.substring(data.data.length - 6)}` : "N/A";
        console.log(
          `${getTimestamp()} - 🎯 Target profile address resolved: ${maskedAddress}`
        );
      } else {
        throw new Error(`Failed to get profile address: ${data?.message}`);
      }
    } catch (error) {
      console.error(
        `${getTimestamp()} - ❌ Error getting profile address:`,
        error
      );
      throw error;
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(
          `${getTimestamp()} - 🔌 Connecting to Kana Labs WebSocket...`
        );
        this.ws = new WebSocket(config.kanaWsUrl);

        this.ws.on("open", () => {
          console.log(
            `${getTimestamp()} - ✅ WebSocket connected successfully!`
          );
          this.reconnectAttempts = 0;
          this.startPingInterval();
          resolve();
        });

        this.ws.on("message", (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on("close", (code: number, reason: string) => {
          console.log(
            `${getTimestamp()} - ❌ WebSocket disconnected. Code: ${code}, Reason: ${reason}`
          );
          this.stopPingInterval();
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        });

        this.ws.on("error", (error: Error) => {
          console.error(`${getTimestamp()} - ❌ WebSocket error:`, error);
          reject(error);
        });

        this.ws.on("pong", () => {
          console.log(`${getTimestamp()} - 🏓 Received pong from server`);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private subscribeToOrderHistory(): void {
    if (!this.ws || !this.targetProfileAddress) {
      console.error(
        `${getTimestamp()} - ❌ Cannot subscribe: WebSocket or target profile address not available`
      );
      return;
    }

    const subscriptionMessage = {
      topic: "order_history",
      address: this.targetProfileAddress,
      // Only get new orders, not historical ones
      from_timestamp: Math.floor(Date.now() / 1000), // Current timestamp
    };

    this.ws.send(JSON.stringify(subscriptionMessage));
    // Don't log full profile address
    const maskedAddress = this.targetProfileAddress 
      ? `${this.targetProfileAddress.substring(0, 8)}...${this.targetProfileAddress.substring(this.targetProfileAddress.length - 6)}`
      : "N/A";
    console.log(
      `${getTimestamp()} - ✅ Subscribed to order history for profile: ${maskedAddress}`
    );
  }

  private handleMessage(message: string): void {
    try {
      const data: any = JSON.parse(message);
      if (data.message === "order_history" && data.data) {
        this.processOrders(data.data).catch((error) => {
          console.error(
            `${getTimestamp()} - ❌ Error processing orders:`,
            error
          );
        });
      }
    } catch (error) {
      console.error(
        `${getTimestamp()} - ❌ Error parsing WebSocket message:`,
        error
      );
    }
  }

  private async processOrders(orders: OrderData[]): Promise<void> {
    // Only process NEW orders, not historical ones
    const newOrders = orders.filter((order) => {
      // Filter out already tracked orders
      if (this.trackedOrders.has(order.order_id)) {
        return false;
      }

      // Filter out historical orders (orders before service started)
      const orderTimestamp = parseInt(order.timestamp);
      if (orderTimestamp < this.serviceStartTime) {
        return false;
      }

      return true;
    });

    if (newOrders.length === 0) {
      return; // No new orders to process
    }

    // Only log if we have a reasonable number of new orders (not historical bulk data)
    if (newOrders.length <= 5) {
      console.log(
        `${getTimestamp()} - 📊 Processing ${
          newOrders.length
        } NEW orders...`
      );
    } else {
      console.log(
        `${getTimestamp()} - 📊 Received ${orders.length} orders, processing ${
          newOrders.length
        } NEW orders (filtering out ${
          orders.length - newOrders.length
        } already processed)...`
      );
    }

    for (const order of newOrders) {
      this.trackedOrders.add(order.order_id);
      this.displayOrder(order);
    }
  }

  private displayOrder(order: OrderData): void {
    const orderTimestamp = parseInt(order.timestamp);
    const orderTime = new Date(orderTimestamp * 1000).toLocaleString();

    console.log("\n" + "=".repeat(80));
    console.log("🎯 NEW ORDER DETECTED FROM TARGET USER");
    console.log("=".repeat(80));
    console.log(`📅 Time: ${orderTime}`);
    console.log(`🆔 Order ID: ${order.order_id}`);
    console.log(
      `📊 Market: ${this.getMarketName(order.market_id)} (ID: ${
        order.market_id
      })`
    );
    console.log(
      `📈 Order Type: ${this.getOrderTypeDescription(order.order_type)}`
    );
    console.log(`💰 Price: $${parseFloat(order.price).toLocaleString()}`);
    console.log(`📏 Size: ${order.size}`);
    console.log(`⚡ Leverage: ${order.leverage}x`);
    console.log(`📊 Status: ${order.status}`);
    console.log(`📍 Address: ${order.address}`);

    const orderInfo = this.getOrderTypeInfo(order.order_type);

    // Enhanced logging for order type analysis
    console.log("🔍 ORDER TYPE ANALYSIS:");
    console.log(`   - Order Type ID: ${order.order_type}`);
    console.log(`   - isBuy: ${orderInfo.isBuy}`);
    console.log(`   - isSell: ${orderInfo.isSell}`);
    console.log(`   - isExit: ${orderInfo.isExit}`);
    console.log(`   - isLong: ${orderInfo.isLong}`);
    console.log(`   - isShort: ${orderInfo.isShort}`);
    console.log(`   - Raw Order Data:`, JSON.stringify(order, null, 2));

    if (orderInfo.isBuy) {
      console.log("🟢 ACTION: BUY ORDER PLACED (LONG POSITION)");
      console.log(
        `   Target user placed BUY order: ${order.size} at $${order.price}`
      );
    } else if (orderInfo.isSell) {
      console.log("🔴 ACTION: SELL ORDER PLACED (SHORT POSITION)");
      console.log(
        `   Target user placed SELL order: ${order.size} at $${order.price}`
      );
    } else if (orderInfo.isExit) {
      console.log("🟡 ACTION: EXIT ORDER PLACED");
      console.log(
        `   Target user placed EXIT order: ${order.size} at $${order.price}`
      );
    } else {
      console.log("❓ ACTION: UNKNOWN ORDER TYPE");
      console.log(
        `   Target user placed UNKNOWN order type ${order.order_type}: ${order.size} at $${order.price}`
      );
    }

    console.log("=".repeat(80) + "\n");
  }

  private getOrderTypeDescription(orderType: number): string {
    const descriptions: { [key: number]: string } = {
      1: "Market Buy",
      2: "Limit Buy",
      3: "Stop Buy",
      4: "Market Sell",
      5: "Limit Sell",
      6: "Stop Sell",
      7: "Market Exit Long",
      8: "Limit Exit Long",
      9: "Stop Exit Long",
      10: "Market Exit Short",
      11: "Limit Exit Short",
      12: "Stop Exit Short",
      // Add more order types that might exist
      13: "Market Short",
      14: "Limit Short",
      15: "Stop Short",
      16: "Market Long",
      17: "Limit Long",
      18: "Stop Long",
    };
    return descriptions[orderType] || `Unknown Order Type (${orderType})`;
  }

  private getMarketName(marketId: string): string {
    const markets: { [key: string]: string } = {
      "14": "APT-USD",
      "15": "BTC-USD",
      "16": "ETH-USD",
      "31": "SOL-USD",
      "1338": "APT-USD (Testnet)",
      "1339": "BTC-USD (Testnet)",
      "1340": "ETH-USD (Testnet)",
      "2387": "SOL-USD (Testnet)",
    };
    return markets[marketId] || `Market ${marketId}`;
  }

  private getOrderTypeInfo(orderType: number): {
    isBuy: boolean;
    isSell: boolean;
    isExit: boolean;
    isLong: boolean;
    isShort: boolean;
  } {
    return {
      // Original order types (1-12)
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
        // Remove ping logs to reduce noise - only log every 5th ping
        if (Math.random() < 0.2) {
          console.log(`${getTimestamp()} - 🏓 Connection alive (ping sent)`);
        }
      }
    }, 60000); // Increased to 60 seconds to reduce frequency
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `${getTimestamp()} - 🔄 Scheduling reconnection attempt ${
        this.reconnectAttempts
      }/${this.maxReconnectAttempts} in ${delay / 1000} seconds...`
    );

    setTimeout(() => {
      this.connectWebSocket().catch((error) => {
        console.error(`${getTimestamp()} - ❌ Reconnection failed:`, error);
      });
    }, delay);
  }

  stopMonitoring(): void {
    console.log(`${getTimestamp()} - 🛑 Stopping order history monitoring...`);
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isMonitoring = false;
    this.targetProfileAddress = null;
    this.trackedOrders.clear();
    console.log(`${getTimestamp()} - ✅ Order history monitoring stopped.`);
  }

  getStatus(): any {
    return {
      isMonitoring: this.isMonitoring,
      targetProfileAddress: this.targetProfileAddress,
      trackedOrdersCount: this.trackedOrders.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Export singleton instance
export const orderHistoryService = new KanaOrderHistoryService();
export { KanaOrderHistoryService };
