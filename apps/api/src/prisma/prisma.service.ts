import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
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

    super({
      log: ['error', 'warn'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
    });
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
    console.log('✅ Database disconnected');
  }
}
