import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
  HttpException,
  Query,
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
   * Get positions for authenticated user
   * GET /api/wallets/positions
   *
   * Security: Requires JWT authentication
   * Query params: marketId (optional) - Filter by market ID
   * Returns: Array of positions from Kana API
   */
  @Get('positions')
  @UseGuards(AuthGuard)
  async getPositions(
    @Request() req: any,
    @Query('marketId') marketId?: string,
  ) {
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

      const positions = await this.walletsService.getPositions(
        walletAddress,
        marketId,
      );

      return {
        success: true,
        data: positions,
      };
    } catch (error: any) {
      console.error('Error in getPositions:', error);
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
   * Get order history for authenticated user
   * GET /api/wallets/order-history
   *
   * Security: Requires JWT authentication
   * Query params: marketId (optional) - Filter by market ID
   * Returns: Array of order history from Kana API
   */
  @Get('order-history')
  @UseGuards(AuthGuard)
  async getOrderHistory(
    @Request() req: any,
    @Query('marketId') marketId?: string,
  ) {
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

      const orderHistory = await this.walletsService.getOrderHistory(
        walletAddress,
        marketId,
      );

      return {
        success: true,
        data: orderHistory,
      };
    } catch (error: any) {
      console.error('Error in getOrderHistory:', error);
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
   * Get trade history for authenticated user
   * GET /api/wallets/getTradeHistory
   *
   * Security: Requires JWT authentication
   * Query params: marketId (optional) - Filter by market ID
   * Returns: Array of trade history from Kana API
   */
  @Get('getTradeHistory')
  @UseGuards(AuthGuard)
  async getTradeHistory(
    @Request() req: any,
    @Query('marketId') marketId?: string,
  ) {
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

      const tradeHistory = await this.walletsService.getTradeHistory(
        walletAddress,
        marketId,
      );

      return {
        success: true,
        data: tradeHistory,
      };
    } catch (error: any) {
      console.error('Error in getTradeHistory:', error);
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

  /**
   * Withdraw from Kana trading account
   * POST /api/wallets/withdraw
   *
   * Security: Requires JWT authentication
   * Body: { amount: number, marketId: string }
   * Returns: Withdrawal result with transaction hash
   */
  @Post('withdraw')
  @UseGuards(AuthGuard)
  async withdrawFromKana(
    @Request() req: any,
    @Body('amount') amount: number,
    @Body('marketId') marketId: string,
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new HttpException(
          { success: false, error: 'Valid amount is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!marketId || typeof marketId !== 'string') {
        throw new HttpException(
          { success: false, error: 'Market ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.walletsService.withdrawFromKana(
        userId,
        amount,
        marketId,
      );

      return result;
    } catch (error: any) {
      console.error('Error in withdrawFromKana:', error);
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
   * Transfer USDT from user's wallet to a destination address
   * POST /api/wallets/transfer
   *
   * Security: Requires JWT authentication
   * Body: { recipientAddress: string, amount: number }
   * Returns: Transfer result with transaction hash
   */
  @Post('transfer')
  @UseGuards(AuthGuard)
  async transferUSDT(
    @Request() req: any,
    @Body('recipientAddress') recipientAddress: string,
    @Body('amount') amount: number,
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new HttpException(
          { success: false, error: 'User ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!recipientAddress || typeof recipientAddress !== 'string') {
        throw new HttpException(
          { success: false, error: 'Recipient address is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new HttpException(
          { success: false, error: 'Valid amount is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.walletsService.transferUSDTToAddress(
        userId,
        recipientAddress,
        amount,
      );

      return result;
    } catch (error: any) {
      console.error('Error in transferUSDT:', error);
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
