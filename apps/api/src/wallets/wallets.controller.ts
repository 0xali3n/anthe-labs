import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
  HttpException,
  Body,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  /**
   * Create or get wallet for authenticated user
   * POST /api/wallets
   *
   * Security: Requires JWT authentication
   * Returns: Wallet address only (private key NEVER returned)
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async createOrGetWallet(@Request() req: any) {
    try {
      // Get userId from authenticated JWT token
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.walletsService.createOrGetWallet(userId);

      return {
        success: true,
        address: result.address,
        isNew: result.isNew,
      };
    } catch (error: any) {
      console.error('Error in createOrGetWallet:', error);
      throw new HttpException(
        { success: false, error: error.message || 'Internal server error' },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get wallet address for authenticated user
   * GET /api/wallets/me
   *
   * Security: Requires JWT authentication
   * Returns: Wallet address only
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMyWallet(@Request() req: any) {
    try {
      // Get userId from authenticated JWT token
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const address = await this.walletsService.getWalletAddress(userId);

      if (!address) {
        throw new HttpException(
          { success: false, error: 'Wallet not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        address: address,
      };
    } catch (error: any) {
      console.error('Error in getMyWallet:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, error: error.message || 'Internal server error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get USDT balance for authenticated user's wallet
   * GET /api/wallets/balance
   *
   * Security: Requires JWT authentication
   * Returns: USDT balance as string
   */
  @Get('balance')
  @UseGuards(AuthGuard)
  async getBalance(@Request() req: any) {
    try {
      // Get userId from authenticated JWT token
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get wallet address
      const walletAddress = await this.walletsService.getWalletAddress(userId);

      if (!walletAddress) {
        throw new HttpException(
          { success: false, error: 'Wallet not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Fetch USDT balance from Aptos blockchain
      const balance = await this.walletsService.getUSDTBalance(walletAddress);

      return {
        success: true,
        balance: balance,
        address: walletAddress,
      };
    } catch (error: any) {
      console.error('Error in getBalance:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, error: error.message || 'Internal server error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check deposit and trigger airdrop if it's the first deposit
   * POST /api/wallets/check-deposit
   * 
   * Security: Requires JWT authentication
   * Returns: Balance and airdrop status
   */
  @Post('check-deposit')
  @UseGuards(AuthGuard)
  async checkDeposit(@Request() req: any) {
    try {
      // Get userId from authenticated JWT token
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check deposit and trigger airdrop if needed
      const result = await this.walletsService.checkDepositAndAirdrop(userId);

      return result;
    } catch (error: any) {
      console.error('Error in checkDeposit:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, error: error.message || 'Internal server error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Withdraw USDT from user's wallet to external address
   * POST /api/wallets/withdraw
   * 
   * Security: Requires JWT authentication
   * Body: { recipientAddress: string, amount: string }
   * Returns: Transaction hash if successful
   */
  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async withdrawUSDT(
    @Request() req: any,
    @Body() body: { recipientAddress: string; amount: string },
  ) {
    try {
      // Get userId from authenticated JWT token
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate request body
      if (!body.recipientAddress || !body.amount) {
        throw new HttpException(
          { success: false, error: 'recipientAddress and amount are required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Withdraw USDT
      const result = await this.walletsService.withdrawUSDT(
        userId,
        body.recipientAddress,
        body.amount,
      );

      return result;
    } catch (error: any) {
      console.error('Error in withdrawUSDT:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, error: error.message || 'Internal server error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
