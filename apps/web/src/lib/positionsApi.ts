// API for fetching positions from backend (which calls Kana Trade API)

import { authenticatedRequest } from "./apiClient";
import { getAuthToken } from "./utils/authUtils";
import { mapMarketIdToSymbol } from "./utils/marketUtils";
import { formatNumber, formatPnL } from "./utils/formatUtils";

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

    return await authenticatedRequest<PositionsApiResponse>(
      "/wallets/positions",
      token,
      {
        method: "GET",
      }
    );
  } catch (error: any) {
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

  const pnlPercent =
    entryValue > 0 ? `${((pnl / entryValue) * 100).toFixed(2)}%` : "0.00%";
  const pnlPercentFormatted = pnl >= 0 ? `+${pnlPercent}` : pnlPercent;

  const markPrice = size > 0 ? (currentValue / size).toFixed(2) : position.entry_price;

  return {
    id: position.trade_id,
    symbol,
    side,
    size: position.size,
    entryPrice: formatNumber(position.entry_price),
    markPrice: formatNumber(markPrice),
    value: formatNumber(position.value),
    liqPrice: formatNumber(position.liq_price),
    margin: formatNumber(position.margin),
    pnl: formatPnL(pnl),
    pnlPercent: pnlPercentFormatted,
    leverage,
  };
}
