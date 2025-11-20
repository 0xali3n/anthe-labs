import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateCopyTradeBotDto } from './dto/create-copy-trade-bot.dto';
import { UpdateCopyTradeBotDto } from './dto/update-copy-trade-bot.dto';

export interface BotResponse {
  id: string;
  userAddress: string;
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
  private readonly logger = new Logger(CopyTradeBotsService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  /**
   * Generate a unique 8-9 character bot ID
   * Format: Mix of numbers and uppercase letters (e.g., "A7B9C2D4", "12345678")
   */
  private generateBotId(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    const length = 8 + Math.floor(Math.random() * 2); // 8 or 9 characters
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Sync bot start to Redis
   * - Add user to trader's subscriber set
   * - Add trader to active profiles set
   */
  async syncStartBot(userAddress: string, traderAddress: string): Promise<void> {
    try {
      if (!traderAddress) {
        this.logger.warn('syncStartBot called without traderAddress, skipping Redis sync');
        return;
      }

      const subscriberKey = `subs:profile:${traderAddress}`;
      const activeProfilesKey = 'profiles:active';

      // Add user to trader's subscriber set (idempotent)
      await this.redisService.sadd(subscriberKey, userAddress);

      // Add trader to active profiles set (idempotent)
      await this.redisService.sadd(activeProfilesKey, traderAddress);

      this.logger.log(`Redis sync: Bot started - user ${userAddress} subscribed to trader ${traderAddress}`);
    } catch (error: any) {
      // Log error but don't fail the operation
      this.logger.error(`Redis sync error in syncStartBot: ${error.message}`, error.stack);
    }
  }

  /**
   * Sync bot stop to Redis
   * - Remove user from trader's subscriber set
   * - If no more subscribers, remove trader from active profiles set
   */
  async syncStopBot(userAddress: string, traderAddress: string): Promise<void> {
    try {
      if (!traderAddress) {
        this.logger.warn('syncStopBot called without traderAddress, skipping Redis sync');
        return;
      }

      const subscriberKey = `subs:profile:${traderAddress}`;
      const activeProfilesKey = 'profiles:active';

      // Remove user from trader's subscriber set (idempotent)
      await this.redisService.srem(subscriberKey, userAddress);

      // Check if trader has any remaining subscribers
      const subscriberCount = await this.redisService.scard(subscriberKey);

      // If no subscribers left, remove trader from active profiles (idempotent)
      if (subscriberCount === 0) {
        await this.redisService.srem(activeProfilesKey, traderAddress);
        this.logger.log(`Redis sync: Bot stopped - trader ${traderAddress} removed from active profiles (no subscribers)`);
      } else {
        this.logger.log(`Redis sync: Bot stopped - user ${userAddress} unsubscribed from trader ${traderAddress} (${subscriberCount} remaining)`);
      }
    } catch (error: any) {
      // Log error but don't fail the operation
      this.logger.error(`Redis sync error in syncStopBot: ${error.message}`, error.stack);
    }
  }

  /**
   * Map Prisma bot model to API response format
   */
  private mapBotToResponse(bot: any): BotResponse {
    return {
      id: bot.id,
      userAddress: bot.user_address,
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
  async create(userAddress: string, createDto: CreateCopyTradeBotDto) {
    try {
      // Sanitize trader address if provided
      const traderAddress = createDto.traderAddress?.trim() || null;

      // Generate unique bot ID (8-9 characters)
      let botId: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        botId = this.generateBotId();
        const existing = await this.prisma.copyTradeBot.findUnique({
          where: { id: botId },
        });
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return {
          success: false,
          error: 'Failed to generate unique bot ID. Please try again.',
        };
      }

      const bot = await this.prisma.copyTradeBot.create({
        data: {
          id: botId,
          user_address: userAddress,
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

      // Sync to Redis after successful Postgres write
      if (traderAddress) {
        await this.syncStartBot(userAddress, traderAddress);
      }

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
   * Get all bots for a user by wallet address
   */
  async findByUserAddress(userAddress: string) {
    try {
      const bots = await this.prisma.copyTradeBot.findMany({
        where: { user_address: userAddress },
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
  async findOne(id: string, userAddress: string) {
    try {
      const bot = await this.prisma.copyTradeBot.findFirst({
        where: {
          id,
          user_address: userAddress,
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
  async update(id: string, userAddress: string, updateDto: UpdateCopyTradeBotDto) {
    try {
      // Verify bot exists and belongs to user
      const existingBot = await this.prisma.copyTradeBot.findFirst({
        where: {
          id,
          user_address: userAddress,
        },
        select: {
          status: true,
          trader_address: true,
        },
      });

      if (!existingBot) {
        return {
          success: false,
          error: 'Copy trade bot not found',
        };
      }

      const updateData: any = {};
      const oldStatus = existingBot.status;
      const oldTraderAddress = existingBot.trader_address;

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

      // Sync to Redis after successful Postgres update
      const newStatus = updateData.status || oldStatus;
      const newTraderAddress = updateData.trader_address !== undefined 
        ? updateData.trader_address 
        : oldTraderAddress;

      // Handle status changes
      if (newStatus === 'stopped' && oldStatus === 'running' && oldTraderAddress) {
        // Bot stopped: remove from Redis
        await this.syncStopBot(userAddress, oldTraderAddress);
      } else if (newStatus === 'running' && oldStatus === 'stopped' && newTraderAddress) {
        // Bot restarted: add to Redis
        await this.syncStartBot(userAddress, newTraderAddress);
      }

      // Handle trader address changes
      if (oldTraderAddress !== newTraderAddress) {
        if (oldStatus === 'running' && oldTraderAddress) {
          // Remove from old trader
          await this.syncStopBot(userAddress, oldTraderAddress);
        }
        if (newStatus === 'running' && newTraderAddress) {
          // Add to new trader
          await this.syncStartBot(userAddress, newTraderAddress);
        }
      }

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
  async remove(id: string, userAddress: string) {
    try {
      // Verify bot exists and belongs to user
      const existingBot = await this.prisma.copyTradeBot.findFirst({
        where: {
          id,
          user_address: userAddress,
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
