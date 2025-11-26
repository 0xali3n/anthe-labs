/**
 * Shared utilities for market-related operations
 */

/**
 * Map market_id to symbol
 * Market IDs:
 * - 14: APT-USD
 * - 15: BTC-USD
 * - 16: ETH-USD
 * - 31: SOL-USD
 */
export function mapMarketIdToSymbol(marketId: string): "BTC" | "ETH" | "APT" | "SOL" {
  const marketMap: Record<string, "BTC" | "ETH" | "APT" | "SOL"> = {
    "14": "APT",
    "15": "BTC",
    "16": "ETH",
    "31": "SOL",
  };

  return marketMap[marketId] || "APT";
}

