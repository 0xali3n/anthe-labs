// API for fetching positions from backend (which calls Kana Trade API)

import { authenticatedRequest } from "./apiClient";
import { supabase } from "./supabaseClient";

export interface PositionResponse {
  address: string;
  market_id: string;
  leverage: number;
  trade_side: boolean; // true = LONG, false = SHORT
  size: string;
  available_order_size: string;
  value: string;
  entry_price: string;
  liq_price: string;
  margin: string;
  tp: string | null;
  sl: string | null;
  trade_id: string;
  last_updated: number;
  transaction_version: number;
}

export interface PositionsApiResponse {
  success: boolean;
  message?: string;
  data: PositionResponse[];
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
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Fetch positions from backend API (which calls Kana Trade API)
 * Backend gets userAddress from authenticated user's JWT token
 */
export async function getPositions(): Promise<PositionsApiResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "No session found. Please sign in.",
        data: [],
      };
    }

    const response = await authenticatedRequest<PositionsApiResponse>(
      "/wallets/positions",
      token,
      {
        method: "GET",
      }
    );

    return response;
  } catch (error: any) {
    console.error("Error fetching positions:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch positions",
      data: [],
    };
  }
}

/**
 * Map PositionResponse to OpenPosition format
 */
export function mapPositionToOpenPosition(position: PositionResponse): {
  id: string;
  symbol: "BTC" | "ETH" | "APT" | "SOL";
  side: "LONG" | "SHORT";
  size: string;
  entryPrice: string;
  markPrice: string;
  value: string;
  liqPrice: string;
  margin: string;
  pnl: string;
  pnlPercent: string;
  leverage: string;
} {
  const symbol = mapMarketIdToSymbol(position.market_id);
  const side = position.trade_side ? "LONG" : "SHORT";
  const leverage = `${position.leverage}x`;

  // Calculate PnL from entry price and current value
  // Entry value = entry_price * size
  // Current value = value (from API, which is the current notional value)
  // PnL = (current_value - entry_value) for LONG
  // PnL = (entry_value - current_value) for SHORT
  const entryPrice = parseFloat(position.entry_price);
  const size = parseFloat(position.size);
  const entryValue = entryPrice * size;
  const currentValue = parseFloat(position.value);

  let pnl: number;
  if (position.trade_side) {
    // LONG position: profit when current value > entry value
    pnl = currentValue - entryValue;
  } else {
    // SHORT position: profit when entry value > current value
    pnl = entryValue - currentValue;
  }

  const pnlFormatted = pnl >= 0 ? `+${pnl.toFixed(2)}` : pnl.toFixed(2);
  const pnlPercent =
    entryValue > 0 ? `${((pnl / entryValue) * 100).toFixed(2)}%` : "0.00%";
  const pnlPercentFormatted = pnl >= 0 ? `+${pnlPercent}` : pnlPercent;

  // Calculate mark price: current value / size
  const markPrice =
    size > 0 ? (currentValue / size).toFixed(2) : position.entry_price;

  return {
    id: position.trade_id,
    symbol,
    side,
    size: position.size,
    entryPrice: parseFloat(position.entry_price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    markPrice: parseFloat(markPrice).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    value: parseFloat(position.value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    liqPrice: parseFloat(position.liq_price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    margin: parseFloat(position.margin).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    pnl: pnlFormatted,
    pnlPercent: pnlPercentFormatted,
    leverage,
  };
}
