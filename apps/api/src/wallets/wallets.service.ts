import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { AirdropService } from './airdrop.service';
import { Account, Aptos, AptosConfig, Network, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

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
    console.log(`\n🔵 [WITHDRAWAL START] User: ${userId}, Amount: ${amount} USDT, To: ${recipientAddress}`);
    
    try {
      // Validate inputs
      console.log(`📋 [STEP 1] Validating inputs...`);
      if (!recipientAddress || !recipientAddress.startsWith('0x')) {
        console.error(`❌ [STEP 1 FAILED] Invalid recipient address format: ${recipientAddress}`);
        return {
          success: false,
          error: 'Invalid recipient address format',
        };
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        console.error(`❌ [STEP 1 FAILED] Invalid amount: ${amount}`);
        return {
          success: false,
          error: 'Invalid amount. Must be a positive number.',
        };
      }
      console.log(`✅ [STEP 1] Inputs validated - Amount: ${amountNum} USDT, Recipient: ${recipientAddress}`);

      // Get user's wallet
      console.log(`📋 [STEP 2] Fetching wallet from database...`);
      const wallet = await this.prisma.wallet.findUnique({
        where: { user_id: userId },
        select: {
          address: true,
          key: true,
        },
      });

      if (!wallet) {
        console.error(`❌ [STEP 2 FAILED] Wallet not found for user: ${userId}`);
        return {
          success: false,
          error: 'Wallet not found',
        };
      }
      console.log(`✅ [STEP 2] Wallet found - Address: ${wallet.address}, Encrypted key length: ${wallet.key.length}`);

      // Check balance before withdrawal
      console.log(`📋 [STEP 3] Checking USDT balance...`);
      const balance = await this.getUSDTBalance(wallet.address);
      const balanceNum = parseFloat(balance);
      console.log(`📊 [STEP 3] Balance check - Available: ${balance} USDT, Requested: ${amountNum} USDT`);
      
      if (balanceNum < amountNum) {
        console.error(`❌ [STEP 3 FAILED] Insufficient balance`);
        return {
          success: false,
          error: `Insufficient balance. Available: ${balance} USDT, Requested: ${amount} USDT`,
        };
      }
      console.log(`✅ [STEP 3] Balance sufficient`);

      // Decrypt private key using the existing method
      console.log(`📋 [STEP 4] Decrypting private key...`);
      let privateKeyHex: string;
      try {
        privateKeyHex = await this.getPrivateKeyForSigning(userId);
        console.log(`✅ [STEP 4] Private key decrypted - Length: ${privateKeyHex.length}, First 10 chars: ${privateKeyHex.substring(0, 10)}...`);
      } catch (decryptError: any) {
        console.error(`❌ [STEP 4 FAILED] Decryption error:`, decryptError.message);
        console.error(`❌ [STEP 4 FAILED] Stack:`, decryptError.stack);
        return {
          success: false,
          error: `Failed to decrypt private key: ${decryptError.message}`,
        };
      }
      
      // Clean and format private key: remove any non-hex characters and ensure proper format
      console.log(`📝 [STEP 4] Raw decrypted key - Length: ${privateKeyHex.length}, First 20 chars: "${privateKeyHex.substring(0, 20)}", Last 20 chars: "${privateKeyHex.substring(Math.max(0, privateKeyHex.length - 20))}"`);
      
      // Remove all whitespace and non-printable characters
      let privateKey = privateKeyHex.replace(/[\s\n\r\t]/g, '').trim();
      
      // Remove 0x prefix if present to work with hex string
      const hadPrefix = privateKey.toLowerCase().startsWith('0x');
      if (hadPrefix) {
        privateKey = privateKey.substring(2);
        console.log(`📝 [STEP 4] Removed 0x prefix for processing`);
      }
      
      // Extract only hex characters (0-9, a-f, A-F)
      privateKey = privateKey.replace(/[^0-9a-fA-F]/g, '');
      console.log(`📝 [STEP 4] After cleaning non-hex chars - Length: ${privateKey.length}`);
      
      // Check if we have any hex characters left
      if (privateKey.length === 0) {
        console.error(`❌ [STEP 4 FAILED] No valid hex characters found in decrypted private key`);
        console.error(`   Original length: ${privateKeyHex.length}`);
        console.error(`   Original value (first 50): ${privateKeyHex.substring(0, 50)}`);
        return {
          success: false,
          error: 'Invalid private key format after decryption - no hex characters found',
        };
      }
      
      // Ensure hex string has even number of characters (pad with leading zero if needed)
      if (privateKey.length % 2 !== 0) {
        privateKey = '0' + privateKey;
        console.log(`📝 [STEP 4] Padded private key with leading zero (was odd length: ${privateKey.length - 1}, now: ${privateKey.length})`);
      }
      
      // Validate expected length (should be 64 hex chars for 32 bytes)
      if (privateKey.length < 64) {
        console.warn(`⚠️ [STEP 4] Private key is shorter than expected (${privateKey.length} chars, expected 64)`);
      } else if (privateKey.length > 64) {
        // If longer, take the last 64 characters (in case there's extra data)
        console.warn(`⚠️ [STEP 4] Private key is longer than expected (${privateKey.length} chars, expected 64), taking last 64`);
        privateKey = privateKey.substring(privateKey.length - 64);
      }
      
      // Add 0x prefix back
      privateKey = '0x' + privateKey;
      console.log(`✅ [STEP 4] Private key formatted - Final length: ${privateKey.length}, Hex chars: ${privateKey.length - 2}`);
      
      // Final validation - should be 0x followed by 64 hex characters
      if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
        console.error(`❌ [STEP 4 FAILED] Invalid hex format in private key`);
        console.error(`   Final value: ${privateKey}`);
        console.error(`   Length: ${privateKey.length}`);
        console.error(`   Hex part length: ${privateKey.length - 2}`);
        return {
          success: false,
          error: `Invalid private key format after decryption - expected 64 hex chars, got ${privateKey.length - 2}`,
        };
      }

      // Create account from private key
      console.log(`📋 [STEP 5] Creating account from private key...`);
      let ed25519PrivateKey: Ed25519PrivateKey;
      let userAccount: Account;
      try {
        ed25519PrivateKey = new Ed25519PrivateKey(privateKey);
        console.log(`✅ [STEP 5] Ed25519PrivateKey created successfully`);
        
        userAccount = Account.fromPrivateKey({ privateKey: ed25519PrivateKey });
        console.log(`✅ [STEP 5] Account created - Address: ${userAccount.accountAddress.toString()}`);
      } catch (accountError: any) {
        console.error(`❌ [STEP 5 FAILED] Account creation error:`, accountError.message);
        console.error(`❌ [STEP 5 FAILED] Stack:`, accountError.stack);
        return {
          success: false,
          error: `Failed to create account from private key: ${accountError.message}`,
        };
      }
      
      // Verify the account address matches the wallet address
      console.log(`📋 [STEP 6] Verifying account address matches wallet...`);
      const accountAddress = userAccount.accountAddress.toString();
      if (accountAddress !== wallet.address) {
        console.error(`❌ [STEP 6 FAILED] Address mismatch!`);
        console.error(`   Wallet address: ${wallet.address}`);
        console.error(`   Account address: ${accountAddress}`);
        return {
          success: false,
          error: 'Private key does not match wallet address',
        };
      }
      console.log(`✅ [STEP 6] Account address verified: ${accountAddress}`);

      // Initialize Aptos client
      console.log(`📋 [STEP 7] Initializing Aptos client...`);
      const network = 'mainnet' as Network;
      const config = new AptosConfig({ network });
      const aptos = new Aptos(config);
      console.log(`✅ [STEP 7] Aptos client initialized for ${network}`);

      // Check APT balance for gas fees (REQUIRED - don't proceed without APT)
      console.log(`📋 [STEP 7.5] Checking APT balance for gas fees...`);
      let aptBalanceInAPT = 0;
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: userAccount.accountAddress,
        });
        aptBalanceInAPT = Number(aptBalance) / 100000000; // Convert from octas
        console.log(`📊 [STEP 7.5] APT Balance: ${aptBalanceInAPT.toFixed(8)} APT`);
      } catch (aptBalanceError: any) {
        console.error(`❌ [STEP 7.5 FAILED] Could not check APT balance: ${aptBalanceError.message}`);
        return {
          success: false,
          error: `Could not check APT balance. Please ensure your wallet is set up correctly. Error: ${aptBalanceError.message}`,
        };
      }
      
      // Minimum required: ~0.0001 APT for transaction fee (very minimal)
      // Typical Aptos transaction fees are around 0.00001-0.0001 APT
      if (aptBalanceInAPT < 0.0001) {
        console.error(`❌ [STEP 7.5 FAILED] Insufficient APT for gas fees`);
        console.error(`   Required: 0.0001 APT minimum`);
        console.error(`   Available: ${aptBalanceInAPT.toFixed(8)} APT`);
        return {
          success: false,
          error: `Insufficient APT balance for transaction fees. You need at least 0.0001 APT for gas, but you have ${aptBalanceInAPT.toFixed(8)} APT. Please check your deposit to receive the 0.05 APT airdrop first.`,
        };
      }
      console.log(`✅ [STEP 7.5] APT balance sufficient for gas fees (${aptBalanceInAPT.toFixed(8)} APT available)`);

      // USDT Fungible Asset Metadata Address on Aptos Mainnet
      const usdtMetadataAddress =
        '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b';

      // Convert amount to smallest unit (USDT has 6 decimals)
      const amountInSmallestUnit = BigInt(Math.floor(amountNum * 1000000));
      console.log(`📋 [STEP 8] Amount conversion - ${amountNum} USDT = ${amountInSmallestUnit.toString()} smallest units`);

      console.log(`📋 [STEP 9] Building transaction (optimized for low fees)...`);
      console.log(`   Function: 0x1::primary_fungible_store::transfer`);
      console.log(`   Sender: ${accountAddress}`);
      console.log(`   Recipient: ${recipientAddress}`);
      console.log(`   USDT Metadata: ${usdtMetadataAddress}`);
      console.log(`   Amount: ${amountInSmallestUnit.toString()}`);

      // Transfer fungible asset (USDT)
      // Using primary_fungible_store::transfer function
      // Function signature: transfer<F: ObjectCore>(store: &mut PrimaryFungibleStore, to: address, amount: u64)
      // Using simple transaction builder - Aptos will auto-calculate minimal gas
      let transaction: any;
      try {
        transaction = await aptos.transaction.build.simple({
          sender: userAccount.accountAddress,
          data: {
            function: '0x1::primary_fungible_store::transfer',
            typeArguments: ['0x1::object::ObjectCore'],
            functionArguments: [
              usdtMetadataAddress, // fungible_metadata (store)
              recipientAddress,    // to
              amountInSmallestUnit.toString(), // amount
            ],
          },
        });
        console.log(`✅ [STEP 9] Transaction built successfully`);
        console.log(`   Transaction type: ${transaction.constructor.name}`);
      } catch (buildError: any) {
        console.error(`❌ [STEP 9 FAILED] Transaction build error:`, buildError.message);
        console.error(`❌ [STEP 9 FAILED] Stack:`, buildError.stack);
        return {
          success: false,
          error: `Failed to build transaction: ${buildError.message}`,
        };
      }

      // Sign transaction
      console.log(`📋 [STEP 10] Signing transaction...`);
      let senderAuthenticator: any;
      try {
        senderAuthenticator = aptos.transaction.sign({
          signer: userAccount,
          transaction,
        });
        console.log(`✅ [STEP 10] Transaction signed successfully`);
      } catch (signError: any) {
        console.error(`❌ [STEP 10 FAILED] Signing error:`, signError.message);
        console.error(`❌ [STEP 10 FAILED] Stack:`, signError.stack);
        return {
          success: false,
          error: `Failed to sign transaction: ${signError.message}`,
        };
      }

      // Submit transaction
      console.log(`📋 [STEP 11] Submitting transaction to blockchain...`);
      let pendingTxn: any;
      try {
        pendingTxn = await aptos.transaction.submit.simple({
          transaction,
          senderAuthenticator,
        });
        console.log(`✅ [STEP 11] Transaction submitted - Hash: ${pendingTxn.hash}`);
      } catch (submitError: any) {
        console.error(`❌ [STEP 11 FAILED] Submission error:`, submitError.message);
        console.error(`❌ [STEP 11 FAILED] Stack:`, submitError.stack);
        return {
          success: false,
          error: `Failed to submit transaction: ${submitError.message}`,
        };
      }

      // Wait for transaction to be confirmed
      console.log(`📋 [STEP 12] Waiting for transaction confirmation...`);
      let executedTxn: any;
      try {
        executedTxn = await aptos.waitForTransaction({
          transactionHash: pendingTxn.hash,
        });
        console.log(`✅ [STEP 12] Transaction confirmed - Success: ${executedTxn.success}`);
      } catch (waitError: any) {
        console.error(`❌ [STEP 12 FAILED] Wait error:`, waitError.message);
        console.error(`❌ [STEP 12 FAILED] Stack:`, waitError.stack);
        // Transaction might still be pending, return the hash anyway
        console.log(`⚠️ [STEP 12] Returning transaction hash despite wait error: ${pendingTxn.hash}`);
        return {
          success: true,
          txHash: pendingTxn.hash,
        };
      }

      if (executedTxn.success) {
        console.log(`✅ [WITHDRAWAL SUCCESS] Transaction: ${pendingTxn.hash}`);
        console.log(`\n`);
        return {
          success: true,
          txHash: pendingTxn.hash,
        };
      } else {
        console.error(`❌ [WITHDRAWAL FAILED] Transaction failed on blockchain: ${pendingTxn.hash}`);
        console.error(`   VM Status: ${executedTxn.vm_status || 'Unknown'}`);
        console.log(`\n`);
        return {
          success: false,
          error: `Transaction failed on blockchain: ${executedTxn.vm_status || 'Unknown error'}`,
        };
      }
    } catch (error: any) {
      console.error(`\n❌ [WITHDRAWAL ERROR] Unexpected error for user ${userId}:`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      console.log(`\n`);
      return {
        success: false,
        error: error.message || 'Failed to withdraw USDT',
      };
    }
  }
}
