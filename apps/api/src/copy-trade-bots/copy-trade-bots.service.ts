import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCopyTradeBotDto } from './dto/create-copy-trade-bot.dto';
import { UpdateCopyTradeBotDto } from './dto/update-copy-trade-bot.dto';

export interface BotResponse {
  id: string;
  userId: string;
  traderAddress: string | null;
  allocatedAmount: string;
  allocationPercent: string;
  mode: string;
  status: string;
  totalTrades: number;
  pnl: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date;
  stoppedAt: Date | null;
}

@Injectable()
export class CopyTradeBotsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Map Prisma bot model to API response format
   */
  private mapBotToResponse(bot: any): BotResponse {
    return {
      id: bot.id,
      userId: bot.user_id,
      traderAddress: bot.trader_address,
      allocatedAmount: bot.allocated_amount.toString(),
      allocationPercent: bot.allocation_percent.toString(),
      mode: bot.mode,
      status: bot.status,
      totalTrades: bot.total_trades,
      pnl: bot.pnl.toString(),
      createdAt: bot.created_at,
      updatedAt: bot.updated_at,
      startedAt: bot.started_at,
      stoppedAt: bot.stopped_at,
    };
  }

  /**
   * Create a new copy trade bot
   */
  async create(userId: string, createDto: CreateCopyTradeBotDto) {
    try {
      // Sanitize trader address if provided
      const traderAddress = createDto.traderAddress?.trim() || null;

      const bot = await this.prisma.copyTradeBot.create({
        data: {
          user_id: userId,
          trader_address: traderAddress,
          allocated_amount: createDto.allocatedAmount,
          allocation_percent: createDto.allocationPercent,
          mode: createDto.mode || 'smart_ratio',
          status: 'running',
          // Mock stats for now (will be fetched from different table in future)
          total_trades: Math.floor(Math.random() * 50),
          pnl: parseFloat((Math.random() * 200 - 100).toFixed(2)),
        },
      });

      return {
        success: true,
        data: this.mapBotToResponse(bot),
      };
    } catch (error: any) {
      console.error('[CopyTradeBotService] Error creating bot:', {
        code: error.code,
        message: error.message,
        meta: error.meta,
      });

      // Handle Prisma-specific errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        return {
          success: false,
          error: `A bot with this ${field} already exists.`,
        };
      }

      if (error.code === 'P2003') {
        return {
          success: false,
          error: 'Invalid user ID or foreign key constraint violation.',
        };
      }

      if (
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.message?.includes('table')
      ) {
        return {
          success: false,
          error: 'Database table not found. Please run the migration SQL.',
        };
      }

      if (
        error.message?.includes('permission denied') ||
        error.message?.includes('row-level security')
      ) {
        return {
          success: false,
          error: 'Database permission denied. Please check RLS policies.',
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to create copy trade bot',
      };
    }
  }

  /**
   * Get all bots for a user
   */
  async findByUserId(userId: string) {
    try {
      const bots = await this.prisma.copyTradeBot.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      return {
        success: true,
        data: bots.map((bot) => this.mapBotToResponse(bot)),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch copy trade bots',
      };
    }
  }

  /**
   * Get a single bot by ID (ensures user owns the bot)
   */
  async findOne(id: string, userId: string) {
    try {
      const bot = await this.prisma.copyTradeBot.findFirst({
        where: {
          id,
          user_id: userId,
        },
      });

      if (!bot) {
        return {
          success: false,
          error: 'Copy trade bot not found',
        };
      }

      return {
        success: true,
        data: this.mapBotToResponse(bot),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch copy trade bot',
      };
    }
  }

  /**
   * Update bot status or trader address (ensures user owns the bot)
   */
  async update(id: string, userId: string, updateDto: UpdateCopyTradeBotDto) {
    try {
      // Verify bot exists and belongs to user
      const existingBot = await this.prisma.copyTradeBot.findFirst({
        where: {
          id,
          user_id: userId,
        },
        select: {
          status: true,
        },
      });

      if (!existingBot) {
        return {
          success: false,
          error: 'Copy trade bot not found',
        };
      }

      const updateData: any = {};

      if (updateDto.status) {
        updateData.status = updateDto.status;
        if (updateDto.status === 'stopped') {
          updateData.stopped_at = new Date();
        } else if (
          updateDto.status === 'running' &&
          existingBot.status === 'stopped'
        ) {
          updateData.started_at = new Date();
          updateData.stopped_at = null;
        }
      }

      if (updateDto.traderAddress !== undefined) {
        updateData.trader_address = updateDto.traderAddress?.trim() || null;
      }

      const bot = await this.prisma.copyTradeBot.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        data: this.mapBotToResponse(bot),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update copy trade bot',
      };
    }
  }

  /**
   * Delete a bot (ensures user owns the bot)
   */
  async remove(id: string, userId: string) {
    try {
      // Verify bot exists and belongs to user
      const existingBot = await this.prisma.copyTradeBot.findFirst({
        where: {
          id,
          user_id: userId,
        },
      });

      if (!existingBot) {
        return {
          success: false,
          error: 'Copy trade bot not found',
        };
      }

      await this.prisma.copyTradeBot.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Copy trade bot deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete copy trade bot',
      };
    }
  }
}
