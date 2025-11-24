/**
 * Application constants
 */

export const WEBSOCKET_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 10,
  RECONNECT_DELAY: 5000, // milliseconds
  PING_INTERVAL: 60000, // milliseconds
  SERVICE_START_BUFFER: 30, // seconds
} as const;
