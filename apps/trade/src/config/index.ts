import * as dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  redisHost: string;
  redisPort: number;
  nodeEnv: string;
  databaseUrl: string;
  kanaApiKey: string;
  kanaRestUrl: string;
  encryptionKey: string;
}

export const config: AppConfig = {
  redisHost: process.env.REDIS_HOST || "localhost",
  redisPort: parseInt(process.env.REDIS_PORT || "6379"),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  kanaApiKey: process.env.KANA_API_KEY || "",
  kanaRestUrl: process.env.KANA_REST || "https://perps-tradeapi.kana.trade",
  encryptionKey: process.env.ENCRYPTION_KEY || "",
};

export function validateConfig(): void {
  const required: string[] = ["DATABASE_URL", "KANA_API_KEY", "ENCRYPTION_KEY"];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

