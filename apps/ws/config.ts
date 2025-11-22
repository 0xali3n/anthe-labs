import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const config = {
  // Server Configuration
  port: Number(process.env.PORT) || 3001,

  // Kana Labs API Configuration
  kanaApiKey: process.env.KANA_API_KEY || "",
  kanaRestUrl: process.env.KANA_REST || "https://perps-tradeapi.kana.trade",
  kanaWsUrl:
    process.env.KANA_WS || "wss://perpetuals-indexer-ws.kana.trade/ws/",

  // Target Address to Monitor
  targetWalletAddress: process.env.TARGET_WALLET_ADDRESS || "",
};

// Validation function to check if all required environment variables are set
export function validateConfig(): void {
  const requiredVars = ["KANA_API_KEY", "TARGET_WALLET_ADDRESS"];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

// Helper function to get current timestamp for logging
export function getTimestamp(): string {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}
