import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { AirdropService } from './airdrop.service';
import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
} from '@aptos-labs/ts-sdk';
import axios from 'axios';

/**
 * Wallets Service
 *
 * Security Features:
 * - Wallet generation happens ONLY on backend
 * - Private keys are encrypted before storage
 * - Private keys NEVER sent to frontend
 * - One wallet per user (enforced)
 */
@Injectable()
export class WalletsService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private airdropService: AirdropService,
  ) {}

  /**
   * Create or get Aptos wallet for a user
   * - If wallet exists, return it (without private key)
   * - If not, generate new wallet and store encrypted private key
   *
   * @param userId - User ID from Supabase auth
   * @returns Wallet address (private key is NEVER returned)
   */
  async createOrGetWallet(userId: string): Promise<{
    address: string;
    isNew: boolean;
  }> {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID');
      }

      // Check if wallet already exists
      const existingWallet = await this.prisma.wallet.findUnique({
        where: { user_id: userId },
        select: {
          address: true,
          created_at: true,
        },
      });

      if (existingWallet) {
        // Wallet exists, return address only (no private key)
        return {
          address: existingWallet.address,
          isNew: false,
        };
      }

      // Generate new Aptos wallet
      const account = Account.generate();
      const address = account.accountAddress.toString();
      const privateKey = account.privateKey.toString();

      // Encrypt private key before storing
      const encryptedPrivateKey = this.encryptionService.encrypt(privateKey);

      // Verify encryption worked (should be in format: iv:tag:encryptedData)
      if (!encryptedPrivateKey || !encryptedPrivateKey.includes(':')) {
        throw new Error('Encryption failed - invalid format');
      }

      // Store wallet in database
      const wallet = await this.prisma.wallet.create({
        data: {
          user_id: userId,
          address: address,
          key: encryptedPrivateKey,
        },
      });

      // Verify encrypted key was stored
      if (!wallet.key || wallet.key.length === 0) {
        throw new Error('Failed to store encrypted private key');
      }

      // Return address only (private key is NEVER returned)
      return {
        address: address,
        isNew: true,
      };
    } catch (error: any) {
      console.error(`❌ Error creating wallet for user ${userId}:`, error);

      if (error.code === 'P2002') {
        // Unique constraint violation (race condition)
        // Wallet was created by another request, fetch it
        const wallet = await this.prisma.wallet.findUnique({
          where: { user_id: userId },
          select: { address: true },
        });
        if (wallet) {
          return {
            address: wallet.address,
            isNew: false,
          };
        }
      }

      // Re-throw with more context
      const errorMessage = error.message || 'Unknown error';
      throw new Error(`Failed to create wallet: ${errorMessage}`);
    }
  }

  /**
   * Get wallet address for a user (public info only)
   */
  async getWalletAddress(userId: string): Promise<string | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { user_id: userId },
      select: { address: true },
    });

    return wallet?.address || null;
  }

  /**
   * Internal: Decrypt and get private key (for backend operations only)
   * WARNING: This should only be used for server-side operations like signing transactions
   * NEVER expose this to frontend!
   */
  async getPrivateKeyForSigning(userId: string): Promise<string> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { user_id: userId },
      select: { key: true },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Decrypt private key
    const privateKey = this.encryptionService.decrypt(wallet.key);
    return privateKey;
  }

  /**
   * Get USDT balance for a wallet address
   * Fetches real-time balance from Aptos blockchain using view function
   *
   * @param walletAddress - Aptos wallet address
   * @returns USDT balance as string (formatted with 2 decimals)
   */
  async getUSDTBalance(walletAddress: string): Promise<string> {
    try {
      // Hardcoded to mainnet
      const network = 'mainnet' as Network;
      const config = new AptosConfig({ network });
      const aptos = new Aptos(config);

      // USDT Fungible Asset Metadata Address on Aptos Mainnet
      // Source: https://aptoscan.com/fungible-asset/0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b
      const usdtMetadataAddress =
        '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b';

      // Use view function to get fungible asset balance
      // This is the recommended approach for fungible assets
      const [balanceStr] = await aptos.view<[string]>({
        payload: {
          function: '0x1::primary_fungible_store::balance',
          typeArguments: ['0x1::object::ObjectCore'],
          functionArguments: [walletAddress, usdtMetadataAddress],
        },
      });

      const balance = balanceStr || '0';

      // Convert from smallest unit to USDT
      // USDT has 6 decimals on Aptos
      const balanceInUSDT = (Number(balance) / 1000000).toFixed(2);

      return balanceInUSDT;
    } catch (error: any) {
      console.error(
        `Error fetching USDT balance for ${walletAddress}:`,
        error.message,
      );

      // If balance is 0 or resource doesn't exist, return "0.00"
      if (
        error.message?.includes('RESOURCE_NOT_FOUND') ||
        error.message?.includes('not found') ||
        error.statusCode === 404
      ) {
        return '0.00';
      }

      // For other errors, return 0.00 as fallback
      return '0.00';
    }
  }

  /**
   * Check deposit and trigger airdrop if it's the first deposit
   * This should be called when checking balance after a potential deposit
   *
   * @param userId - User ID
   * @returns Object with balance and airdrop status
   */
  async checkDepositAndAirdrop(userId: string): Promise<{
    success: boolean;
    balance: string;
    airdropped?: boolean;
    airdropTxHash?: string;
    error?: string;
  }> {
    try {
      // Get wallet address
      const walletAddress = await this.getWalletAddress(userId);
      if (!walletAddress) {
        return {
          success: false,
          balance: '0.00',
          error: 'Wallet not found',
        };
      }

      // Check both blockchain balance and Kana wallet account balance
      // Deposits may appear in either location first
      const [blockchainBalance, kanaWalletBalance] = await Promise.all([
        this.getUSDTBalance(walletAddress),
        this.getWalletAccountBalance(walletAddress),
      ]);

      const blockchainBalanceNum = parseFloat(blockchainBalance);
      const kanaWalletBalanceNum = kanaWalletBalance;

      // Use the maximum of both balances as the actual balance
      const balance = Math.max(
        blockchainBalanceNum,
        kanaWalletBalanceNum,
      ).toFixed(2);
      const hasBalance = blockchainBalanceNum > 0 || kanaWalletBalanceNum > 0;

      // Get user record to check airdrop status
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          apt_airdropped: true,
        },
      });

      if (!user) {
        return {
          success: false,
          balance: '0.00',
          error: 'User not found',
        };
      }

      // If user has USDT balance and hasn't received airdrop yet, send it
      if (hasBalance && !user.apt_airdropped) {
        const airdropResult =
          await this.airdropService.sendAirdrop(walletAddress);

        if (airdropResult.success) {
          // Update user to mark airdrop as sent
          await this.prisma.user.update({
            where: { id: userId },
            data: { apt_airdropped: true },
          });

          return {
            success: true,
            balance,
            airdropped: true,
            airdropTxHash: airdropResult.txHash,
          };
        } else {
          return {
            success: true,
            balance,
            airdropped: false,
            error: `Airdrop failed: ${airdropResult.error}`,
          };
        }
      }

      // Return balance with airdrop status
      return {
        success: true,
        balance,
        airdropped: user.apt_airdropped,
      };
    } catch (error: any) {
      console.error(
        `Error in checkDepositAndAirdrop for user ${userId}:`,
        error,
      );
      return {
        success: false,
        balance: '0.00',
        error: error.message || 'Failed to check deposit',
      };
    }
  }

  /**
   * Get wallet account balance from Kana Labs API
   * Fetches raw USDT balance in the user's Aptos wallet
   *
   * @param walletAddress - Aptos wallet address
   * @returns USDT balance as number (in USDT, not smallest units)
   */
  async getWalletAccountBalance(walletAddress: string): Promise<number> {
    try {
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        throw new Error('Kana API key not configured');
      }

      const response = await axios.get(`${kanaRest}/getWalletAccountBalance`, {
        params: {
          userAddress: walletAddress,
        },
        headers: {
          'x-api-key': kanaApiKey,
        },
      });

      if (response.data.success && response.data.data !== undefined) {
        return Number(response.data.data);
      }

      return 0;
    } catch (error: any) {
      console.error(
        `Error fetching wallet account balance for ${walletAddress}:`,
        error.message,
      );
      return 0;
    }
  }

  /**
   * Get positions payload from Kana API (debug only - returns raw response)
   * This is useful for debugging what the API returns
   *
   * @param walletAddress - Wallet address
   * @param marketId - Optional market ID to filter positions
   * @returns Raw response from Kana API
   */
  async getPositionsPayload(
    walletAddress: string,
    marketId?: string,
  ): Promise<{
    success: boolean;
    data?: any;
    rawResponse?: any;
    error?: string;
  }> {
    try {
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        return {
          success: false,
          error: 'Kana API key not configured',
        };
      }

      const params: any = {
        userAddress: walletAddress,
      };

      if (marketId) {
        params.marketId = marketId;
      }

      console.log(
        `🔍 Debug: Calling Kana API getPositions with params:`,
        params,
      );
      console.log(`🔍 Debug: URL: ${kanaRest}/getPositions`);

      const response = await axios.get(`${kanaRest}/getPositions`, {
        params,
        headers: {
          'x-api-key': kanaApiKey,
        },
      });

      console.log(
        `🔍 Debug: Kana API getPositions Response:`,
        JSON.stringify(response.data, null, 2),
      );

      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          rawResponse: response.data,
        };
      }

      return {
        success: false,
        error: response.data.message || 'No positions data in response',
        rawResponse: response.data,
      };
    } catch (error: any) {
      console.error(`❌ Error getting positions payload:`, error);
      return {
        success: false,
        error: error.message || 'Failed to get positions payload',
        rawResponse: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get positions from Kana Labs API
   * Fetches open positions for a user's wallet address
   *
   * @param walletAddress - Aptos wallet address
   * @param marketId - Optional market ID to filter positions
   * @returns Array of position data
   */
  async getPositions(walletAddress: string, marketId?: string): Promise<any[]> {
    try {
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        throw new Error('Kana API key not configured');
      }

      const params: any = {
        userAddress: walletAddress,
      };

      if (marketId) {
        params.marketId = marketId;
      }

      const response = await axios.get(`${kanaRest}/getPositions`, {
        params,
        headers: {
          'x-api-key': kanaApiKey,
        },
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      console.error(
        `Error fetching positions for ${walletAddress}:`,
        error.message,
      );
      return [];
    }
  }

  /**
   * Get order history from Kana Labs API
   * Fetches order history for a user's wallet address
   *
   * @param walletAddress - Aptos wallet address
   * @param marketId - Optional market ID to filter order history
   * @returns Array of order history data
   */
  async getOrderHistory(
    walletAddress: string,
    marketId?: string,
  ): Promise<any[]> {
    try {
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        throw new Error('Kana API key not configured');
      }

      const params: any = {
        userAddress: walletAddress,
      };

      if (marketId) {
        params.marketId = marketId;
      }

      const response = await axios.get(`${kanaRest}/getOrderHistory`, {
        params,
        headers: {
          'x-api-key': kanaApiKey,
        },
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      console.error(
        `Error fetching order history for ${walletAddress}:`,
        error.message,
      );
      return [];
    }
  }

  /**
   * Get trade history from Kana Labs API
   * Fetches trade history for a user's wallet address
   *
   * @param walletAddress - Aptos wallet address
   * @param marketId - Optional market ID to filter trade history
   * @returns Array of trade history data
   */
  async getTradeHistory(
    walletAddress: string,
    marketId?: string,
  ): Promise<any[]> {
    try {
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        throw new Error('Kana API key not configured');
      }

      const params: any = {
        userAddress: walletAddress,
      };

      if (marketId) {
        params.marketId = marketId;
      }

      const response = await axios.get(`${kanaRest}/getTradeHistory`, {
        params,
        headers: {
          'x-api-key': kanaApiKey,
        },
        timeout: 15000,
      });

      if (response.data.success && response.data.data) {
        return response.data.data.sort((a: any, b: any) => {
          return (b.timestamp || 0) - (a.timestamp || 0);
        });
      }

      return [];
    } catch (error: any) {
      console.error('Error fetching trade history:', error.message);
      return [];
    }
  }

  /**
   * Get trading account balance from Kana Labs API
   * Fetches balance in the user's Kana trading account
   *
   * @param walletAddress - Aptos wallet address
   * @returns Trading balance as number (in USDT)
   */
  async getTradingBalance(walletAddress: string): Promise<number> {
    try {
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        throw new Error('Kana API key not configured');
      }

      const response = await axios.get(
        `${kanaRest}/getProfileBalanceSnapshot`,
        {
          params: {
            userAddress: walletAddress,
          },
          headers: {
            'x-api-key': kanaApiKey,
          },
        },
      );

      if (response.data.success && response.data.data !== undefined) {
        return Number(response.data.data);
      }

      return 0;
    } catch (error: any) {
      console.error(
        `Error fetching trading balance for ${walletAddress}:`,
        error.message,
      );
      return 0;
    }
  }

  /**
   * Deposit USDT from wallet to Kana trading account
   * Gets deposit payload from Kana API, signs and submits transaction
   *
   * @param userId - User ID
   * @param amount - Amount in USDT (will be converted to smallest units)
   * @returns Transaction hash if successful
   */
  async depositToTrading(
    userId: string,
    amount: number,
  ): Promise<{
    success: boolean;
    txHash?: string;
    version?: string;
    error?: string;
  }> {
    try {
      // Get wallet address and private key
      const walletAddress = await this.getWalletAddress(userId);
      if (!walletAddress) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      const privateKeyStr = await this.getPrivateKeyForSigning(userId);

      // Format private key
      let privateKeyHex = privateKeyStr.trim();
      if (privateKeyHex.startsWith('ed25519-priv-')) {
        privateKeyHex = privateKeyHex.replace('ed25519-priv-', '');
      }
      if (!privateKeyHex.startsWith('0x')) {
        privateKeyHex = '0x' + privateKeyHex;
      }

      // Create account from private key
      const privateKey = new Ed25519PrivateKey(privateKeyHex);
      const account = Account.fromPrivateKey({ privateKey });

      // Initialize Aptos client (mainnet)
      const network = 'mainnet' as Network;
      const config = new AptosConfig({ network });
      const aptos = new Aptos(config);

      // Get Kana API config
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        return {
          success: false,
          error: 'Kana API key not configured',
        };
      }

      // Convert amount to smallest units (USDT has 6 decimals)
      const amountInSmallestUnit = BigInt(Math.round(amount * 1e6));

      // Verify balance before deposit
      const actualBalance = await this.getUSDTBalance(walletAddress);
      const actualBalanceNum = parseFloat(actualBalance);
      const actualBalanceInSmallestUnit = BigInt(
        Math.round(actualBalanceNum * 1e6),
      );

      if (amountInSmallestUnit > actualBalanceInSmallestUnit) {
        return {
          success: false,
          error: `Insufficient balance. Trying to deposit ${amount} USDT but only ${actualBalanceNum} USDT available.`,
        };
      }

      // Check APT balance for gas fees
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.accountAddress,
        });
        const aptBalanceInAPT = Number(aptBalance) / 100000000;

        if (aptBalanceInAPT < 0.001) {
          return {
            success: false,
            error: `Insufficient APT for gas fees. Required: 0.001 APT, Available: ${aptBalanceInAPT.toFixed(8)} APT. Please deposit some APT first.`,
          };
        }
      } catch (error: any) {
        // Continue anyway, let the transaction fail if no gas
      }

      // Get deposit payload from Kana API
      const amountForApi = amount;
      const response = await axios.get(`${kanaRest}/deposit`, {
        params: {
          userAddress: walletAddress,
          amount: amountForApi,
        },
        headers: {
          'x-api-key': kanaApiKey,
        },
      });

      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || 'Failed to get deposit payload',
        };
      }

      const payloadData = response.data.data;

      if (!payloadData) {
        return {
          success: false,
          error: 'No payload data received from Kana API',
        };
      }

      // Build and submit transaction
      const transactionPayload = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payloadData,
        options: {
          maxGasAmount: 15000,
          gasUnitPrice: 100,
        },
      });

      const committedTxn = await aptos.transaction.signAndSubmitTransaction({
        transaction: transactionPayload,
        signer: account,
      });

      const executedTxn = await aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      if (!executedTxn.success) {
        return {
          success: false,
          error: 'Transaction failed on blockchain',
        };
      }

      // Extract version from multiple possible locations
      const version =
        (executedTxn as any).version ||
        (executedTxn as any).transaction?.version ||
        (executedTxn as any).version_number;

      return {
        success: true,
        txHash: committedTxn.hash,
        version: version || undefined,
      };
    } catch (error: any) {
      console.error(
        `Error depositing to trading account for user ${userId}:`,
        error,
      );
      return {
        success: false,
        error: error.message || 'Failed to deposit to trading account',
      };
    }
  }

  /**
   * Check wallet balance and auto-deposit to trading account if balance > 0
   * This is called when user clicks refresh in deposit modal
   *
   * @param userId - User ID
   * @returns Object with wallet balance, deposit status, and trading balance
   */
  async checkWalletAndDeposit(userId: string): Promise<{
    success: boolean;
    walletBalance: number;
    tradingBalance: number;
    deposited?: boolean;
    depositAmount?: number;
    txHash?: string;
    version?: string;
    error?: string;
  }> {
    try {
      // Get wallet address
      const walletAddress = await this.getWalletAddress(userId);
      if (!walletAddress) {
        return {
          success: false,
          walletBalance: 0,
          tradingBalance: 0,
          error: 'Wallet not found',
        };
      }

      // Check for first deposit and trigger airdrop if needed
      // This ensures users get their 0.05 APT airdrop on first deposit
      await this.checkDepositAndAirdrop(userId);

      // Get wallet account balance from Kana API
      const walletBalance = await this.getWalletAccountBalance(walletAddress);

      // Get current trading balance
      const tradingBalance = await this.getTradingBalance(walletAddress);

      // If wallet has balance, deposit it to trading account
      if (walletBalance > 0) {
        // Get actual USDT balance from blockchain to ensure we have the exact amount
        const actualUSDTBalance = await this.getUSDTBalance(walletAddress);
        const actualBalanceNum = parseFloat(actualUSDTBalance);

        // Use the smaller of the two balances to avoid insufficient balance error
        const depositAmount = Math.min(walletBalance, actualBalanceNum);

        if (depositAmount <= 0) {
          return {
            success: true,
            walletBalance: walletBalance,
            tradingBalance: tradingBalance,
            deposited: false,
          };
        }

        const depositResult = await this.depositToTrading(
          userId,
          depositAmount,
        );

        if (depositResult.success) {
          // Get updated trading balance after deposit
          const updatedTradingBalance =
            await this.getTradingBalance(walletAddress);

          return {
            success: true,
            walletBalance: 0, // Should be 0 after deposit
            tradingBalance: updatedTradingBalance,
            deposited: true,
            depositAmount: depositAmount, // Amount that was actually deposited
            txHash: depositResult.txHash,
            version: depositResult.version,
          };
        } else {
          return {
            success: false,
            walletBalance,
            tradingBalance,
            deposited: false,
            error: depositResult.error || 'Deposit failed',
          };
        }
      }

      // No balance to deposit, just return current balances
      return {
        success: true,
        walletBalance,
        tradingBalance,
        deposited: false,
      };
    } catch (error: any) {
      console.error(
        `Error checking wallet and depositing for user ${userId}:`,
        error,
      );
      return {
        success: false,
        walletBalance: 0,
        tradingBalance: 0,
        error: error.message || 'Failed to check wallet and deposit',
      };
    }
  }

  /**
   * Withdraw from Kana trading account to wallet
   * Withdraws USDT from trading account back to user's wallet
   *
   * @param userId - User ID
   * @param amount - Amount to withdraw in USDT (not smallest units)
   * @param marketId - Market ID (e.g., "14" for APT-USD)
   * @returns Transaction hash if successful
   */
  async withdrawFromKana(
    userId: string,
    amount: number,
    marketId: string,
  ): Promise<{
    success: boolean;
    txHash?: string;
    version?: string;
    error?: string;
  }> {
    try {
      // Get wallet address
      const walletAddress = await this.getWalletAddress(userId);
      if (!walletAddress) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      // Get private key for signing
      const privateKey = await this.getPrivateKeyForSigning(userId);
      if (!privateKey) {
        return {
          success: false,
          error: 'Private key not found',
        };
      }

      // Create account from private key
      const account = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(privateKey),
      });

      // Initialize Aptos client
      const aptos = new Aptos(
        new AptosConfig({ network: 'mainnet' as Network }),
      );

      // Get Kana API config
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        return {
          success: false,
          error: 'Kana API key not configured',
        };
      }

      // Check trading balance
      const tradingBalance = await this.getTradingBalance(walletAddress);

      if (amount > tradingBalance) {
        return {
          success: false,
          error: `Insufficient balance. Trying to withdraw ${amount} USDT but only ${tradingBalance} USDT available.`,
        };
      }

      // Check APT balance for gas fees
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.accountAddress,
        });
        const aptBalanceInAPT = Number(aptBalance) / 100000000;

        if (aptBalanceInAPT < 0.001) {
          return {
            success: false,
            error: `Insufficient APT for gas fees. Required: 0.001 APT, Available: ${aptBalanceInAPT.toFixed(8)} APT.`,
          };
        }
      } catch (error: any) {
        // Continue anyway, let the transaction fail if no gas
      }

      // Get withdrawal payload from Kana API
      const response = await axios.get(`${kanaRest}/withdrawSpecifiMarket`, {
        params: {
          userAddress: walletAddress,
          marketId: marketId,
          amount: amount,
        },
        headers: {
          'x-api-key': kanaApiKey,
        },
      });

      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || 'Failed to get withdrawal payload',
        };
      }

      const payloadData = response.data.data;

      if (!payloadData) {
        return {
          success: false,
          error: 'No payload data received from Kana API',
        };
      }

      // Build and submit transaction
      const transactionPayload = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payloadData,
        options: {
          maxGasAmount: 15000,
          gasUnitPrice: 100,
        },
      });

      const committedTxn = await aptos.transaction.signAndSubmitTransaction({
        transaction: transactionPayload,
        signer: account,
      });

      const executedTxn = await aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      if (!executedTxn.success) {
        return {
          success: false,
          error: 'Transaction failed on blockchain',
        };
      }

      const version =
        (executedTxn as any).version ||
        (executedTxn as any).transaction?.version;
      return {
        success: true,
        txHash: committedTxn.hash,
        version: version,
      };
    } catch (error: any) {
      console.error(
        `❌ Error withdrawing from Kana trading account for user ${userId}:`,
        error,
      );
      return {
        success: false,
        error: error.message || 'Failed to withdraw from trading account',
      };
    }
  }

  /**
   * Transfer USDT from user's wallet to a destination address
   * Uses the wallet account balance (from Kana API)
   *
   * @param userId - User ID
   * @param recipientAddress - Destination wallet address
   * @param amount - Amount to transfer in USDT
   * @returns Transaction hash if successful
   */
  async transferUSDTToAddress(
    userId: string,
    recipientAddress: string,
    amount: number,
  ): Promise<{
    success: boolean;
    txHash?: string;
    version?: string;
    error?: string;
  }> {
    try {
      // Get wallet address
      const walletAddress = await this.getWalletAddress(userId);
      if (!walletAddress) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      // Get private key for signing
      const privateKey = await this.getPrivateKeyForSigning(userId);
      if (!privateKey) {
        return {
          success: false,
          error: 'Private key not found',
        };
      }

      // Create account from private key
      const account = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(privateKey),
      });

      // Initialize Aptos client
      const aptos = new Aptos(
        new AptosConfig({ network: 'mainnet' as Network }),
      );

      // USDT metadata address on Aptos mainnet
      const USDT_METADATA_ADDRESS =
        '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b';

      // Validate recipient address
      if (!recipientAddress || !recipientAddress.startsWith('0x')) {
        return {
          success: false,
          error: 'Invalid recipient address format. Must start with 0x',
        };
      }

      // Check wallet account balance from Kana API
      const walletBalance = await this.getWalletAccountBalance(walletAddress);

      if (amount > walletBalance) {
        return {
          success: false,
          error: `Insufficient balance. Trying to transfer ${amount} USDT but only ${walletBalance} USDT available.`,
        };
      }

      // Check APT balance for gas fees
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.accountAddress,
        });
        const aptBalanceInAPT = Number(aptBalance) / 100000000;

        if (aptBalanceInAPT < 0.001) {
          return {
            success: false,
            error: `Insufficient APT for gas fees. Required: 0.001 APT, Available: ${aptBalanceInAPT.toFixed(8)} APT.`,
          };
        }
      } catch (error: any) {
        // Continue anyway, let the transaction fail if no gas
      }

      // Convert amount to smallest units
      const amountUnits = BigInt(Math.round(amount * 1e6));

      // Build and submit transfer transaction
      const rawTx = await aptos.transferFungibleAsset({
        sender: account,
        fungibleAssetMetadataAddress: USDT_METADATA_ADDRESS,
        recipient: recipientAddress,
        amount: amountUnits,
        options: {
          maxGasAmount: 5000,
          gasUnitPrice: 100,
        },
      });

      const pending = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction: rawTx,
      });

      const result = await aptos.waitForTransaction({
        transactionHash: pending.hash,
      });

      if (!result.success) {
        return {
          success: false,
          error: 'Transaction failed on blockchain',
        };
      }

      const version =
        (result as any).version || (result as any).transaction?.version;
      return {
        success: true,
        txHash: pending.hash,
        version: version,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to transfer USDT',
      };
    }
  }

  /**
   * Get collapse position payload from Kana API (debug only - doesn't submit)
   * This is useful for debugging what payload the API returns
   *
   * @param walletAddress - Wallet address
   * @param marketId - Optional market ID (if not provided, collapses all positions)
   * @returns Payload data from Kana API
   */
  async getCollapsePositionPayload(
    walletAddress: string,
    marketId?: string,
  ): Promise<{
    success: boolean;
    payload?: any;
    rawResponse?: any;
    error?: string;
  }> {
    try {
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        return {
          success: false,
          error: 'Kana API key not configured',
        };
      }

      // Build params - try with and without marketId, with and without userAddress
      const params: any = {};

      // Try different combinations to see what works
      if (marketId) {
        params.marketId = marketId;
      }

      // Based on getPositions pattern, include userAddress
      params.userAddress = walletAddress;

      console.log(`🔍 Debug: Calling Kana API with params:`, params);
      console.log(`🔍 Debug: URL: ${kanaRest}/collapsePosition`);

      const response = await axios.get(`${kanaRest}/collapsePosition`, {
        params,
        headers: {
          'x-api-key': kanaApiKey,
        },
      });

      console.log(
        `🔍 Debug: Kana API Response:`,
        JSON.stringify(response.data, null, 2),
      );

      if (!response.data.success) {
        return {
          success: false,
          error:
            response.data.message || 'Failed to get collapse position payload',
          rawResponse: response.data,
        };
      }

      return {
        success: true,
        payload: response.data.data,
        rawResponse: response.data,
      };
    } catch (error: any) {
      console.error(`❌ Error getting collapse position payload:`, error);
      return {
        success: false,
        error: error.message || 'Failed to get collapse position payload',
        rawResponse: error.response?.data || error.message,
      };
    }
  }

  /**
   * Close all positions for a user
   * Uses placeMultipleOrders if multiple positions exist, otherwise uses placeMarketOrder
   *
   * @param userId - User ID
   * @returns Transaction hash if successful
   */
  async closeAllPositions(userId: string): Promise<{
    success: boolean;
    txHash?: string;
    version?: string;
    error?: string;
  }> {
    try {
      // Get wallet address
      const walletAddress = await this.getWalletAddress(userId);
      if (!walletAddress) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      // Get private key for signing
      const privateKey = await this.getPrivateKeyForSigning(userId);
      if (!privateKey) {
        return {
          success: false,
          error: 'Private key not found',
        };
      }

      // Create account from private key
      const account = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(privateKey),
      });

      // Initialize Aptos client
      const aptos = new Aptos(
        new AptosConfig({ network: 'mainnet' as Network }),
      );

      // Get Kana API config
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        return {
          success: false,
          error: 'Kana API key not configured',
        };
      }

      // Check APT balance for gas fees
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.accountAddress,
        });
        const aptBalanceInAPT = Number(aptBalance) / 100000000;

        if (aptBalanceInAPT < 0.001) {
          return {
            success: false,
            error: `Insufficient APT for gas fees. Required: 0.001 APT, Available: ${aptBalanceInAPT.toFixed(8)} APT.`,
          };
        }
      } catch (error: any) {
        // Continue anyway, let the transaction fail if no gas
      }

      // Fetch all positions
      const positions = await this.getPositions(walletAddress);
      if (!positions || positions.length === 0) {
        return {
          success: true, // No positions to close is considered success
          error: 'No open positions found',
        };
      }

      // Group positions by marketId
      const positionsByMarket = new Map<string, any[]>();
      for (const pos of positions) {
        const marketId = pos.market_id;
        if (!positionsByMarket.has(marketId)) {
          positionsByMarket.set(marketId, []);
        }
        positionsByMarket.get(marketId)!.push(pos);
      }

      // If only one position, use single close
      if (positions.length === 1) {
        const pos = positions[0];
        return await this.closePosition(
          userId,
          pos.market_id,
          pos.trade_side,
          pos.size,
          pos.leverage.toString(),
        );
      }

      // Multiple positions - use placeMultipleOrders
      // We need to group by marketId and create orders for each market
      // For now, let's close all positions in a single transaction if they're in the same market
      // If different markets, we'll need to handle them separately or use multiple transactions

      // For simplicity, let's close positions market by market
      // But the API requires all orders to be for the same marketId
      // So we'll need to process each market separately

      const results: Array<{
        success: boolean;
        txHash?: string;
        error?: string;
      }> = [];

      for (const [marketId, marketPositions] of positionsByMarket.entries()) {
        if (marketPositions.length === 1) {
          // Single position in this market - use single close
          const pos = marketPositions[0];
          const result = await this.closePosition(
            userId,
            marketId,
            pos.trade_side,
            pos.size,
            pos.leverage.toString(),
          );
          results.push(result);
        } else {
          // Multiple positions in same market - use placeMultipleOrders
          const orderTypes: boolean[] = []; // false = market order
          const tradeSides: boolean[] = [];
          const directions: boolean[] = []; // true = close
          const sizes: string[] = [];
          const leverages: string[] = [];
          const prices: number[] = []; // For market orders, we can use 0 or current price

          for (const pos of marketPositions) {
            orderTypes.push(false); // Market order
            tradeSides.push(pos.trade_side);
            directions.push(true); // Close position
            sizes.push(pos.size);
            leverages.push(pos.leverage.toString());
            // For market orders, price can be 0 or we can use mark price
            // Let's use entry price as a reference (API might ignore it for market orders)
            prices.push(parseFloat(pos.entry_price));
          }

          const requestBody = {
            marketId: parseInt(marketId),
            orderTypes,
            tradeSides,
            directions,
            sizes: sizes.map((s) => parseFloat(s)),
            leverages: leverages.map((l) => parseInt(l)),
            prices,
          };

          console.log(
            `🔍 Close All Positions: Calling Kana API placeMultipleOrders with:`,
            JSON.stringify(requestBody, null, 2),
          );

          const response = await axios.post(
            `${kanaRest}/placeMultipleOrders`,
            requestBody,
            {
              headers: {
                'x-api-key': kanaApiKey,
                'Content-Type': 'application/json',
              },
            },
          );

          console.log(
            `🔍 Close All Positions: Kana API Response:`,
            JSON.stringify(response.data, null, 2),
          );

          if (!response.data.success) {
            results.push({
              success: false,
              error:
                response.data.message ||
                'Failed to get close positions payload',
            });
            continue;
          }

          const payloadData = response.data.data;

          if (!payloadData) {
            results.push({
              success: false,
              error: 'No payload data received from Kana API',
            });
            continue;
          }

          // Build and submit transaction
          const transactionPayload = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: payloadData,
            options: {
              maxGasAmount: 15000,
              gasUnitPrice: 100,
            },
          });

          const committedTxn = await aptos.transaction.signAndSubmitTransaction(
            {
              transaction: transactionPayload,
              signer: account,
            },
          );

          const executedTxn = await aptos.waitForTransaction({
            transactionHash: committedTxn.hash,
          });

          if (!executedTxn.success) {
            results.push({
              success: false,
              error: 'Transaction failed on blockchain',
            });
            continue;
          }

          const version =
            (executedTxn as any).version ||
            (executedTxn as any).transaction?.version;
          results.push({
            success: true,
            txHash: committedTxn.hash,
          });
        }
      }

      // Check if all succeeded
      const allSuccess = results.every((r) => r.success);
      if (allSuccess && results.length > 0) {
        return {
          success: true,
          txHash: results[0].txHash, // Return first tx hash
        };
      } else {
        const errors = results
          .filter((r) => !r.success)
          .map((r) => r.error)
          .join(', ');
        return {
          success: false,
          error: `Some positions failed to close: ${errors}`,
        };
      }
    } catch (error: any) {
      console.error(
        `❌ Error closing all positions for user ${userId}:`,
        error,
      );
      return {
        success: false,
        error: error.message || 'Failed to close all positions',
      };
    }
  }

  /**
   * Close position for a specific market
   * Closes the position using a market order with direction=true (100% close)
   *
   * @param userId - User ID
   * @param marketId - Market ID (required)
   * @param tradeSide - Trade side: true for LONG, false for SHORT
   * @param size - Position size to close (optional, will fetch from API if not provided)
   * @param leverage - Leverage to use (optional, will fetch from position if not provided)
   * @returns Transaction hash if successful
   */
  async closePosition(
    userId: string,
    marketId: string,
    tradeSide: boolean,
    size?: string,
    leverage?: string,
  ): Promise<{
    success: boolean;
    txHash?: string;
    version?: string;
    error?: string;
  }> {
    try {
      // Get wallet address
      const walletAddress = await this.getWalletAddress(userId);
      if (!walletAddress) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      // Get private key for signing
      const privateKey = await this.getPrivateKeyForSigning(userId);
      if (!privateKey) {
        return {
          success: false,
          error: 'Private key not found',
        };
      }

      // Create account from private key
      const account = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(privateKey),
      });

      // Initialize Aptos client
      const aptos = new Aptos(
        new AptosConfig({ network: 'mainnet' as Network }),
      );

      // Get Kana API config
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        return {
          success: false,
          error: 'Kana API key not configured',
        };
      }

      // Check APT balance for gas fees
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.accountAddress,
        });
        const aptBalanceInAPT = Number(aptBalance) / 100000000;

        if (aptBalanceInAPT < 0.001) {
          return {
            success: false,
            error: `Insufficient APT for gas fees. Required: 0.001 APT, Available: ${aptBalanceInAPT.toFixed(8)} APT.`,
          };
        }
      } catch (error: any) {
        // Continue anyway, let the transaction fail if no gas
      }

      // If size or leverage not provided, fetch from positions
      let finalSize = size;
      let finalLeverage = leverage;

      if (!finalSize || !finalLeverage) {
        const positions = await this.getPositions(walletAddress, marketId);
        const position = positions.find(
          (pos: any) =>
            pos.market_id === marketId && pos.trade_side === tradeSide,
        );

        if (!position) {
          return {
            success: false,
            error: `No ${tradeSide ? 'LONG' : 'SHORT'} position found for market ${marketId}`,
          };
        }

        if (!finalSize) {
          finalSize = position.size;
        }
        if (!finalLeverage) {
          finalLeverage = position.leverage.toString();
        }
      }

      // Build query parameters for placeMarketOrder
      if (!finalSize || !finalLeverage) {
        return {
          success: false,
          error: 'Size and leverage are required to close position',
        };
      }

      const queryParams = new URLSearchParams();
      queryParams.append('marketId', marketId);
      queryParams.append('tradeSide', tradeSide.toString());
      queryParams.append('direction', 'true'); // true = CLOSE position
      queryParams.append('size', finalSize);
      queryParams.append('leverage', finalLeverage);

      console.log(
        `🔍 Close Position: Calling Kana API placeMarketOrder with params:`,
        {
          marketId,
          tradeSide: tradeSide ? 'LONG' : 'SHORT',
          direction: 'CLOSE',
          size: finalSize,
          leverage: finalLeverage,
        },
      );

      const response = await axios.get(
        `${kanaRest}/placeMarketOrder?${queryParams.toString()}`,
        {
          headers: {
            'x-api-key': kanaApiKey,
          },
        },
      );

      console.log(
        `🔍 Close Position: Kana API Response:`,
        JSON.stringify(response.data, null, 2),
      );

      if (!response.data.success) {
        return {
          success: false,
          error:
            response.data.message || 'Failed to get close position payload',
        };
      }

      const payloadData = response.data.data;

      if (!payloadData) {
        return {
          success: false,
          error: 'No payload data received from Kana API',
        };
      }

      // Build and submit transaction
      const transactionPayload = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payloadData,
        options: {
          maxGasAmount: 15000,
          gasUnitPrice: 100,
        },
      });

      const committedTxn = await aptos.transaction.signAndSubmitTransaction({
        transaction: transactionPayload,
        signer: account,
      });

      const executedTxn = await aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      if (!executedTxn.success) {
        return {
          success: false,
          error: 'Transaction failed on blockchain',
        };
      }

      const version =
        (executedTxn as any).version ||
        (executedTxn as any).transaction?.version;
      return {
        success: true,
        txHash: committedTxn.hash,
        version: version,
      };
    } catch (error: any) {
      console.error(`❌ Error closing position for user ${userId}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to close position',
      };
    }
  }

  /**
   * Collapse position for a specific market
   * Closes all positions for a market using market orders
   *
   * @param userId - User ID
   * @param marketId - Market ID (required)
   * @returns Transaction hash if successful
   */
  async collapsePosition(
    userId: string,
    marketId: string,
  ): Promise<{
    success: boolean;
    txHash?: string;
    version?: string;
    error?: string;
  }> {
    try {
      // Get wallet address
      const walletAddress = await this.getWalletAddress(userId);
      if (!walletAddress) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      // Get private key for signing
      const privateKey = await this.getPrivateKeyForSigning(userId);
      if (!privateKey) {
        return {
          success: false,
          error: 'Private key not found',
        };
      }

      // Create account from private key
      const account = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(privateKey),
      });

      // Initialize Aptos client
      const aptos = new Aptos(
        new AptosConfig({ network: 'mainnet' as Network }),
      );

      // Get Kana API config
      const kanaApiKey = process.env.KANA_API_KEY;
      const kanaRest =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        return {
          success: false,
          error: 'Kana API key not configured',
        };
      }

      // Check APT balance for gas fees
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.accountAddress,
        });
        const aptBalanceInAPT = Number(aptBalance) / 100000000;

        if (aptBalanceInAPT < 0.001) {
          return {
            success: false,
            error: `Insufficient APT for gas fees. Required: 0.001 APT, Available: ${aptBalanceInAPT.toFixed(8)} APT.`,
          };
        }
      } catch (error: any) {
        // Continue anyway, let the transaction fail if no gas
      }

      // Get collapse position payload from Kana API
      // marketId is required for collapse position
      const params: any = {
        userAddress: walletAddress,
        marketId: marketId,
      };

      console.log(
        `🔍 Collapse Position: Calling Kana API with params:`,
        params,
      );

      const response = await axios.get(`${kanaRest}/collapsePosition`, {
        params,
        headers: {
          'x-api-key': kanaApiKey,
        },
      });

      console.log(
        `🔍 Collapse Position: Kana API Response:`,
        JSON.stringify(response.data, null, 2),
      );

      if (!response.data.success) {
        return {
          success: false,
          error:
            response.data.message || 'Failed to get collapse position payload',
        };
      }

      const payloadData = response.data.data;

      if (!payloadData) {
        return {
          success: false,
          error: 'No payload data received from Kana API',
        };
      }

      // Build and submit transaction
      const transactionPayload = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payloadData,
        options: {
          maxGasAmount: 15000,
          gasUnitPrice: 100,
        },
      });

      const committedTxn = await aptos.transaction.signAndSubmitTransaction({
        transaction: transactionPayload,
        signer: account,
      });

      const executedTxn = await aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      if (!executedTxn.success) {
        return {
          success: false,
          error: 'Transaction failed on blockchain',
        };
      }

      const version =
        (executedTxn as any).version ||
        (executedTxn as any).transaction?.version;
      return {
        success: true,
        txHash: committedTxn.hash,
        version: version,
      };
    } catch (error: any) {
      console.error(`❌ Error collapsing position for user ${userId}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to collapse position',
      };
    }
  }
}
