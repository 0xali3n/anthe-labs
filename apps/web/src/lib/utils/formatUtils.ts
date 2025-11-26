/**
 * Shared formatting utilities
 */

/**
 * Format Unix timestamp to readable format
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
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
 * Format number with locale string
 */
export function formatNumber(
  value: number | string,
  minDecimals: number = 2,
  maxDecimals: number = 2
): string {
  return parseFloat(String(value)).toLocaleString("en-US", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Format PnL value with sign
 */
export function formatPnL(pnl: number | string): string {
  const value = parseFloat(String(pnl));
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

