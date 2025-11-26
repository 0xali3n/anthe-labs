import { Logger } from "../utils/logger";
import { redisService } from "./redis.service";
import { orderExecutionService } from "./order-execution.service";

const STREAM_KEY = "orders:stream";

interface OrderData {
  address: string;
  orderType: string;
  tradeSide: boolean;
  direction: boolean;
  marketId: string;
  leverage: number;
  size: number;
  price?: number;
  restriction?: number;
  percentage?: number; // For smart ratio calculation
}

export class StreamProcessorService {
  /**
   * Parse stream entry fields array to object
   */
  private parseStreamEntry(fields: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      if (fields[i] && fields[i + 1]) {
        result[fields[i]] = fields[i + 1];
      }
    }
    return result;
  }

  /**
   * Get subscribers for a trader address from Redis
   */
  private async getSubscribers(
    traderAddress: string
  ): Promise<string[]> {
    try {
      const subscriberData = await redisService.hgetall(
        `subs:profile:${traderAddress}`
      );

      return subscriberData ? Object.keys(subscriberData) : [];
    } catch (error) {
      Logger.error(
        `Error getting subscribers for trader ${traderAddress}`,
        error
      );
      return [];
    }
  }

  /**
   * Parse order data from Redis stream
   */
  private parseOrderData(
    orderData: Record<string, string>
  ): OrderData | null {
    try {
      const orderType = orderData.orderType || "MARKET";
      const tradeSide = orderData.tradeSide === "true";
      const direction = orderData.direction === "true";
      const marketId = orderData.marketId || orderData.market_id || "";
      const leverage = parseFloat(orderData.leverage || "1");
      const size = parseFloat(orderData.size || "0");
      const price = orderData.price ? parseFloat(orderData.price) : undefined;
      const restriction = orderData.restriction
        ? parseFloat(orderData.restriction)
        : undefined;
      const percentage = orderData.percentage
        ? parseFloat(orderData.percentage)
        : undefined;
      const address = orderData.address;

      if (!address || !marketId || size <= 0) {
        return null;
      }

      return {
        address,
        orderType,
        tradeSide,
        direction,
        marketId,
        leverage,
        size,
        price,
        restriction,
        percentage,
      };
    } catch (error) {
      Logger.error("Error parsing order data", error);
      return null;
    }
  }

  /**
   * Process a single order
   */
  async processOrder(
    entryId: string,
    orderData: Record<string, string>
  ): Promise<boolean> {
    try {
      const parsed = this.parseOrderData(orderData);
      if (!parsed) {
        Logger.warn(`Invalid order data for ${entryId}`);
        return false;
      }

      // Get subscribers
      const subscribers = await this.getSubscribers(parsed.address);
      if (subscribers.length === 0) {
        return true; // No subscribers, consider successful
      }

      Logger.info(
        `📊 Order ${entryId}: ${parsed.orderType} | Market: ${parsed.marketId} | Size: ${parsed.size} | ${subscribers.length} subscriber(s)`
      );

      // Execute trades for all subscribers in parallel
      const executionPromises = subscribers.map(
        async (userAddress) => {
          const result = await orderExecutionService.executeTrade(
            userAddress,
            parsed.orderType,
            {
              marketId: parsed.marketId,
              size: parsed.size,
              leverage: parsed.leverage,
              tradeSide: parsed.tradeSide,
              direction: parsed.direction,
              price: parsed.price,
              restriction: parsed.restriction,
              percentage: parsed.percentage,
            }
          );

          if (result.success) {
            Logger.success(
              `✅ ${userAddress.substring(0, 10)}...: TX=${result.txHash}`
            );
          } else {
            // Categorize errors for better logging
            const errorMsg = result.error || "Unknown error";
            if (errorMsg.includes("Business logic error")) {
              Logger.warn(
                `⚠️  ${userAddress.substring(0, 10)}...: ${errorMsg}`
              );
            } else if (errorMsg.includes("already in mempool") || errorMsg.includes("invalid_transaction_update")) {
              Logger.warn(
                `⚠️  ${userAddress.substring(0, 10)}...: Transaction conflict (will retry)`
              );
            } else {
              Logger.error(
                `❌ ${userAddress.substring(0, 10)}...: ${errorMsg}`
              );
            }
          }

          return result.success;
        }
      );

      const results = await Promise.allSettled(executionPromises);
      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value === true
      ).length;

      Logger.success(
        `✅ Order ${entryId}: ${successCount}/${subscribers.length} successful`
      );

      return successCount > 0;
    } catch (error) {
      Logger.error(`Error processing order ${entryId}`, error);
      return false;
    }
  }

  /**
   * Process multiple orders in parallel
   */
  async processBatch(
    entries: Array<[string, string[]]>
  ): Promise<string[]> {
    const processingPromises = entries.map(async ([entryId, fields]) => {
      const orderData = this.parseStreamEntry(fields);
      const success = await this.processOrder(entryId, orderData);

      // Delete from Redis stream after successful processing
      if (success) {
        try {
          await redisService.deleteStreamEntry(STREAM_KEY, entryId);
        } catch (error) {
          Logger.error(`Error deleting entry ${entryId}`, error);
        }
      }

      return entryId;
    });

    const processedIds = await Promise.allSettled(processingPromises);
    return processedIds
      .filter(
        (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled"
      )
      .map((r) => r.value);
  }
}

export const streamProcessorService = new StreamProcessorService();

