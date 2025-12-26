import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WalletsService } from '../wallets/wallets.service';
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
    private walletsService: WalletsService,
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
   * - Add user to trader's subscriber Hash with allocated amount
   * - Check if trader is in active profiles set
   * - If not in active profiles, add to not_synced set
   * - If already in active profiles, do nothing (keep existing behavior)
   */
  async syncStartBot(
    userAddress: string,
    traderAddress: string,
    allocatedAmount: string,
  ): Promise<void> {
    try {
      if (!traderAddress) {
        this.logger.warn(
          'syncStartBot called without traderAddress, skipping Redis sync',
        );
        return;
      }

      const subscriberKey = `subs:profile:${traderAddress}`;
      const activeProfilesKey = 'profiles:active';
      const notSyncedKey = 'profiles:not_synced';

      // Add user to trader's subscriber Hash with allocated amount (idempotent)
      // Hash structure: field = userAddress, value = allocatedAmount
      await this.redisService.hset(subscriberKey, userAddress, allocatedAmount);

      // Check if trader address is already in active profiles
      const isInActive = await this.redisService.sismember(
        activeProfilesKey,
        traderAddress,
      );

      if (isInActive) {
        // Already in active profiles, do nothing (existing behavior)
        this.logger.log(
          `Redis sync: Bot started - user ${userAddress} subscribed to trader ${traderAddress} with amount ${allocatedAmount} (already in active profiles)`,
        );
      } else {
        // Check if already in not_synced to avoid duplicate signals
        const isInNotSynced = await this.redisService.sismember(
          notSyncedKey,
          traderAddress,
        );

        // Not in active profiles, add to not_synced set (idempotent)
        await this.redisService.sadd(notSyncedKey, traderAddress);

        // Only send signal if it's a new addition (not already in not_synced)
        if (!isInNotSynced) {
          await this.redisService.publish('ws:check', 'new_address');
          this.logger.log(
            `Redis sync: Bot started - user ${userAddress} subscribed to trader ${traderAddress} with amount ${allocatedAmount} (added to not_synced, signal sent)`,
          );
        } else {
          this.logger.log(
            `Redis sync: Bot started - user ${userAddress} subscribed to trader ${traderAddress} with amount ${allocatedAmount} (already in not_synced, no signal)`,
          );
        }
      }
    } catch (error: any) {
      // Log error but don't fail the operation
      this.logger.error(
        `Redis sync error in syncStartBot: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Sync bot stop to Redis
   * - Remove user from trader's subscriber Hash
   * - If no more subscribers, remove trader from active profiles set
   * - Also remove from not_synced set if present
   */
  async syncStopBot(userAddress: string, traderAddress: string): Promise<void> {
    try {
      if (!traderAddress) {
        this.logger.warn(
          'syncStopBot called without traderAddress, skipping Redis sync',
        );
        return;
      }

      const subscriberKey = `subs:profile:${traderAddress}`;
      const activeProfilesKey = 'profiles:active';
      const notSyncedKey = 'profiles:not_synced';

      // Remove user from trader's subscriber Hash (idempotent)
      await this.redisService.hdel(subscriberKey, userAddress);

      // Check if trader has any remaining subscribers (using Hash length)
      const subscriberCount = await this.redisService.hlen(subscriberKey);

      // If no subscribers left, remove trader from active profiles and not_synced (idempotent)
      if (subscriberCount === 0) {
        await this.redisService.srem(activeProfilesKey, traderAddress);
        await this.redisService.srem(notSyncedKey, traderAddress);
        // Also delete the empty Hash to clean up
        await this.redisService.del(subscriberKey);
        this.logger.log(
          `Redis sync: Bot stopped - trader ${traderAddress} removed from active profiles and not_synced (no subscribers)`,
        );

        // Signal WS service to unsubscribe (only when all bots for this address are stopped)
        await this.redisService.publish(
          'ws:check',
          `unsubscribe:${traderAddress}`,
        );
        this.logger.log(
          `Redis sync: Published unsubscribe signal for trader ${traderAddress}`,
        );
      } else {
        this.logger.log(
          `Redis sync: Bot stopped - user ${userAddress} unsubscribed from trader ${traderAddress} (${subscriberCount} remaining)`,
        );
      }
    } catch (error: any) {
      // Log error but don't fail the operation
      this.logger.error(
        `Redis sync error in syncStopBot: ${error.message}`,
        error.stack,
      );
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
        await this.syncStartBot(
          userAddress,
          traderAddress,
          createDto.allocatedAmount.toString(),
        );
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
  async update(
    id: string,
    userAddress: string,
    updateDto: UpdateCopyTradeBotDto,
  ) {
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
          allocated_amount: true,
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
      const oldAllocatedAmount = existingBot.allocated_amount;

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

      if (updateDto.allocatedAmount !== undefined) {
        updateData.allocated_amount = updateDto.allocatedAmount;
      }

      const bot = await this.prisma.copyTradeBot.update({
        where: { id },
        data: updateData,
      });

      // Sync to Redis after successful Postgres update
      const newStatus = updateData.status || oldStatus;
      const newTraderAddress =
        updateData.trader_address !== undefined
          ? updateData.trader_address
          : oldTraderAddress;
      const newAllocatedAmount =
        updateData.allocated_amount !== undefined
          ? updateData.allocated_amount
          : oldAllocatedAmount;

      // Handle status changes
      if (
        newStatus === 'stopped' &&
        oldStatus === 'running' &&
        oldTraderAddress
      ) {
        // Bot stopped: close all positions across all market IDs
        try {
          // Get user ID from wallet address
          const wallet = await this.prisma.wallet.findUnique({
            where: { address: userAddress },
            select: { user_id: true },
          });

          if (wallet?.user_id) {
            this.logger.log(
              `Closing all positions for user ${wallet.user_id} (bot stopped)`,
            );
            const closeResult = await this.walletsService.closeAllPositions(
              wallet.user_id,
            );
            if (closeResult.success) {
              this.logger.log(
                `✅ All positions closed successfully. TX: ${closeResult.txHash}`,
              );
            } else {
              this.logger.warn(
                `⚠️ Failed to close positions: ${closeResult.error}`,
              );
            }
          }
        } catch (error: any) {
          // Log error but don't fail bot stop
          this.logger.error(
            `Error closing positions on bot stop: ${error.message}`,
            error.stack,
          );
        }

        // Bot stopped: remove from Redis
        await this.syncStopBot(userAddress, oldTraderAddress);
      } else if (
        newStatus === 'running' &&
        oldStatus === 'stopped' &&
        newTraderAddress
      ) {
        // Bot restarted: add to Redis with current allocated amount
        await this.syncStartBot(
          userAddress,
          newTraderAddress,
          newAllocatedAmount.toString(),
        );
      }

      // Handle trader address changes
      if (oldTraderAddress !== newTraderAddress) {
        if (oldStatus === 'running' && oldTraderAddress) {
          // Remove from old trader
          await this.syncStopBot(userAddress, oldTraderAddress);
        }
        if (newStatus === 'running' && newTraderAddress) {
          // Add to new trader with current allocated amount
          await this.syncStartBot(
            userAddress,
            newTraderAddress,
            newAllocatedAmount.toString(),
          );
        }
      }

      // Handle allocated amount changes (if bot is running and trader address exists)
      if (
        newStatus === 'running' &&
        newTraderAddress &&
        oldAllocatedAmount !== newAllocatedAmount
      ) {
        // Update allocated amount in Redis Hash
        const subscriberKey = `subs:profile:${newTraderAddress}`;
        await this.redisService.hset(
          subscriberKey,
          userAddress,
          newAllocatedAmount.toString(),
        );
        this.logger.log(
          `Redis sync: Updated allocated amount for user ${userAddress} on trader ${newTraderAddress} to ${newAllocatedAmount}`,
        );
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

      // Sync to Redis before deletion if bot is running and has a trader
      if (existingBot.status === 'running' && existingBot.trader_address) {
        // Close all positions across all market IDs before stopping bot
        try {
          // Get user ID from wallet address
          const wallet = await this.prisma.wallet.findUnique({
            where: { address: userAddress },
            select: { user_id: true },
          });

          if (wallet?.user_id) {
            this.logger.log(
              `Closing all positions for user ${wallet.user_id} (bot deletion)`,
            );
            const closeResult = await this.walletsService.closeAllPositions(
              wallet.user_id,
            );
            if (closeResult.success) {
              this.logger.log(
                `✅ All positions closed successfully. TX: ${closeResult.txHash}`,
              );
            } else {
              this.logger.warn(
                `⚠️ Failed to close positions: ${closeResult.error}`,
              );
            }
          }
        } catch (error: any) {
          // Log error but don't fail bot deletion
          this.logger.error(
            `Error closing positions on bot deletion: ${error.message}`,
            error.stack,
          );
        }

        await this.syncStopBot(userAddress, existingBot.trader_address);
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
