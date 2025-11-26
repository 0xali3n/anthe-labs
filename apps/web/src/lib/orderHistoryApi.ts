// API for fetching trade history from backend (which calls Kana Trade API)

import { authenticatedRequest } from "./apiClient";
import { getAuthToken } from "./utils/authUtils";
import { mapMarketIdToSymbol } from "./utils/marketUtils";
import { formatTimestamp, formatNumber, formatPnL } from "./utils/formatUtils";

export interface TradeHistoryResponse {
  address: string;
  leverage: number;
  market_id: string;
  timestamp: number;
  size: string;
  order_type: number; // 1=OPEN_LONG, 2=OPEN_SHORT, 3=INCREASE_LONG, 4=INCREASE_SHORT, 5=DECREASE_LONG, 6=DECREASE_SHORT, 7=CLOSE_LONG, 8=CLOSE_SHORT
  price: string;
  order_value: string;
  pnl: string;
  fee: string;
  trade_id: string;
  last_updated: number;
  transaction_version: number;
  entry_price: string | null;
  order_id: string;
}

export interface TradeHistoryApiResponse {
  success: boolean;
  message?: string;
  data: TradeHistoryResponse[];
}

/**
 * Fetch trade history from backend API (which calls Kana Trade API)
 */
export async function getOrderHistory(): Promise<TradeHistoryApiResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "No session found. Please sign in.",
        data: [],
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await authenticatedRequest<TradeHistoryApiResponse>(
        "/wallets/getTradeHistory",
        token,
        {
          method: "GET",
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to fetch trade history",
      data: [],
    };
  }
}

/**
 * Map order_type to direction
 * order_type values:
 * 1 = OPEN_LONG: Opens a new long position -> "Long"
 * 2 = OPEN_SHORT: Opens a new short position -> "Short"
 * 3 = INCREASE_LONG: Increases the size of an existing long position -> "Long"
 * 4 = INCREASE_SHORT: Increases the size of an existing short position -> "Short"
 * 5 = DECREASE_LONG: Reduces the size of an existing long position -> "Exit Long"
 * 6 = DECREASE_SHORT: Reduces the size of an existing short position -> "Exit Short"
 * 7 = CLOSE_LONG: Closes an existing long position -> "Exit Long"
 * 8 = CLOSE_SHORT: Closes an existing short position -> "Exit Short"
 */
function mapOrderTypeToDirection(
  orderType: number
): "Long" | "Exit Long" | "Short" | "Exit Short" {
  switch (orderType) {
    case 1: // OPEN_LONG
    case 3: // INCREASE_LONG
      return "Long";
    case 2: // OPEN_SHORT
    case 4: // INCREASE_SHORT
      return "Short";
    case 5: // DECREASE_LONG
    case 7: // CLOSE_LONG
      return "Exit Long";
    case 6: // DECREASE_SHORT
    case 8: // CLOSE_SHORT
      return "Exit Short";
    default:
      // Fallback: treat odd numbers as Long, even as Short
      return orderType % 2 === 1 ? "Long" : "Short";
  }
}

/**
 * Map TradeHistoryResponse to TradeHistory format
 */
export function mapOrderHistoryToTradeHistory(trade: TradeHistoryResponse) {
  const symbol = mapMarketIdToSymbol(trade.market_id);
  const direction = mapOrderTypeToDirection(trade.order_type);

  return {
    id: `${trade.order_id}-${trade.trade_id}-${trade.timestamp}`,
    timestamp: formatTimestamp(trade.timestamp),
    direction: direction as "Long" | "Short" | "Exit Long" | "Exit Short",
    symbol,
    leverage: `${trade.leverage}x`,
    size: trade.size,
    price: formatNumber(trade.price),
    orderValue: formatNumber(trade.order_value),
    fee: formatNumber(trade.fee),
    pnl: formatPnL(trade.pnl),
  };
}
