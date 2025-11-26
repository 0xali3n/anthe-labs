// API for fetching all trades from backend (which calls Kana Trade API)

import { authenticatedRequest } from "./apiClient";
import { supabase } from "./supabaseClient";

export interface TradeResponse {
  txn_version: number;
  event_idx: number;
  emit_address: string;
  time: string; // ISO string
  maker_address: string;
  maker_custodian_id: number;
  maker_order_id: string;
  maker_side: boolean; // true = Long, false = Short
  market_id: number;
  price: number;
  sequence_number_for_trade: number;
  size: number;
  taker_address: string;
  taker_custodian_id: number;
  taker_order_id: string;
  taker_quote_fees_paid: number;
}

export interface TradesApiResponse {
  success: boolean;
  message?: string;
  data: TradeResponse[];
}

/**
 * Map market_id to symbol
 * Market IDs:
 * - 14: APT-USD
 * - 15: BTC-USD
 * - 16: ETH-USD
 * - 31: SOL-USD
 */
function mapMarketIdToSymbol(marketId: string): "BTC" | "ETH" | "APT" | "SOL" {
  const marketMap: Record<string, "BTC" | "ETH" | "APT" | "SOL"> = {
    "14": "APT",
    "15": "BTC",
    "16": "ETH",
    "31": "SOL",
  };

  return marketMap[marketId] || "APT"; // Default to APT if unknown
}

/**
 * Format ISO timestamp to readable format
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateStr = date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
  return `${time} • ${dateStr}`;
}

/**
 * Fetch all trades from backend API (which calls Kana Trade API)
 */
export async function getOrderHistory(): Promise<TradesApiResponse> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        message: "No session found. Please sign in.",
        data: [],
      };
    }

    const response = await authenticatedRequest<TradesApiResponse>(
      "/wallets/getAllTrades",
      session.access_token,
      {
        method: "GET",
      }
    );

    return response;
  } catch (error: any) {
    console.error("Error fetching trades:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch trades",
      data: [],
    };
  }
}

/**
 * Map TradeResponse to TradeHistory format
 */
export function mapOrderHistoryToTradeHistory(trade: TradeResponse) {
  const symbol = mapMarketIdToSymbol(trade.market_id.toString());
  const direction = trade.maker_side ? "Long" : "Short";

  // Price and size appear to be in fixed-point format (divide by 1e6 for USDT)
  const price = (trade.price / 1000000).toFixed(2);
  const size = (trade.size / 1000000).toFixed(6);
  const orderValue = ((trade.price * trade.size) / 1000000000000).toFixed(2);

  return {
    id: `${trade.txn_version}-${trade.event_idx}-${trade.maker_order_id}`,
    timestamp: formatTimestamp(trade.time),
    direction: direction as "Long" | "Short",
    symbol,
    leverage: "1x",
    size,
    price: parseFloat(price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    orderValue: parseFloat(orderValue).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    pnl: "-",
  };
}
