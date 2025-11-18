import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradersService {
  constructor(private prisma: PrismaService) {}

  // Get all traders, ordered by PNL descending
  async findAll() {
    const traders = await this.prisma.trader.findMany({
      orderBy: {
        pnl: 'desc',
      },
    });

    return {
      success: true,
      data: traders.map((trader) => ({
        id: trader.id,
        address: trader.address,
        botName: trader.bot_name,
        avatarUrl: trader.avatar_url,
        numberOfTxns: trader.numberOfTxns,
        totalVolume: trader.totalVolume.toString(),
        pnl: trader.pnl.toString(),
        roi: trader.roi.toString(),
        createdAt: trader.created_at,
        updatedAt: trader.updated_at,
      })),
    };
  }

  // Get a single trader by address
  async findOne(address: string) {
    const trader = await this.prisma.trader.findUnique({
      where: { address },
    });

    if (!trader) {
      return {
        success: false,
        error: 'Trader not found',
      };
    }

    return {
      success: true,
      data: {
        id: trader.id,
        address: trader.address,
        botName: trader.bot_name,
        avatarUrl: trader.avatar_url,
        numberOfTxns: trader.numberOfTxns,
        totalVolume: trader.totalVolume.toString(),
        pnl: trader.pnl.toString(),
        roi: trader.roi.toString(),
        createdAt: trader.created_at,
        updatedAt: trader.updated_at,
      },
    };
  }
}
