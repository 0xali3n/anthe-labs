import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Logger } from "../utils/logger";

export class PrismaService extends PrismaClient {
  private pgPool: Pool;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL || "";

    // Add pgbouncer=true if not already present (for Supabase pooled connections)
    const connectionUrl = databaseUrl.includes("pgbouncer=true")
      ? databaseUrl
      : databaseUrl.includes("?")
        ? `${databaseUrl}&pgbouncer=true`
        : `${databaseUrl}?pgbouncer=true`;

    // Prisma 7: Use PostgreSQL adapter with Pool
    const pgPool = new Pool({ connectionString: connectionUrl });
    const adapter = new PrismaPg(pgPool);

    super({
      adapter,
      log: ["error", "warn"],
      errorFormat: "pretty",
    });

    this.pgPool = pgPool;
  }

  async connect(): Promise<void> {
    try {
      await this.$connect();
      Logger.success("✅ Database connected");
    } catch (error) {
      Logger.error("Database connection failed", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.$disconnect();
    await this.pgPool.end();
    Logger.info("Database disconnected");
  }
}

// Export singleton instance
export const prismaService = new PrismaService();

