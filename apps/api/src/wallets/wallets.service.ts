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
   * Get APT balance for a wallet address
   * Fetches real-time balance from Aptos blockchain using view function
   * APT is the native coin, uses coin::balance view function
   *
   * @param walletAddress - Aptos wallet address
   * @returns APT balance as string (formatted with 8 decimals)
   */
  async getAPTBalance(walletAddress: string): Promise<string> {
    try {
      // Hardcoded to mainnet
      const network = 'mainnet' as Network;
      const config = new AptosConfig({ network });
      const aptos = new Aptos(config);

      // Use view function to get APT coin balance (same approach as USDT)
      // APT coin type: 0x1::aptos_coin::AptosCoin
      const [balanceStr] = await aptos.view<[string]>({
        payload: {
          function: '0x1::coin::balance',
          typeArguments: ['0x1::aptos_coin::AptosCoin'],
          functionArguments: [walletAddress],
        },
      });

      const balance = balanceStr || '0';

      // Convert from octas to APT (8 decimals)
      const balanceInAPT = Number(balance) / 100000000;
      return balanceInAPT.toFixed(8);
    } catch (error: any) {
      console.error(
        `Error fetching APT balance for ${walletAddress}:`,
        error.message,
      );

      // If balance is 0 or resource doesn't exist, return "0.00000000"
      if (
        error.message?.includes('RESOURCE_NOT_FOUND') ||
        error.message?.includes('not found') ||
        error.statusCode === 404
      ) {
        return '0.00000000';
      }

      // Return 0.00 if error
      return '0.00000000';
    }
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
   * Withdraw USDT from user's wallet to external address
   *
   * @param userId - User ID
   * @param recipientAddress - External wallet address to receive USDT
   * @param amount - Amount in USDT (will be converted to smallest unit with 6 decimals)
   * @returns Transaction hash if successful
   */
  async withdrawUSDT(
    userId: string,
    recipientAddress: string,
    amount: string,
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      // Validate inputs
      if (!recipientAddress || !recipientAddress.startsWith('0x')) {
        return {
          success: false,
          error: 'Invalid recipient address format',
        };
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return {
          success: false,
          error: 'Invalid amount. Must be a positive number.',
        };
      }

      // Get user's wallet
      const wallet = await this.prisma.wallet.findUnique({
        where: { user_id: userId },
        select: {
          address: true,
          key: true,
        },
      });

      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      // Check balance before withdrawal
      const balance = await this.getUSDTBalance(wallet.address);
      const balanceNum = parseFloat(balance);

      if (balanceNum < amountNum) {
        return {
          success: false,
          error: `Insufficient balance. Available: ${balance} USDT, Requested: ${amount} USDT`,
        };
      }

      // Decrypt private key
      let privateKeyHex: string;
      try {
        privateKeyHex = await this.getPrivateKeyForSigning(userId);
      } catch (decryptError: any) {
        return {
          success: false,
          error: `Failed to decrypt private key: ${decryptError.message}`,
        };
      }

      // Clean and format private key
      let privateKey = privateKeyHex.replace(/[\s\n\r\t]/g, '').trim();

      if (privateKey.toLowerCase().startsWith('0x')) {
        privateKey = privateKey.substring(2);
      }

      privateKey = privateKey.replace(/[^0-9a-fA-F]/g, '');

      if (privateKey.length === 0) {
        return {
          success: false,
          error: 'Invalid private key format after decryption',
        };
      }

      if (privateKey.length % 2 !== 0) {
        privateKey = '0' + privateKey;
      }

      if (privateKey.length < 64) {
        return {
          success: false,
          error: 'Invalid private key length',
        };
      } else if (privateKey.length > 64) {
        privateKey = privateKey.substring(privateKey.length - 64);
      }

      privateKey = '0x' + privateKey;

      if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
        return {
          success: false,
          error: 'Invalid private key format',
        };
      }

      // Create Account object from private key (required by Aptos SDK for signing)
      let userAccount: Account;
      try {
        const ed25519PrivateKey = new Ed25519PrivateKey(privateKey);
        userAccount = Account.fromPrivateKey({ privateKey: ed25519PrivateKey });

        // Verify the account address matches the wallet address
        if (userAccount.accountAddress.toString() !== wallet.address) {
          return {
            success: false,
            error: 'Private key does not match wallet address',
          };
        }
      } catch (accountError: any) {
        return {
          success: false,
          error: `Failed to create account from private key: ${accountError.message}`,
        };
      }

      // Initialize Aptos client
      const network = 'mainnet' as Network;
      const config = new AptosConfig({ network });
      const aptos = new Aptos(config);

      // Check APT balance for gas fees
      let aptBalanceInAPT = 0;
      let accountSequenceNumber = 0;
      try {
        const accountInfo = await aptos.getAccountInfo({
          accountAddress: userAccount.accountAddress,
        });
        accountSequenceNumber = Number(accountInfo.sequence_number || 0);

        const [balanceStr] = await aptos.view<[string]>({
          payload: {
            function: '0x1::coin::balance',
            typeArguments: ['0x1::aptos_coin::AptosCoin'],
            functionArguments: [userAccount.accountAddress.toString()],
          },
        });
        const balance = balanceStr || '0';
        aptBalanceInAPT = Number(balance) / 100000000;
      } catch (aptBalanceError: any) {
        return {
          success: false,
          error: `Could not check APT balance: ${aptBalanceError.message}`,
        };
      }

      const minRequiredAPT = accountSequenceNumber === 0 ? 0.01 : 0.001;
      if (aptBalanceInAPT < minRequiredAPT) {
        return {
          success: false,
          error: `Insufficient APT balance for transaction fees. You need at least ${minRequiredAPT} APT for gas, but you have ${aptBalanceInAPT.toFixed(8)} APT.`,
        };
      }

      // USDT Fungible Asset Metadata Address on Aptos Mainnet
      const usdtMetadataAddress =
        '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b';

      // Convert amount to smallest unit (USDT has 6 decimals)
      const amountInSmallestUnit = BigInt(Math.floor(amountNum * 1000000));

      // Build transaction
      let transaction: any;
      try {
        transaction = await aptos.transaction.build.simple({
          sender: userAccount.accountAddress,
          data: {
            function: '0x1::primary_fungible_store::transfer',
            typeArguments: ['0x1::object::ObjectCore'],
            functionArguments: [
              usdtMetadataAddress,
              recipientAddress,
              amountInSmallestUnit.toString(),
            ],
          } as any,
        });
      } catch (buildError: any) {
        return {
          success: false,
          error: `Failed to build transaction: ${buildError.message}`,
        };
      }

      // Sign transaction
      let senderAuthenticator: any;
      try {
        senderAuthenticator = aptos.transaction.sign({
          signer: userAccount,
          transaction,
        });
      } catch (signError: any) {
        return {
          success: false,
          error: `Failed to sign transaction: ${signError.message}`,
        };
      }

      // Submit transaction
      let pendingTxn: any;
      try {
        pendingTxn = await aptos.transaction.submit.simple({
          transaction,
          senderAuthenticator,
        });
      } catch (submitError: any) {
        return {
          success: false,
          error: `Failed to submit transaction: ${submitError.message}`,
        };
      }

      // Wait for transaction confirmation
      try {
        const executedTxn = await aptos.waitForTransaction({
          transactionHash: pendingTxn.hash,
        });

        if (executedTxn.success) {
          return {
            success: true,
            txHash: pendingTxn.hash,
          };
        } else {
          return {
            success: false,
            error: `Transaction failed on blockchain: ${executedTxn.vm_status || 'Unknown error'}`,
          };
        }
      } catch (waitError: any) {
        // Transaction might still be pending, return the hash anyway
        return {
          success: true,
          txHash: pendingTxn.hash,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to withdraw USDT',
      };
    }
  }

  /**
   * Deposit USDT to Kana trading account
   * This transfers USDT from user's wallet to their Kana trading profile
   *
   * @param userId - User ID
   * @param amount - Amount in USDT to deposit
   * @returns Transaction hash if successful
   */
  async depositToKana(
    userId: string,
    amount: number,
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    logs?: string[];
  }> {
    const logs: string[] = [];
    const addLog = (message: string) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}`;
      logs.push(logMessage);
      console.log(logMessage);
    };

    try {
      addLog(`🚀 [START] Kana Deposit Process`);
      addLog(`User ID: ${userId}`);
      addLog(`Amount: ${amount} USDT`);
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: 'Invalid amount. Must be a positive number.',
        };
      }

      // Get user's wallet
      const wallet = await this.prisma.wallet.findUnique({
        where: { user_id: userId },
        select: {
          address: true,
          key: true,
        },
      });

      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      // Decrypt private key
      let privateKeyHex: string;
      try {
        privateKeyHex = await this.getPrivateKeyForSigning(userId);
      } catch (decryptError: any) {
        return {
          success: false,
          error: `Failed to decrypt private key: ${decryptError.message}`,
        };
      }

      // Clean and format private key
      let privateKey = privateKeyHex.replace(/[\s\n\r\t]/g, '').trim();

      if (privateKey.toLowerCase().startsWith('0x')) {
        privateKey = privateKey.substring(2);
      }

      privateKey = privateKey.replace(/[^0-9a-fA-F]/g, '');

      if (privateKey.length === 0) {
        return {
          success: false,
          error: 'Invalid private key format after decryption',
        };
      }

      if (privateKey.length % 2 !== 0) {
        privateKey = '0' + privateKey;
      }

      if (privateKey.length < 64) {
        return {
          success: false,
          error: 'Invalid private key length',
        };
      } else if (privateKey.length > 64) {
        privateKey = privateKey.substring(privateKey.length - 64);
      }

      privateKey = '0x' + privateKey;

      if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
        return {
          success: false,
          error: 'Invalid private key format',
        };
      }

      // Create Account object from private key
      let userAccount: Account;
      try {
        const ed25519PrivateKey = new Ed25519PrivateKey(privateKey);
        userAccount = Account.fromPrivateKey({ privateKey: ed25519PrivateKey });

        // Verify the account address matches the wallet address
        if (userAccount.accountAddress.toString() !== wallet.address) {
          return {
            success: false,
            error: 'Private key does not match wallet address',
          };
        }
      } catch (accountError: any) {
        return {
          success: false,
          error: `Failed to create account from private key: ${accountError.message}`,
        };
      }

      // Initialize Aptos client
      const network = 'mainnet' as Network;
      const config = new AptosConfig({ network });
      const aptos = new Aptos(config);

      // Get Kana API configuration
      const kanaApiKey = process.env.KANA_API_KEY || '';
      const kanaRestUrl =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      addLog(`📋 [STEP 1] Checking Kana API configuration...`);
      addLog(
        `Kana API Key present: ${kanaApiKey ? 'Yes (length: ' + kanaApiKey.length + ')' : 'No'}`,
      );
      addLog(`Kana REST URL: ${kanaRestUrl}`);

      if (!kanaApiKey) {
        addLog(
          `❌ [ERROR] Kana API key not configured in environment variables`,
        );
        addLog(
          `Please ensure KANA_API_KEY is set in your .env file and restart the server`,
        );
        return {
          success: false,
          error: 'Kana API key not configured. Please check server logs.',
          logs,
        };
      }

      addLog(`✅ [STEP 1] Kana API configuration verified`);
      addLog(
        `📋 [STEP 2] Starting deposit of $${amount.toFixed(2)} USDT for user ${userId}...`,
      );

      // Step 3: Get deposit payload from Kana API
      const depositUrl = `${kanaRestUrl}/deposit?userAddress=${userAccount.accountAddress.toString()}&amount=${amount}`;
      addLog(`📋 [STEP 3] Calling Kana API to get deposit payload...`);
      addLog(`API URL: ${depositUrl}`);
      addLog(`User Address: ${userAccount.accountAddress.toString()}`);
      addLog(`Amount: ${amount} USDT`);

      let payloadData: any;
      try {
        addLog(`Sending request to Kana API...`);
        const response = await fetch(depositUrl, {
          headers: {
            'x-api-key': kanaApiKey,
            'Content-Type': 'application/json',
          },
        });

        addLog(`Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          addLog(
            `❌ [ERROR] Kana API returned error: ${response.status} ${response.statusText}`,
          );
          addLog(`Error details: ${errorText}`);
          return {
            success: false,
            error: `Kana API error: ${response.status} ${response.statusText} - ${errorText}`,
            logs,
          };
        }

        payloadData = await response.json();
        addLog(
          `Response received: ${JSON.stringify(payloadData).substring(0, 200)}...`,
        );

        if (!payloadData.success) {
          addLog(`❌ [ERROR] Kana API returned success: false`);
          addLog(`Error message: ${payloadData.message || 'Unknown error'}`);
          return {
            success: false,
            error:
              payloadData.message ||
              'Failed to get deposit payload from Kana API',
            logs,
          };
        }
      } catch (apiError: any) {
        addLog(`❌ [ERROR] Failed to call Kana API`);
        addLog(`Error: ${apiError.message}`);
        addLog(`Stack: ${apiError.stack}`);
        return {
          success: false,
          error: `Failed to call Kana API: ${apiError.message}`,
          logs,
        };
      }

      addLog(`✅ [STEP 3] Deposit payload received successfully`);

      // Step 4: Build transaction with gas optimization
      addLog(`📋 [STEP 4] Building Aptos transaction...`);
      let transaction: any;
      try {
        transaction = await aptos.transaction.build.simple({
          sender: userAccount.accountAddress,
          data: payloadData.data,
          options: {
            maxGasAmount: 15000, // Limit max gas instead of auto-estimation
            gasUnitPrice: 100, // Use lower gas price (100 octas)
          },
        });
        addLog(`✅ [STEP 4] Transaction built successfully`);
      } catch (buildError: any) {
        addLog(`❌ [ERROR] Failed to build transaction`);
        addLog(`Error: ${buildError.message}`);
        return {
          success: false,
          error: `Failed to build transaction: ${buildError.message}`,
          logs,
        };
      }

      // Step 5: Sign and submit transaction
      addLog(`📋 [STEP 5] Signing and submitting transaction...`);
      let committedTxn: any;
      try {
        committedTxn = await aptos.transaction.signAndSubmitTransaction({
          transaction,
          signer: userAccount,
        });
        addLog(`✅ [STEP 5] Transaction signed and submitted`);
        addLog(`Transaction hash: ${committedTxn.hash}`);
      } catch (signError: any) {
        addLog(`❌ [ERROR] Failed to sign/submit transaction`);
        addLog(`Error: ${signError.message}`);
        return {
          success: false,
          error: `Failed to sign/submit transaction: ${signError.message}`,
          logs,
        };
      }

      // Step 6: Wait for transaction confirmation
      addLog(`📋 [STEP 6] Waiting for transaction confirmation...`);
      try {
        await aptos.waitForTransaction({
          transactionHash: committedTxn.hash,
        });
        addLog(`✅ [STEP 6] Transaction confirmed on blockchain`);
        addLog(`🎉 [SUCCESS] Deposit completed successfully!`);
        addLog(`Transaction hash: ${committedTxn.hash}`);
        addLog(
          `View on Aptoscan: https://aptoscan.com/txn/${committedTxn.hash}`,
        );
      } catch (waitError: any) {
        // Transaction might still be pending, return the hash anyway
        addLog(`⚠️ [WARNING] Transaction submitted but confirmation pending`);
        addLog(`Transaction hash: ${committedTxn.hash}`);
        addLog(`This is normal - transaction may still be processing`);
      }

      return {
        success: true,
        txHash: committedTxn.hash,
        logs,
      };
    } catch (error: any) {
      addLog(`❌ [FATAL ERROR] Unexpected error during deposit`);
      addLog(`Error: ${error.message}`);
      addLog(`Stack: ${error.stack}`);
      console.error('[Kana] Deposit error:', error);
      return {
        success: false,
        error: error.message || 'Failed to deposit to Kana',
        logs,
      };
    }
  }

  /**
   * Get trading balance from Kana trading account
   * This gets the balance in the user's Kana trading profile
   *
   * @param userId - User ID
   * @returns Trading balance in USDT
   */
  async getTradingBalance(userId: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
    logs?: string[];
  }> {
    const logs: string[] = [];
    const addLog = (message: string) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}`;
      logs.push(logMessage);
      console.log(logMessage);
    };

    try {
      addLog(`🚀 [START] Get Trading Balance`);
      addLog(`User ID: ${userId}`);

      // Get user's wallet
      const wallet = await this.prisma.wallet.findUnique({
        where: { user_id: userId },
        select: {
          address: true,
        },
      });

      if (!wallet) {
        addLog(`❌ [ERROR] Wallet not found`);
        return {
          success: false,
          error: 'Wallet not found',
          logs,
        };
      }

      addLog(`Wallet Address: ${wallet.address}`);

      // Get Kana API configuration
      const kanaApiKey = process.env.KANA_API_KEY || '';
      const kanaRestUrl =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        addLog(`❌ [ERROR] Kana API key not configured`);
        return {
          success: false,
          error: 'Kana API key not configured',
          logs,
        };
      }

      // Call Kana API to get trading balance
      const balanceUrl = `${kanaRestUrl}/getProfileBalanceSnapshot?userAddress=${wallet.address}`;
      addLog(`📋 Calling Kana API: ${balanceUrl}`);

      try {
        const response = await fetch(balanceUrl, {
          headers: {
            'x-api-key': kanaApiKey,
            'Content-Type': 'application/json',
          },
        });

        addLog(`Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          addLog(
            `❌ [ERROR] Kana API returned error: ${response.status} ${response.statusText}`,
          );
          addLog(`Error details: ${errorText}`);
          return {
            success: false,
            error: `Kana API error: ${response.status} ${response.statusText} - ${errorText}`,
            logs,
          };
        }

        const data = await response.json();
        addLog(`Response received: ${JSON.stringify(data)}`);

        if (!data.success) {
          addLog(`❌ [ERROR] Kana API returned success: false`);
          addLog(`Error message: ${data.message || 'Unknown error'}`);
          return {
            success: false,
            error:
              data.message || 'Failed to get trading balance from Kana API',
            logs,
          };
        }

        const balance =
          typeof data.data === 'number'
            ? data.data
            : parseFloat(data.data || '0');
        addLog(`✅ [SUCCESS] Trading Balance: $${balance.toFixed(6)}`);
        addLog(`🎉 [END] Get Trading Balance completed successfully`);

        return {
          success: true,
          balance,
          logs,
        };
      } catch (apiError: any) {
        addLog(`❌ [ERROR] Failed to call Kana API`);
        addLog(`Error: ${apiError.message}`);
        return {
          success: false,
          error: `Failed to call Kana API: ${apiError.message}`,
          logs,
        };
      }
    } catch (error: any) {
      const errorLogs: string[] = logs.length > 0 ? [...logs] : [];
      const addErrorLog = (message: string) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        errorLogs.push(logMessage);
        console.error(logMessage);
      };

      addErrorLog(`❌ [FATAL ERROR] Unexpected error getting trading balance`);
      addErrorLog(`Error: ${error.message}`);
      if (error.stack) {
        addErrorLog(`Stack: ${error.stack.substring(0, 500)}...`);
      }
      console.error('[Kana] Get Trading Balance error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get trading balance',
        logs: errorLogs,
      };
    }
  }

  /**
   * Get positions from Kana trading account
   * This gets all open positions for the user
   *
   * @param userId - User ID
   * @param marketId - Optional market ID to filter positions
   * @returns Array of positions
   */
  async getPositions(
    userId: string,
    marketId?: string,
  ): Promise<{
    success: boolean;
    positions?: any[];
    error?: string;
    logs?: string[];
  }> {
    const logs: string[] = [];
    const addLog = (message: string) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}`;
      logs.push(logMessage);
      console.log(logMessage);
    };

    try {
      addLog(`🚀 [START] Get Positions`);
      addLog(`User ID: ${userId}`);
      if (marketId) {
        addLog(`Market ID filter: ${marketId}`);
      }

      // Get user's wallet
      const wallet = await this.prisma.wallet.findUnique({
        where: { user_id: userId },
        select: {
          address: true,
        },
      });

      if (!wallet) {
        addLog(`❌ [ERROR] Wallet not found`);
        return {
          success: false,
          error: 'Wallet not found',
          logs,
        };
      }

      addLog(`Wallet Address: ${wallet.address}`);

      // Get Kana API configuration
      const kanaApiKey = process.env.KANA_API_KEY || '';
      const kanaRestUrl =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      if (!kanaApiKey) {
        addLog(`❌ [ERROR] Kana API key not configured`);
        return {
          success: false,
          error: 'Kana API key not configured',
          logs,
        };
      }

      // Call Kana API to get positions
      let positionsUrl = `${kanaRestUrl}/getPositions?userAddress=${wallet.address}`;
      if (marketId) {
        positionsUrl += `&marketId=${marketId}`;
      }
      addLog(`📋 Calling Kana API: ${positionsUrl}`);

      try {
        const response = await fetch(positionsUrl, {
          headers: {
            'x-api-key': kanaApiKey,
            'Content-Type': 'application/json',
          },
        });

        addLog(`Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          addLog(
            `❌ [ERROR] Kana API returned error: ${response.status} ${response.statusText}`,
          );
          addLog(`Error details: ${errorText}`);
          return {
            success: false,
            error: `Kana API error: ${response.status} ${response.statusText} - ${errorText}`,
            logs,
          };
        }

        const data = await response.json();
        addLog(`Response received: ${JSON.stringify(data)}`);

        if (!data.success) {
          addLog(`❌ [ERROR] Kana API returned success: false`);
          addLog(`Error message: ${data.message || 'Unknown error'}`);
          return {
            success: false,
            error: data.message || 'Failed to get positions from Kana API',
            logs,
          };
        }

        const positions = Array.isArray(data.data) ? data.data : [];
        addLog(`✅ [SUCCESS] Found ${positions.length} position(s)`);
        addLog(`🎉 [END] Get Positions completed successfully`);

        return {
          success: true,
          positions,
          logs,
        };
      } catch (apiError: any) {
        addLog(`❌ [ERROR] Failed to call Kana API`);
        addLog(`Error: ${apiError.message}`);
        return {
          success: false,
          error: `Failed to call Kana API: ${apiError.message}`,
          logs,
        };
      }
    } catch (error: any) {
      const errorLogs: string[] = logs.length > 0 ? [...logs] : [];
      const addErrorLog = (message: string) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        errorLogs.push(logMessage);
        console.error(logMessage);
      };

      addErrorLog(`❌ [FATAL ERROR] Unexpected error getting positions`);
      addErrorLog(`Error: ${error.message}`);
      if (error.stack) {
        addErrorLog(`Stack: ${error.stack.substring(0, 500)}...`);
      }
      console.error('[Kana] Get Positions error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get positions',
        logs: errorLogs,
      };
    }
  }

  /**
   * Withdraw from all markets in Kana trading account
   * This withdraws from all mainnet markets (14, 15, 16, 31)
   *
   * @param userId - User ID
   * @param amount - Optional amount per market (if not provided, withdraws all available balance from each market)
   * @returns Array of withdrawal results
   */
  async withdrawFromAllMarkets(
    userId: string,
    amount?: number,
  ): Promise<{
    success: boolean;
    results?: Array<{
      marketId: string;
      success: boolean;
      txHash?: string;
      error?: string;
    }>;
    error?: string;
    logs?: string[];
  }> {
    const logs: string[] = [];
    const addLog = (message: string) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}`;
      logs.push(logMessage);
      console.log(logMessage);
    };

    try {
      addLog(`🚀 [START] Withdraw from All Markets`);
      addLog(`User ID: ${userId}`);
      addLog(
        `Amount per market: ${amount ? amount.toFixed(2) + ' USDT' : 'All available balance'}`,
      );

      // Mainnet supported markets
      const mainnetMarkets = ['14', '15', '16', '31'];
      const results: Array<{
        marketId: string;
        success: boolean;
        txHash?: string;
        error?: string;
      }> = [];

      for (const marketId of mainnetMarkets) {
        addLog(`\n📋 Processing Market ${marketId}...`);
        try {
          const withdrawResult = await this.withdrawFromKana(
            userId,
            amount,
            marketId,
          );

          if (withdrawResult.logs) {
            withdrawResult.logs.forEach((log) => addLog(log));
          }

          results.push({
            marketId,
            success: withdrawResult.success,
            txHash: withdrawResult.txHash,
            error: withdrawResult.error,
          });

          if (withdrawResult.success) {
            addLog(
              `✅ Market ${marketId} withdrawal successful! TX: ${withdrawResult.txHash}`,
            );
          } else {
            addLog(
              `⚠️ Market ${marketId} withdrawal failed: ${withdrawResult.error || 'Unknown error'}`,
            );
          }
        } catch (err: any) {
          addLog(`❌ Market ${marketId} exception: ${err.message}`);
          results.push({
            marketId,
            success: false,
            error: err.message,
          });
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      addLog(`\n📊 Summary: ${successful} successful, ${failed} failed`);
      addLog(`🎉 [END] Withdraw from All Markets completed`);

      return {
        success: successful > 0,
        results,
        logs,
      };
    } catch (error: any) {
      const errorLogs: string[] = logs.length > 0 ? [...logs] : [];
      const addErrorLog = (message: string) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        errorLogs.push(logMessage);
        console.error(logMessage);
      };

      addErrorLog(
        `❌ [FATAL ERROR] Unexpected error withdrawing from all markets`,
      );
      addErrorLog(`Error: ${error.message}`);
      if (error.stack) {
        addErrorLog(`Stack: ${error.stack.substring(0, 500)}...`);
      }
      console.error('[Kana] Withdraw from All Markets error:', error);
      return {
        success: false,
        error: error.message || 'Failed to withdraw from all markets',
        logs: errorLogs,
      };
    }
  }

  /**
   * Withdraw USDT from Kana trading account to user's wallet
   * This transfers USDT from the trading profile back to the user's wallet
   *
   * @param userId - User ID
   * @param amount - Amount in USDT to withdraw (optional, if not provided, withdraws all available balance)
   * @param marketId - Market ID for the withdrawal (optional, might be required by Kana API)
   * @returns Transaction hash if successful
   */
  async withdrawFromKana(
    userId: string,
    amount?: number,
    marketId?: string,
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    logs?: string[];
    payload?: any;
  }> {
    const logs: string[] = [];
    const addLog = (message: string) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}`;
      logs.push(logMessage);
      console.log(logMessage);
    };

    try {
      addLog(`🚀 [START] Kana Withdrawal Process`);
      addLog(`User ID: ${userId}`);
      addLog(
        `Amount: ${amount ? amount.toFixed(2) + ' USDT' : 'All available balance'}`,
      );

      // Step 1: Get trading balance first
      addLog(`📋 [STEP 1] Checking trading balance...`);
      const balanceResult = await this.getTradingBalance(userId);

      if (!balanceResult.success || balanceResult.balance === undefined) {
        addLog(`❌ [ERROR] Failed to get trading balance`);
        return {
          success: false,
          error: balanceResult.error || 'Failed to get trading balance',
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      const tradingBalance = balanceResult.balance;
      addLog(`✅ [STEP 1] Trading Balance: $${tradingBalance.toFixed(6)} USDT`);

      // Determine withdrawal amount
      let withdrawalAmount = amount;
      if (!withdrawalAmount || withdrawalAmount <= 0) {
        withdrawalAmount = tradingBalance;
        addLog(
          `📋 Withdrawing all available balance: $${withdrawalAmount.toFixed(6)} USDT`,
        );
      }

      // Validate amount
      if (withdrawalAmount > tradingBalance) {
        addLog(`❌ [ERROR] Insufficient trading balance`);
        addLog(
          `Available: $${tradingBalance.toFixed(6)} USDT, Requested: $${withdrawalAmount.toFixed(6)} USDT`,
        );
        return {
          success: false,
          error: `Insufficient trading balance. Available: $${tradingBalance.toFixed(6)} USDT, Requested: $${withdrawalAmount.toFixed(6)} USDT`,
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      if (withdrawalAmount <= 0) {
        addLog(`❌ [ERROR] Invalid withdrawal amount`);
        return {
          success: false,
          error: 'Invalid withdrawal amount. Must be greater than 0.',
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      // Get user's wallet
      const wallet = await this.prisma.wallet.findUnique({
        where: { user_id: userId },
        select: {
          address: true,
          key: true,
        },
      });

      if (!wallet) {
        addLog(`❌ [ERROR] Wallet not found`);
        return {
          success: false,
          error: 'Wallet not found',
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      // Decrypt private key
      let privateKeyHex: string;
      try {
        privateKeyHex = await this.getPrivateKeyForSigning(userId);
      } catch (decryptError: any) {
        addLog(
          `❌ [ERROR] Failed to decrypt private key: ${decryptError.message}`,
        );
        return {
          success: false,
          error: `Failed to decrypt private key: ${decryptError.message}`,
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      // Clean and format private key (same as deposit)
      let privateKey = privateKeyHex.replace(/[\s\n\r\t]/g, '').trim();

      if (privateKey.toLowerCase().startsWith('0x')) {
        privateKey = privateKey.substring(2);
      }

      privateKey = privateKey.replace(/[^0-9a-fA-F]/g, '');

      if (privateKey.length === 0) {
        addLog(`❌ [ERROR] Invalid private key format after decryption`);
        return {
          success: false,
          error: 'Invalid private key format after decryption',
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      if (privateKey.length % 2 !== 0) {
        privateKey = '0' + privateKey;
      }

      if (privateKey.length < 64) {
        addLog(`❌ [ERROR] Invalid private key length`);
        return {
          success: false,
          error: 'Invalid private key length',
          logs: [...(balanceResult.logs || []), ...logs],
        };
      } else if (privateKey.length > 64) {
        privateKey = privateKey.substring(privateKey.length - 64);
      }

      privateKey = '0x' + privateKey;

      if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
        addLog(`❌ [ERROR] Invalid private key format`);
        return {
          success: false,
          error: 'Invalid private key format',
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      // Create Account object from private key
      let userAccount: Account;
      try {
        const ed25519PrivateKey = new Ed25519PrivateKey(privateKey);
        userAccount = Account.fromPrivateKey({ privateKey: ed25519PrivateKey });

        // Verify the account address matches the wallet address
        if (userAccount.accountAddress.toString() !== wallet.address) {
          addLog(`❌ [ERROR] Private key does not match wallet address`);
          return {
            success: false,
            error: 'Private key does not match wallet address',
            logs: [...(balanceResult.logs || []), ...logs],
          };
        }
      } catch (accountError: any) {
        addLog(
          `❌ [ERROR] Failed to create account from private key: ${accountError.message}`,
        );
        return {
          success: false,
          error: `Failed to create account from private key: ${accountError.message}`,
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      // Initialize Aptos client
      const network = 'mainnet' as Network;
      const config = new AptosConfig({ network });
      const aptos = new Aptos(config);

      // Get Kana API configuration
      const kanaApiKey = process.env.KANA_API_KEY || '';
      const kanaRestUrl =
        process.env.KANA_REST || 'https://perps-tradeapi.kana.trade';

      addLog(`📋 [STEP 2] Checking Kana API configuration...`);
      addLog(
        `Kana API Key present: ${kanaApiKey ? 'Yes (length: ' + kanaApiKey.length + ')' : 'No'}`,
      );
      addLog(`Kana REST URL: ${kanaRestUrl}`);

      if (!kanaApiKey) {
        addLog(`❌ [ERROR] Kana API key not configured`);
        return {
          success: false,
          error: 'Kana API key not configured',
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      // Step 3: Get withdraw payload from Kana API
      // Note: Endpoint is withdrawSpecifiMarket (with typo in Kana docs)
      if (!marketId) {
        addLog(`❌ [ERROR] marketId is required for withdrawal`);
        return {
          success: false,
          error:
            'marketId is required for withdrawal. Please specify a market ID.',
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      let withdrawUrl = `${kanaRestUrl}/withdrawSpecifiMarket?marketId=${marketId}&userAddress=${userAccount.accountAddress.toString()}&amount=${withdrawalAmount}`;
      addLog(`📋 [STEP 3] Calling Kana API to get withdrawal payload...`);
      addLog(`API Endpoint: withdrawSpecifiMarket`);
      addLog(`API URL: ${withdrawUrl}`);
      addLog(`User Address: ${userAccount.accountAddress.toString()}`);
      addLog(`Market ID: ${marketId}`);
      addLog(`Amount: ${withdrawalAmount} USDT`);

      let payloadData: any;
      try {
        addLog(`Sending GET request to Kana API...`);
        let response = await fetch(withdrawUrl, {
          method: 'GET',
          headers: {
            'x-api-key': kanaApiKey,
            'Content-Type': 'application/json',
          },
        });

        addLog(`Response status: ${response.status} ${response.statusText}`);

        // If GET fails with 404, try POST method
        if (!response.ok && response.status === 404) {
          addLog(
            `⚠️ [WARNING] GET request returned 404, trying POST method...`,
          );
          const postUrl = `${kanaRestUrl}/withdrawSpecifiMarket`;
          const postBody: any = {
            marketId: marketId,
            userAddress: userAccount.accountAddress.toString(),
            amount: withdrawalAmount,
          };

          addLog(`POST URL: ${postUrl}`);
          addLog(`POST Body: ${JSON.stringify(postBody)}`);

          response = await fetch(postUrl, {
            method: 'POST',
            headers: {
              'x-api-key': kanaApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(postBody),
          });

          addLog(
            `POST Response status: ${response.status} ${response.statusText}`,
          );
        }

        if (!response.ok) {
          const errorText = await response.text();
          addLog(
            `❌ [ERROR] Kana API returned error: ${response.status} ${response.statusText}`,
          );
          addLog(`Error details: ${errorText}`);
          return {
            success: false,
            error: `Kana API error: ${response.status} ${response.statusText} - ${errorText}`,
            logs: [...(balanceResult.logs || []), ...logs],
          };
        }

        payloadData = await response.json();
        addLog(`✅ Response received from Kana API`);
        addLog(`📦 Full Payload Data:`);
        addLog(`   Success: ${payloadData.success}`);
        addLog(`   Message: ${payloadData.message || 'N/A'}`);
        if (payloadData.data) {
          addLog(`   Function: ${payloadData.data.function || 'N/A'}`);
          addLog(
            `   Function Arguments: ${JSON.stringify(payloadData.data.functionArguments || [])}`,
          );
          addLog(
            `   Type Arguments: ${JSON.stringify(payloadData.data.typeArguments || [])}`,
          );
        }
        addLog(`📦 Full Payload JSON: ${JSON.stringify(payloadData, null, 2)}`);

        if (!payloadData.success) {
          addLog(`❌ [ERROR] Kana API returned success: false`);
          addLog(`Error message: ${payloadData.message || 'Unknown error'}`);
          return {
            success: false,
            error:
              payloadData.message ||
              'Failed to get withdrawal payload from Kana API',
            logs: [...(balanceResult.logs || []), ...logs],
            payload: payloadData, // Include payload in response for debugging
          };
        }
      } catch (apiError: any) {
        addLog(`❌ [ERROR] Failed to call Kana API`);
        addLog(`Error: ${apiError.message}`);
        addLog(`Stack: ${apiError.stack}`);
        return {
          success: false,
          error: `Failed to call Kana API: ${apiError.message}`,
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      addLog(`✅ [STEP 3] Withdrawal payload received successfully`);

      // Step 4: Build transaction with gas optimization
      addLog(`📋 [STEP 4] Building Aptos transaction...`);
      let transaction: any;
      try {
        transaction = await aptos.transaction.build.simple({
          sender: userAccount.accountAddress,
          data: payloadData.data,
          options: {
            maxGasAmount: 15000, // Limit max gas instead of auto-estimation
            gasUnitPrice: 100, // Use lower gas price (100 octas)
          },
        });
        addLog(`✅ [STEP 4] Transaction built successfully`);
      } catch (buildError: any) {
        addLog(`❌ [ERROR] Failed to build transaction`);
        addLog(`Error: ${buildError.message}`);
        return {
          success: false,
          error: `Failed to build transaction: ${buildError.message}`,
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      // Step 5: Sign and submit transaction
      addLog(`📋 [STEP 5] Signing and submitting transaction...`);
      let committedTxn: any;
      try {
        committedTxn = await aptos.transaction.signAndSubmitTransaction({
          transaction,
          signer: userAccount,
        });
        addLog(`✅ [STEP 5] Transaction signed and submitted`);
        addLog(`Transaction hash: ${committedTxn.hash}`);
      } catch (signError: any) {
        addLog(`❌ [ERROR] Failed to sign/submit transaction`);
        addLog(`Error: ${signError.message}`);
        return {
          success: false,
          error: `Failed to sign/submit transaction: ${signError.message}`,
          logs: [...(balanceResult.logs || []), ...logs],
        };
      }

      // Step 6: Wait for transaction confirmation
      addLog(`📋 [STEP 6] Waiting for transaction confirmation...`);
      try {
        await aptos.waitForTransaction({
          transactionHash: committedTxn.hash,
        });
        addLog(`✅ [STEP 6] Transaction confirmed on blockchain`);
        addLog(`🎉 [SUCCESS] Withdrawal completed successfully!`);
        addLog(`Transaction hash: ${committedTxn.hash}`);
        addLog(
          `View on Aptoscan: https://aptoscan.com/txn/${committedTxn.hash}`,
        );
      } catch (waitError: any) {
        // Transaction might still be pending, return the hash anyway
        addLog(`⚠️ [WARNING] Transaction submitted but confirmation pending`);
        addLog(`Transaction hash: ${committedTxn.hash}`);
        addLog(`This is normal - transaction may still be processing`);
      }

      addLog(`🎉 [END] Withdrawal process completed successfully`);
      return {
        success: true,
        txHash: committedTxn.hash,
        logs: [...(balanceResult.logs || []), ...logs],
        payload: payloadData, // Include payload in response for debugging
      };
    } catch (error: any) {
      const errorLogs: string[] = logs.length > 0 ? [...logs] : [];
      const addErrorLog = (message: string) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        errorLogs.push(logMessage);
        console.error(logMessage);
      };

      addErrorLog(`❌ [FATAL ERROR] Unexpected error during withdrawal`);
      addErrorLog(`Error: ${error.message}`);
      if (error.stack) {
        addErrorLog(`Stack: ${error.stack.substring(0, 500)}...`);
      }
      console.error('[Kana] Withdrawal error:', error);
      return {
        success: false,
        error: error.message || 'Failed to withdraw from Kana',
        logs: errorLogs,
      };
    }
  }
}
