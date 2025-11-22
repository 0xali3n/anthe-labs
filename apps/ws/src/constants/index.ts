/**
 * Application constants
 */

export const ORDER_TYPES = {
  MARKET_BUY: 1,
  LIMIT_BUY: 2,
  STOP_BUY: 3,
  MARKET_SELL: 4,
  LIMIT_SELL: 5,
  STOP_SELL: 6,
  MARKET_EXIT_LONG: 7,
  LIMIT_EXIT_LONG: 8,
  STOP_EXIT_LONG: 9,
  MARKET_EXIT_SHORT: 10,
  LIMIT_EXIT_SHORT: 11,
  STOP_EXIT_SHORT: 12,
  MARKET_SHORT: 13,
  LIMIT_SHORT: 14,
  STOP_SHORT: 15,
  MARKET_LONG: 16,
  LIMIT_LONG: 17,
  STOP_LONG: 18,
} as const;

export const ORDER_TYPE_DESCRIPTIONS: Record<number, string> = {
  [ORDER_TYPES.MARKET_BUY]: "Market Buy",
  [ORDER_TYPES.LIMIT_BUY]: "Limit Buy",
  [ORDER_TYPES.STOP_BUY]: "Stop Buy",
  [ORDER_TYPES.MARKET_SELL]: "Market Sell",
  [ORDER_TYPES.LIMIT_SELL]: "Limit Sell",
  [ORDER_TYPES.STOP_SELL]: "Stop Sell",
  [ORDER_TYPES.MARKET_EXIT_LONG]: "Market Exit Long",
  [ORDER_TYPES.LIMIT_EXIT_LONG]: "Limit Exit Long",
  [ORDER_TYPES.STOP_EXIT_LONG]: "Stop Exit Long",
  [ORDER_TYPES.MARKET_EXIT_SHORT]: "Market Exit Short",
  [ORDER_TYPES.LIMIT_EXIT_SHORT]: "Limit Exit Short",
  [ORDER_TYPES.STOP_EXIT_SHORT]: "Stop Exit Short",
  [ORDER_TYPES.MARKET_SHORT]: "Market Short",
  [ORDER_TYPES.LIMIT_SHORT]: "Limit Short",
  [ORDER_TYPES.STOP_SHORT]: "Stop Short",
  [ORDER_TYPES.MARKET_LONG]: "Market Long",
  [ORDER_TYPES.LIMIT_LONG]: "Limit Long",
  [ORDER_TYPES.STOP_LONG]: "Stop Long",
};

export const MARKETS: Record<string, string> = {
  "14": "APT-USD",
  "15": "BTC-USD",
  "16": "ETH-USD",
  "31": "SOL-USD",
  "1338": "APT-USD (Testnet)",
  "1339": "BTC-USD (Testnet)",
  "1340": "ETH-USD (Testnet)",
  "2387": "SOL-USD (Testnet)",
};

export const WEBSOCKET_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 10,
  RECONNECT_DELAY: 5000, // milliseconds
  PING_INTERVAL: 60000, // milliseconds
  SERVICE_START_BUFFER: 30, // seconds
} as const;

export const LOG_CONFIG = {
  PING_LOG_PROBABILITY: 0.2, // 20% chance to log ping
  MAX_ORDERS_FOR_VERBOSE_LOG: 5,
} as const;
