import * as dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  kanaApiKey: string;
  kanaRestUrl: string;
  kanaWsUrl: string;
  targetWalletAddress: string;
  nodeEnv: string;
}

export const config: AppConfig = {
  kanaApiKey: process.env.KANA_API_KEY || "",
  kanaRestUrl: process.env.KANA_REST || "https://perps-tradeapi.kana.trade",
  kanaWsUrl:
    process.env.KANA_WS || "wss://perpetuals-indexer-ws.kana.trade/ws/",
  targetWalletAddress: process.env.TARGET_WALLET_ADDRESS || "",
  nodeEnv: process.env.NODE_ENV || "development",
};

export function validateConfig(): void {
  const required = ["KANA_API_KEY", "TARGET_WALLET_ADDRESS"];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
