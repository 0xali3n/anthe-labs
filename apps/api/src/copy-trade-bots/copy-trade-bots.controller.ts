import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CopyTradeBotsService } from './copy-trade-bots.service';
import { CreateCopyTradeBotDto } from './dto/create-copy-trade-bot.dto';
import { UpdateCopyTradeBotDto } from './dto/update-copy-trade-bot.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('copy-trade-bots')
export class CopyTradeBotsController {
  constructor(
    private readonly copyTradeBotsService: CopyTradeBotsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper method to get user wallet address from user ID
   */
  private async getUserWalletAddress(userId: string): Promise<string | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { user_id: userId },
      select: { address: true },
    });
    return wallet?.address || null;
  }

  /**
   * Create a new copy trade bot
   * POST /copy-trade-bots
   */
  @Post()
  @UseGuards(AuthGuard)
  async create(@Request() req: any, @Body() createDto: CreateCopyTradeBotDto) {
    try {
      if (!req.user?.id) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      // Get user wallet address
      const userAddress = await this.getUserWalletAddress(req.user.id);
      if (!userAddress) {
        return {
          success: false,
          error: 'User wallet not found. Please connect your wallet first.',
        };
      }

      const result = await this.copyTradeBotsService.create(
        userAddress,
        createDto,
      );
      return result;
    } catch (error: any) {
      console.error(
        '[CopyTradeBotController] Unexpected error in create:',
        error,
      );
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  /**
   * Get all bots for current user
   * GET /copy-trade-bots/me
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMyBots(@Request() req: any) {
    try {
      if (!req.user?.id) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const userAddress = await this.getUserWalletAddress(req.user.id);
      if (!userAddress) {
        return {
          success: false,
          error: 'User wallet not found. Please connect your wallet first.',
        };
      }

      return this.copyTradeBotsService.findByUserAddress(userAddress);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch bots',
      };
    }
  }

  /**
   * Get a single bot by ID
   * GET /copy-trade-bots/:id
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Request() req: any, @Param('id') id: string) {
    try {
      if (!req.user?.id) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const userAddress = await this.getUserWalletAddress(req.user.id);
      if (!userAddress) {
        return {
          success: false,
          error: 'User wallet not found. Please connect your wallet first.',
        };
      }

      return this.copyTradeBotsService.findOne(id, userAddress);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch bot',
      };
    }
  }

  /**
   * Update bot (stop/restart/update trader address)
   * PUT /copy-trade-bots/:id
   */
  @Put(':id')
  @UseGuards(AuthGuard)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateCopyTradeBotDto,
  ) {
    try {
      if (!req.user?.id) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const userAddress = await this.getUserWalletAddress(req.user.id);
      if (!userAddress) {
        return {
          success: false,
          error: 'User wallet not found. Please connect your wallet first.',
        };
      }

      return this.copyTradeBotsService.update(id, userAddress, updateDto);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update bot',
      };
    }
  }

  /**
   * Delete a bot
   * DELETE /copy-trade-bots/:id
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Request() req: any, @Param('id') id: string) {
    try {
      if (!req.user?.id) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const userAddress = await this.getUserWalletAddress(req.user.id);
      if (!userAddress) {
        return {
          success: false,
          error: 'User wallet not found. Please connect your wallet first.',
        };
      }

      return this.copyTradeBotsService.remove(id, userAddress);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete bot',
      };
    }
  }
}
