import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pgPool: Pool;

  // Expose PrismaClient accessors for TypeScript inference
  get wallet() {
    return super.wallet;
  }

  get user() {
    return super.user;
  }

  get feedback() {
    return this['feedback'];
  }

  get trader() {
    return super.trader;
  }

  get traderRegistration() {
    return super.traderRegistration;
  }

  get copyTradeBot() {
    return super.copyTradeBot;
  }

  constructor() {
    // Ensure DATABASE_URL has pgbouncer=true for Supabase connection pooling
    // This disables prepared statements which are incompatible with PgBouncer
    const databaseUrl = process.env.DATABASE_URL || '';

    // Add pgbouncer=true if not already present (for Supabase pooled connections)
    const connectionUrl = databaseUrl.includes('pgbouncer=true')
      ? databaseUrl
      : databaseUrl.includes('?')
        ? `${databaseUrl}&pgbouncer=true`
        : `${databaseUrl}?pgbouncer=true`;

    // Prisma 7: Use PostgreSQL adapter with Pool
    // Create a pg Pool and wrap it in PrismaPg adapter
    // Must create before calling super() since we can't use 'this' before super()
    const pgPool = new Pool({ connectionString: connectionUrl });
    const adapter = new PrismaPg(pgPool);

    super({
      adapter,
      log: ['error', 'warn'],
      errorFormat: 'pretty',
    });

    // Now we can assign to this.pgPool after super() is called
    this.pgPool = pgPool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pgPool.end();
    console.log('✅ Database disconnected');
  }
}
