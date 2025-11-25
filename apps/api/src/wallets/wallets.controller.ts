import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
  HttpException,
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
   * Get trading account balance for authenticated user
   * GET /api/wallets/balance
   *
   * Security: Requires JWT authentication
   * Returns: Trading account balance from Kana API (in USDT)
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

      // Fetch trading account balance from Kana API
      const balance =
        await this.walletsService.getTradingBalance(walletAddress);

      return {
        success: true,
        balance: balance.toFixed(2),
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
   * Get wallet account balance (raw USDT in wallet)
   * GET /api/wallets/wallet-balance
   *
   * Security: Requires JWT authentication
   * Returns: Wallet account balance from Kana API
   */
  @Get('wallet-balance')
  @UseGuards(AuthGuard)
  async getWalletAccountBalance(@Request() req: any) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const walletAddress = await this.walletsService.getWalletAddress(userId);
      if (!walletAddress) {
        throw new HttpException(
          { success: false, error: 'Wallet not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      const balance =
        await this.walletsService.getWalletAccountBalance(walletAddress);

      return {
        success: true,
        balance: balance.toFixed(2),
      };
    } catch (error: any) {
      console.error('Error in getWalletAccountBalance:', error);
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
   * Get trading account balance
   * GET /api/wallets/trading-balance
   *
   * Security: Requires JWT authentication
   * Returns: Trading account balance from Kana API
   */
  @Get('trading-balance')
  @UseGuards(AuthGuard)
  async getTradingBalance(@Request() req: any) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const walletAddress = await this.walletsService.getWalletAddress(userId);
      if (!walletAddress) {
        throw new HttpException(
          { success: false, error: 'Wallet not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      const balance =
        await this.walletsService.getTradingBalance(walletAddress);

      return {
        success: true,
        balance: balance.toFixed(2),
      };
    } catch (error: any) {
      console.error('Error in getTradingBalance:', error);
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
   * Debug endpoint: Get wallet info including encrypted private key (for debugging only)
   * GET /api/wallets/debug/info
   *
   * Security: Requires JWT authentication
   * Returns: Wallet address and encrypted private key (for debugging)
   */
  @Get('debug/info')
  @UseGuards(AuthGuard)
  async getDebugInfo(@Request() req: any) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const wallet = await this.walletsService.getWalletAddress(userId);
      if (!wallet) {
        throw new HttpException(
          { success: false, error: 'Wallet not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Get debug info including encrypted private key (for debugging only)
      const debugInfo = await this.walletsService.getDebugInfo(userId);

      return {
        success: true,
        walletAddress: debugInfo.walletAddress,
        encryptedPrivateKey: debugInfo.encryptedPrivateKey, // This is encrypted, not the actual key
        note: 'Private key is encrypted. This is for debugging purposes only.',
      };
    } catch (error: any) {
      console.error('Error in getDebugInfo:', error);
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
   * Test deposit with specific amount (for debugging)
   * POST /api/wallets/debug/deposit
   *
   * Security: Requires JWT authentication
   * Body: { amount: number }
   * Returns: Deposit result
   */
  @Post('debug/deposit')
  @UseGuards(AuthGuard)
  async testDeposit(@Request() req: any) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const { amount } = req.body;
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new HttpException(
          { success: false, error: 'Valid amount is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.walletsService.depositToTrading(userId, amount);

      return {
        success: result.success,
        txHash: result.txHash,
        error: result.error,
      };
    } catch (error: any) {
      console.error('Error in testDeposit:', error);
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
   * Check wallet balance and auto-deposit to trading account
   * POST /api/wallets/check-and-deposit
   *
   * Security: Requires JWT authentication
   * Returns: Wallet balance, trading balance, and deposit status
   */
  @Post('check-and-deposit')
  @UseGuards(AuthGuard)
  async checkAndDeposit(@Request() req: any) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.walletsService.checkWalletAndDeposit(userId);

      return {
        success: result.success,
        walletBalance: result.walletBalance.toFixed(2),
        tradingBalance: result.tradingBalance.toFixed(2),
        deposited: result.deposited,
        txHash: result.txHash,
        error: result.error,
      };
    } catch (error: any) {
      console.error('Error in checkAndDeposit:', error);
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
