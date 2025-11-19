import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCopyTradeBotDto } from './dto/create-copy-trade-bot.dto';
import { UpdateCopyTradeBotDto } from './dto/update-copy-trade-bot.dto';

@Injectable()
export class CopyTradeBotsService {
  constructor(private prisma: PrismaService) {}

  // Create a new copy trade bot
  async create(userId: string, createDto: CreateCopyTradeBotDto) {
    try {
      const bot = await this.prisma.copyTradeBot.create({
        data: {
          user_id: userId,
          trader_address: createDto.traderAddress || null,
          allocated_amount: createDto.allocatedAmount,
          allocation_percent: createDto.allocationPercent,
          mode: createDto.mode || 'smart_ratio',
          status: 'running',
          // Mock stats for now (will fetch from different table in future)
          total_trades: Math.floor(Math.random() * 50), // Random 0-50 trades
          pnl: Math.random() * 200 - 100, // Random PNL between -100 and 100
        },
      });

      return {
        success: true,
        data: {
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
          startedAt: bot.started_at,
        },
      };
    } catch (error: any) {
      console.error('Error creating copy trade bot:', error);
      return {
        success: false,
        error: error.message || 'Failed to create copy trade bot',
      };
    }
  }

  // Get all bots for a user
  async findByUserId(userId: string) {
    try {
      const bots = await this.prisma.copyTradeBot.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      return {
        success: true,
        data: bots.map((bot) => ({
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
        })),
      };
    } catch (error: any) {
      console.error('Error fetching copy trade bots:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch copy trade bots',
      };
    }
  }

  // Get a single bot by ID
  async findOne(id: string, userId: string) {
    try {
      const bot = await this.prisma.copyTradeBot.findFirst({
        where: {
          id,
          user_id: userId, // Ensure user owns this bot
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
        data: {
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
        },
      };
    } catch (error: any) {
      console.error('Error fetching copy trade bot:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch copy trade bot',
      };
    }
  }

  // Update bot status (stop/restart)
  async update(id: string, userId: string, updateDto: UpdateCopyTradeBotDto) {
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

      const updateData: any = {};
      if (updateDto.status) {
        updateData.status = updateDto.status;
        if (updateDto.status === 'stopped') {
          updateData.stopped_at = new Date();
        } else if (updateDto.status === 'running' && existingBot.status === 'stopped') {
          updateData.started_at = new Date();
          updateData.stopped_at = null;
        }
      }
      if (updateDto.traderAddress !== undefined) {
        updateData.trader_address = updateDto.traderAddress;
      }

      const bot = await this.prisma.copyTradeBot.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        data: {
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
        },
      };
    } catch (error: any) {
      console.error('Error updating copy trade bot:', error);
      return {
        success: false,
        error: error.message || 'Failed to update copy trade bot',
      };
    }
  }

  // Delete a bot
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
      console.error('Error deleting copy trade bot:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete copy trade bot',
      };
    }
  }
}

