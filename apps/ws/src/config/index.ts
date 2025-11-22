import * as dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  kanaApiKey: string;
  kanaRestUrl: string;
  kanaWsUrl: string;
  targetWalletAddresses: string[];
  nodeEnv: string;
}

function parseWalletAddresses(): string[] {
  const addresses: string[] = [];

  // Read from TARGET_WALLET_ADDRESSES1 and TARGET_WALLET_ADDRESSES2
  if (process.env.TARGET_WALLET_ADDRESSES1) {
    addresses.push(process.env.TARGET_WALLET_ADDRESSES1.trim());
  }
  if (process.env.TARGET_WALLET_ADDRESSES2) {
    addresses.push(process.env.TARGET_WALLET_ADDRESSES2.trim());
  }

  return addresses.filter((addr) => addr.length > 0);
}

export const config: AppConfig = {
  kanaApiKey: process.env.KANA_API_KEY || "",
  kanaRestUrl: process.env.KANA_REST || "https://perps-tradeapi.kana.trade",
  kanaWsUrl:
    process.env.KANA_WS || "wss://perpetuals-indexer-ws.kana.trade/ws/",
  targetWalletAddresses: parseWalletAddresses(),
  nodeEnv: process.env.NODE_ENV || "development",
};

export function validateConfig(): void {
  const required = ["KANA_API_KEY"];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  if (config.targetWalletAddresses.length === 0) {
    throw new Error(
      "No target wallet addresses configured. Set TARGET_WALLET_ADDRESSES1 and/or TARGET_WALLET_ADDRESSES2"
    );
  }
}
