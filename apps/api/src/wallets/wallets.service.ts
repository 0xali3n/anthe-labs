import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { AirdropService } from './airdrop.service';
import { Account, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

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
  ) {
    console.log('✅ Wallets service initialized');
  }

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
        console.log(
          `✅ Wallet found for user ${userId}: ${existingWallet.address}`,
        );
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

      console.log(
        `🔐 Encrypted private key for user ${userId} (length: ${encryptedPrivateKey.length})`,
      );

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

      console.log(`✅ Created Aptos wallet for user ${userId}: ${address}`);
      console.log(`✅ Encrypted private key stored in database (verified)`);

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
        console.log(
          `⚠️ Race condition detected for user ${userId}, fetching existing wallet...`,
        );
        const wallet = await this.prisma.wallet.findUnique({
          where: { user_id: userId },
          select: { address: true },
        });
        if (wallet) {
          console.log(
            `✅ Found wallet after race condition: ${wallet.address}`,
          );
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

      // Get current USDT balance
      const balance = await this.getUSDTBalance(walletAddress);
      const hasBalance = parseFloat(balance) > 0;

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
        console.log(`🎁 First deposit detected for user ${userId}, sending airdrop...`);
        
        const airdropResult = await this.airdropService.sendAirdrop(walletAddress);

        if (airdropResult.success) {
          // Update user to mark airdrop as sent
          await this.prisma.user.update({
            where: { id: userId },
            data: { apt_airdropped: true },
          });

          console.log(`✅ Airdrop sent successfully to ${walletAddress}, tx: ${airdropResult.txHash}`);
          
          return {
            success: true,
            balance,
            airdropped: true,
            airdropTxHash: airdropResult.txHash,
          };
        } else {
          // Log error but don't fail the balance check
          console.error(`⚠️ Airdrop failed for user ${userId}: ${airdropResult.error}`);
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
      console.error(`Error in checkDepositAndAirdrop for user ${userId}:`, error);
      return {
        success: false,
        balance: '0.00',
        error: error.message || 'Failed to check deposit',
      };
    }
  }
}
