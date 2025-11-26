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
   * Get debug info including encrypted private key (for debugging only)
   * WARNING: This exposes encrypted private key - use only for debugging!
   */
  async getDebugInfo(userId: string): Promise<{
    walletAddress: string | null;
    encryptedPrivateKey: string | null;
  }> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { user_id: userId },
      select: {
        address: true,
        key: true, // Encrypted private key
      },
    });

    return {
      walletAddress: wallet?.address || null,
      encryptedPrivateKey: wallet?.key || null,
    };
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
        console.log(
          `🎁 First deposit detected for user ${userId}, sending airdrop...`,
        );

        const airdropResult =
          await this.airdropService.sendAirdrop(walletAddress);

        if (airdropResult.success) {
          // Update user to mark airdrop as sent
          await this.prisma.user.update({
            where: { id: userId },
            data: { apt_airdropped: true },
          });

          console.log(
            `✅ Airdrop sent successfully to ${walletAddress}, tx: ${airdropResult.txHash}`,
          );

          return {
            success: true,
            balance,
            airdropped: true,
            airdropTxHash: airdropResult.txHash,
          };
        } else {
          // Log error but don't fail the balance check
          console.error(
            `⚠️ Airdrop failed for user ${userId}: ${airdropResult.error}`,
          );
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

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 DEPOSIT PROCESS - STEP BY STEP');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Step 1: Initialization`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Wallet Address: ${walletAddress}`);
      console.log(`   Requested Amount: ${amount} USDT`);
      console.log('');

      // Convert amount to smallest units (USDT has 6 decimals)
      // Use BigInt and Math.round for precise conversion
      const amountInSmallestUnit = BigInt(Math.round(amount * 1e6));
      console.log(`🔢 Step 2: Amount Conversion`);
      console.log(`   Amount in USDT: ${amount}`);
      console.log(
        `   Amount in smallest units: ${amountInSmallestUnit.toString()} (${amount} * 1e6, using BigInt and Math.round)`,
      );
      console.log(`   Conversion method: BigInt(Math.round(${amount} * 1e6))`);
      console.log('');

      // Double-check: ensure we're not trying to transfer more than available
      // Get actual balance to verify
      console.log(`🔍 Step 3: Balance Verification`);
      console.log(`   Checking actual blockchain balance...`);
      const actualBalance = await this.getUSDTBalance(walletAddress);
      const actualBalanceNum = parseFloat(actualBalance);
      const actualBalanceInSmallestUnit = BigInt(
        Math.round(actualBalanceNum * 1e6),
      );
      console.log(
        `   Actual Balance: ${actualBalanceNum} USDT (${actualBalanceInSmallestUnit.toString()} smallest units)`,
      );
      console.log(
        `   Requested Amount: ${amount} USDT (${amountInSmallestUnit.toString()} smallest units)`,
      );

      if (amountInSmallestUnit > actualBalanceInSmallestUnit) {
        console.error(
          `   ❌ ERROR: Requested amount exceeds available balance!`,
        );
        console.error(
          `   Trying to deposit ${amount} USDT (${amountInSmallestUnit.toString()} smallest units) but only ${actualBalanceNum} USDT (${actualBalanceInSmallestUnit.toString()} smallest units) available`,
        );
        return {
          success: false,
          error: `Insufficient balance. Trying to deposit ${amount} USDT but only ${actualBalanceNum} USDT available.`,
        };
      }

      console.log(`   ✅ Balance verification passed`);
      console.log('');

      console.log(`⛽ Step 4: APT Balance Check (for gas fees)`);
      console.log(`   Checking APT balance for transaction fees...`);

      // Check APT balance for gas fees
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.accountAddress,
        });
        const aptBalanceInAPT = Number(aptBalance) / 100000000; // Convert from octas to APT
        console.log(`   APT Balance: ${aptBalanceInAPT.toFixed(8)} APT`);
        console.log(`   Required: 0.001 APT (minimum)`);

        // Check if user has at least 0.001 APT for gas (safety margin)
        if (aptBalanceInAPT < 0.001) {
          console.error(`   ❌ ERROR: Insufficient APT for gas fees!`);
          return {
            success: false,
            error: `Insufficient APT for gas fees. Required: 0.001 APT, Available: ${aptBalanceInAPT.toFixed(8)} APT. Please deposit some APT first.`,
          };
        }
        console.log(`   ✅ APT balance sufficient for gas fees`);
      } catch (error: any) {
        console.error(`   ⚠️ Error checking APT balance: ${error.message}`);
        // Continue anyway, let the transaction fail if no gas
      }
      console.log('');

      // Step 5: Get deposit payload from Kana API
      // Kana API expects amount in USDT directly (not smallest units)
      // The API will handle the conversion to smallest units internally
      const amountForApi = amount; // Send amount in USDT directly

      console.log(`🔗 Step 5: Calling Kana Labs Deposit API`);
      console.log(`   API Endpoint: ${kanaRest}/deposit`);
      console.log(`   Method: GET`);
      console.log(`   Parameters:`);
      console.log(`     - userAddress: ${walletAddress}`);
      console.log(
        `     - amount: ${amountForApi} USDT (sent directly, API expects USDT not smallest units)`,
      );
      console.log(
        `     - Note: Kana API expects amount in USDT, not smallest units`,
      );
      console.log(
        `     - Internal conversion (for reference): ${amountInSmallestUnit.toString()} smallest units`,
      );

      const response = await axios.get(`${kanaRest}/deposit`, {
        params: {
          userAddress: walletAddress,
          amount: amountForApi, // Send USDT amount directly
        },
        headers: {
          'x-api-key': kanaApiKey,
        },
      });

      console.log(`   ✅ Kana API Response received`);
      console.log(`   Response Status: ${response.status}`);
      console.log(`   Response Data:`, JSON.stringify(response.data, null, 2));

      // Check if the response is successful
      if (!response.data.success) {
        console.error(
          `   ❌ Kana API error: ${response.data.message || 'Failed to get deposit payload'}`,
        );
        return {
          success: false,
          error: response.data.message || 'Failed to get deposit payload',
        };
      }

      // Extract payload data - Kana API returns { success: true, data: { function, functionArguments, typeArguments } }
      const payloadData = response.data.data;

      if (!payloadData) {
        console.error(`   ❌ No payload data in response`);
        return {
          success: false,
          error: 'No payload data received from Kana API',
        };
      }

      console.log(`   ✅ Deposit payload extracted successfully`);
      console.log(`   Payload Structure (exactly as received from Kana API):`);
      console.log(
        `     - Full payloadData:`,
        JSON.stringify(payloadData, null, 2),
      );
      console.log(`     - Function: ${payloadData.function}`);
      console.log(
        `     - Function Arguments: ${JSON.stringify(payloadData.functionArguments)}`,
      );
      console.log(
        `     - Type Arguments: ${JSON.stringify(payloadData.typeArguments || [])}`,
      );
      console.log('');

      // Step 6: Build transaction with gas optimization (exactly like your working code)
      console.log(`🔨 Step 6: Building Aptos Transaction`);
      console.log(`   Sender: ${account.accountAddress.toString()}`);
      console.log(`   Gas Settings:`);
      console.log(`     - maxGasAmount: 15000`);
      console.log(`     - gasUnitPrice: 100 octas`);
      console.log(`   Using payloadData directly from Kana API`);
      console.log(`   Payload:`, JSON.stringify(payloadData, null, 2));

      const transactionPayload = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payloadData, // This is response.data.data, which matches your payloadData.data
        options: {
          maxGasAmount: 15000, // Limit max gas instead of auto-estimation
          gasUnitPrice: 100, // Use lower gas price (100 octas)
        },
      });
      console.log(`   ✅ Transaction built successfully`);
      console.log('');

      // Step 7: Sign and submit transaction
      console.log(`✍️ Step 7: Signing Transaction`);
      console.log(`   Signer: ${account.accountAddress.toString()}`);
      console.log(`   Using private key from encrypted storage`);
      const committedTxn = await aptos.transaction.signAndSubmitTransaction({
        transaction: transactionPayload,
        signer: account,
      });
      console.log(`   ✅ Transaction signed and submitted`);
      console.log(`   Transaction Hash: ${committedTxn.hash}`);
      console.log('');

      // Step 8: Wait for transaction confirmation
      console.log(`⏳ Step 8: Waiting for Transaction Confirmation`);
      console.log(`   Transaction Hash: ${committedTxn.hash}`);
      console.log(`   Checking blockchain status...`);
      const executedTxn = await aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      if (executedTxn.success) {
        // Extract version from multiple possible locations
        const version =
          (executedTxn as any).version ||
          (executedTxn as any).transaction?.version ||
          (executedTxn as any).version_number;

        console.log(`   ✅ Transaction confirmed successfully!`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ DEPOSIT COMPLETED SUCCESSFULLY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   From Wallet: ${walletAddress}`);
        console.log(`   To: Trading Account`);
        console.log(`   Amount: ${amount} USDT`);
        console.log(`   Transaction Hash: ${committedTxn.hash}`);
        console.log(`   Transaction Version: ${version || 'N/A'}`);
        if (version) {
          console.log(
            `   View on Aptoscan: https://aptoscan.com/transaction/${version}`,
          );
        } else {
          console.log(
            `   View on Aptoscan: https://aptoscan.com/txn/${committedTxn.hash}`,
          );
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else {
        console.error(`   ❌ Transaction failed on blockchain!`);
        console.error(`   Transaction Hash: ${committedTxn.hash}`);
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
      console.log(
        `📊 Wallet balance for user ${userId}: ${walletBalance} USDT`,
      );

      // Get current trading balance
      const tradingBalance = await this.getTradingBalance(walletAddress);
      console.log(
        `📊 Trading balance for user ${userId}: ${tradingBalance} USDT`,
      );

      // If wallet has balance, deposit it to trading account
      if (walletBalance > 0) {
        // Get actual USDT balance from blockchain to ensure we have the exact amount
        const actualUSDTBalance = await this.getUSDTBalance(walletAddress);
        const actualBalanceNum = parseFloat(actualUSDTBalance);

        console.log(`📊 Kana API Balance: ${walletBalance} USDT`);
        console.log(`📊 Blockchain Balance: ${actualBalanceNum} USDT`);

        // Use the smaller of the two balances to avoid insufficient balance error
        // Convert to number for comparison and deposit
        const depositAmount = Math.min(walletBalance, actualBalanceNum);

        // Use BigInt conversion for precise amount calculation
        const depositAmountInSmallestUnit = BigInt(
          Math.round(depositAmount * 1e6),
        );

        if (depositAmount <= 0) {
          console.log(
            `⚠️ No balance available for deposit (Kana: ${walletBalance}, Blockchain: ${actualBalanceNum})`,
          );
          return {
            success: true,
            walletBalance: walletBalance,
            tradingBalance: tradingBalance,
            deposited: false,
          };
        }

        console.log(
          `🔄 Auto-depositing ${depositAmount} USDT to trading account for user ${userId}`,
        );
        console.log(
          `📤 Transfer Details: ${depositAmount} USDT from wallet to trading account`,
        );

        const depositResult = await this.depositToTrading(
          userId,
          depositAmount,
        );

        if (depositResult.success) {
          // Get updated trading balance after deposit
          const updatedTradingBalance =
            await this.getTradingBalance(walletAddress);

          console.log(
            `✅ Deposit successful! Transaction: ${depositResult.txHash}`,
          );
          console.log(
            `📊 Updated trading balance: ${updatedTradingBalance} USDT`,
          );

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
          console.error(
            `❌ Deposit failed for user ${userId}: ${depositResult.error}`,
          );
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
      console.log(
        `ℹ️ No balance to deposit for user ${userId} (wallet balance: ${walletBalance} USDT)`,
      );
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

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 WITHDRAWAL PROCESS - STEP BY STEP');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Step 1: Initialization`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Wallet Address: ${walletAddress}`);
      console.log(`   Withdrawal Amount: ${amount} USDT`);
      console.log(`   Market ID: ${marketId}`);
      console.log('');

      // Check trading balance
      console.log(`🔍 Step 2: Balance Verification`);
      console.log(`   Checking trading account balance...`);
      const tradingBalance = await this.getTradingBalance(walletAddress);
      console.log(`   Trading Balance: ${tradingBalance} USDT`);
      console.log(`   Requested Amount: ${amount} USDT`);

      if (amount > tradingBalance) {
        console.error(`   ❌ ERROR: Insufficient trading balance!`);
        return {
          success: false,
          error: `Insufficient balance. Trying to withdraw ${amount} USDT but only ${tradingBalance} USDT available.`,
        };
      }
      console.log(`   ✅ Balance verification passed`);
      console.log('');

      // Check APT balance for gas fees
      console.log(`⛽ Step 3: APT Balance Check (for gas fees)`);
      console.log(`   Checking APT balance for transaction fees...`);
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.accountAddress,
        });
        const aptBalanceInAPT = Number(aptBalance) / 100000000;
        console.log(`   APT Balance: ${aptBalanceInAPT.toFixed(8)} APT`);
        console.log(`   Required: 0.001 APT (minimum)`);

        if (aptBalanceInAPT < 0.001) {
          console.error(`   ❌ ERROR: Insufficient APT for gas fees!`);
          return {
            success: false,
            error: `Insufficient APT for gas fees. Required: 0.001 APT, Available: ${aptBalanceInAPT.toFixed(8)} APT.`,
          };
        }
        console.log(`   ✅ APT balance sufficient for gas fees`);
      } catch (error: any) {
        console.error(`   ⚠️ Error checking APT balance: ${error.message}`);
      }
      console.log('');

      // Step 4: Get withdrawal payload from Kana API
      // Kana API expects amount in USDT directly (not smallest units)
      console.log(`🔗 Step 4: Calling Kana Labs Withdrawal API`);
      console.log(`   API Endpoint: ${kanaRest}/withdrawSpecifiMarket`);
      console.log(`   Method: GET`);
      console.log(`   Parameters:`);
      console.log(`     - userAddress: ${walletAddress}`);
      console.log(`     - marketId: ${marketId}`);
      console.log(
        `     - amount: ${amount} USDT (sent directly, API expects USDT)`,
      );

      const response = await axios.get(`${kanaRest}/withdrawSpecifiMarket`, {
        params: {
          userAddress: walletAddress,
          marketId: marketId,
          amount: amount, // Send USDT amount directly
        },
        headers: {
          'x-api-key': kanaApiKey,
        },
      });

      console.log(`   ✅ Kana API Response received`);
      console.log(`   Response Status: ${response.status}`);
      console.log(`   Response Data:`, JSON.stringify(response.data, null, 2));

      if (!response.data.success) {
        console.error(
          `   ❌ Kana API error: ${response.data.message || 'Failed to get withdrawal payload'}`,
        );
        return {
          success: false,
          error: response.data.message || 'Failed to get withdrawal payload',
        };
      }

      const payloadData = response.data.data;

      if (!payloadData) {
        console.error(`   ❌ No payload data in response`);
        return {
          success: false,
          error: 'No payload data received from Kana API',
        };
      }

      console.log(`   ✅ Withdrawal payload extracted successfully`);
      console.log(
        `   Payload Structure:`,
        JSON.stringify(payloadData, null, 2),
      );
      console.log('');

      // Step 5: Build transaction with gas optimization
      console.log(`🔨 Step 5: Building Aptos Transaction`);
      console.log(`   Sender: ${account.accountAddress.toString()}`);
      console.log(`   Gas Settings:`);
      console.log(`     - maxGasAmount: 15000`);
      console.log(`     - gasUnitPrice: 100 octas`);
      console.log(`   Using payloadData directly from Kana API`);

      const transactionPayload = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payloadData,
        options: {
          maxGasAmount: 15000,
          gasUnitPrice: 100,
        },
      });
      console.log(`   ✅ Transaction built successfully`);
      console.log('');

      // Step 6: Sign and submit transaction
      console.log(`✍️ Step 6: Signing Transaction`);
      console.log(`   Signer: ${account.accountAddress.toString()}`);
      const committedTxn = await aptos.transaction.signAndSubmitTransaction({
        transaction: transactionPayload,
        signer: account,
      });
      console.log(`   ✅ Transaction signed and submitted`);
      console.log(`   Transaction Hash: ${committedTxn.hash}`);
      console.log('');

      // Step 7: Wait for transaction confirmation
      console.log(`⏳ Step 7: Waiting for Transaction Confirmation`);
      console.log(`   Transaction Hash: ${committedTxn.hash}`);
      const executedTxn = await aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      if (executedTxn.success) {
        const version =
          (executedTxn as any).version ||
          (executedTxn as any).transaction?.version;
        console.log(`   ✅ Transaction confirmed successfully!`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ WITHDRAWAL COMPLETED SUCCESSFULLY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   From: Trading Account`);
        console.log(`   To: Wallet Account (${walletAddress})`);
        console.log(`   Amount: ${amount} USDT`);
        console.log(`   Market ID: ${marketId}`);
        console.log(`   Transaction Hash: ${committedTxn.hash}`);
        console.log(`   Transaction Version: ${version}`);
        console.log(
          `   View on Aptoscan: https://aptoscan.com/transaction/${version}`,
        );
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else {
        console.error(`   ❌ Transaction failed on blockchain!`);
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

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 USDT TRANSFER PROCESS - STEP BY STEP');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Step 1: Initialization`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Sender Address: ${walletAddress}`);
      console.log(`   Recipient Address: ${recipientAddress}`);
      console.log(`   Transfer Amount: ${amount} USDT`);
      console.log('');

      // Validate recipient address
      if (!recipientAddress || !recipientAddress.startsWith('0x')) {
        console.error(`   ❌ ERROR: Invalid recipient address format`);
        return {
          success: false,
          error: 'Invalid recipient address format. Must start with 0x',
        };
      }

      // Check wallet account balance from Kana API
      console.log(`🔍 Step 2: Balance Verification`);
      console.log(`   Checking wallet account balance (Kana API)...`);
      const walletBalance = await this.getWalletAccountBalance(walletAddress);
      console.log(`   Wallet Account Balance: ${walletBalance} USDT`);
      console.log(`   Requested Amount: ${amount} USDT`);

      if (amount > walletBalance) {
        console.error(`   ❌ ERROR: Insufficient balance!`);
        return {
          success: false,
          error: `Insufficient balance. Trying to transfer ${amount} USDT but only ${walletBalance} USDT available.`,
        };
      }
      console.log(`   ✅ Balance verification passed`);
      console.log('');

      // Check APT balance for gas fees
      console.log(`⛽ Step 3: APT Balance Check (for gas fees)`);
      console.log(`   Checking APT balance for transaction fees...`);
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.accountAddress,
        });
        const aptBalanceInAPT = Number(aptBalance) / 100000000;
        console.log(`   APT Balance: ${aptBalanceInAPT.toFixed(8)} APT`);
        console.log(`   Required: 0.001 APT (minimum)`);

        if (aptBalanceInAPT < 0.001) {
          console.error(`   ❌ ERROR: Insufficient APT for gas fees!`);
          return {
            success: false,
            error: `Insufficient APT for gas fees. Required: 0.001 APT, Available: ${aptBalanceInAPT.toFixed(8)} APT.`,
          };
        }
        console.log(`   ✅ APT balance sufficient for gas fees`);
      } catch (error: any) {
        console.error(`   ⚠️ Error checking APT balance: ${error.message}`);
      }
      console.log('');

      // Step 4: Convert amount to smallest units
      console.log(`🔢 Step 4: Amount Conversion`);
      console.log(`   Amount in USDT: ${amount}`);
      const amountUnits = BigInt(Math.round(amount * 1e6));
      console.log(
        `   Amount in smallest units: ${amountUnits.toString()} (${amount} * 1e6)`,
      );
      console.log('');

      // Step 5: Build transfer transaction
      console.log(`🔨 Step 5: Building Transfer Transaction`);
      console.log(`   Sender: ${account.accountAddress.toString()}`);
      console.log(`   Recipient: ${recipientAddress}`);
      console.log(`   USDT Metadata Address: ${USDT_METADATA_ADDRESS}`);
      console.log(
        `   Amount: ${amountUnits.toString()} smallest units (${amount} USDT)`,
      );
      console.log(`   Gas Settings:`);
      console.log(`     - maxGasAmount: 5000`);
      console.log(`     - gasUnitPrice: 100 octas`);

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

      console.log(`   ✅ Transaction built successfully`);
      console.log('');

      // Step 6: Sign and submit transaction
      console.log(`✍️ Step 6: Signing and Submitting Transaction`);
      console.log(`   Signer: ${account.accountAddress.toString()}`);
      const pending = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction: rawTx,
      });
      console.log(`   ✅ Transaction signed and submitted`);
      console.log(`   Transaction Hash: ${pending.hash}`);
      console.log('');

      // Step 7: Wait for transaction confirmation
      console.log(`⏳ Step 7: Waiting for Transaction Confirmation`);
      console.log(`   Transaction Hash: ${pending.hash}`);
      const result = await aptos.waitForTransaction({
        transactionHash: pending.hash,
      });

      if (result.success) {
        const version =
          (result as any).version || (result as any).transaction?.version;
        console.log(`   ✅ Transaction confirmed successfully!`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ USDT TRANSFER COMPLETED SUCCESSFULLY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   From: ${walletAddress}`);
        console.log(`   To: ${recipientAddress}`);
        console.log(`   Amount: ${amount} USDT`);
        console.log(`   Transaction Hash: ${pending.hash}`);
        console.log(`   Transaction Version: ${version}`);
        console.log(
          `   View on Aptoscan: https://aptoscan.com/transaction/${version}`,
        );
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else {
        console.error(`   ❌ Transaction failed on blockchain!`);
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
      console.error(`❌ Error transferring USDT for user ${userId}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to transfer USDT',
      };
    }
  }
}
