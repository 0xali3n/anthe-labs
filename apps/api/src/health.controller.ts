import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('health')
export class HealthController {
  @Get('db')
  async check() {
    try {
      await prisma.$executeRaw`SELECT 1`;
      return {
        ok: true,
        message: '✅ Database connection (6543) working fine!',
      };
    } catch (error) {
      console.error('Database connection failed:', error);
      return {
        ok: false,
        message: '❌ Database connection failed',
        error: error.message,
      };
    }
  }
}
