import * as dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  redisHost: string;
  redisPort: number;
  nodeEnv: string;
}

export const config: AppConfig = {
  redisHost: process.env.REDIS_HOST || "localhost",
  redisPort: parseInt(process.env.REDIS_PORT || "6379"),
  nodeEnv: process.env.NODE_ENV || "development",
};

export function validateConfig(): void {
  // Add required env vars here when needed
  const required: string[] = [];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

