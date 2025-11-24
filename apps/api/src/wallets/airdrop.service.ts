import { Injectable, Logger } from '@nestjs/common';
import { Account, Aptos, AptosConfig, Network, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

/**
 * Airdrop Service
 * 
 * Handles sending 0.05 APT to users on their first deposit
 * Uses gas wallet private key from environment variable
 */
@Injectable()
export class AirdropService {
  private readonly logger = new Logger(AirdropService.name);
  private gasWallet: Account | null = null;
  private aptos: Aptos;

  constructor() {
    // Initialize Aptos client (mainnet)
    const network = 'mainnet' as Network;
    const config = new AptosConfig({ network });
    this.aptos = new Aptos(config);

    // Initialize gas wallet from environment variable
    const gasWalletPrivateKey = process.env.GAS_WALLET_PRIVATE_KEY;
    
    if (!gasWalletPrivateKey) {
      this.logger.warn('GAS_WALLET_PRIVATE_KEY not found in environment variables');
      return;
    }

    try {
      // Create account from private key
      // Private key should be in hex format (64 characters) or with 0x prefix
      let privateKeyHex = gasWalletPrivateKey.trim();
      if (!privateKeyHex.startsWith('0x')) {
        privateKeyHex = '0x' + privateKeyHex;
      }

      // Convert hex string to Ed25519PrivateKey
      const privateKey = new Ed25519PrivateKey(privateKeyHex);
      
      // Create account from private key
      this.gasWallet = Account.fromPrivateKey({ privateKey });
      
      if (this.gasWallet) {
        this.logger.log(`✅ Gas wallet initialized: ${this.gasWallet.accountAddress.toString()}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to initialize gas wallet:', error.message);
      throw new Error(`Failed to initialize gas wallet: ${error.message}`);
    }
  }

  /**
   * Send 0.05 APT to user wallet
   * @param recipientAddress - User's wallet address to receive APT
   * @returns Transaction hash if successful
   */
  async sendAirdrop(recipientAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.gasWallet) {
      return {
        success: false,
        error: 'Gas wallet not initialized. Please set GAS_WALLET_PRIVATE_KEY in environment variables.',
      };
    }

    try {
      // Validate recipient address
      if (!recipientAddress || !recipientAddress.startsWith('0x')) {
        return {
          success: false,
          error: 'Invalid recipient address format',
        };
      }

      // Amount to send: 0.05 APT
      // APT has 8 decimals, so 0.05 APT = 5000000 octas
      const amountInOctas = 5000000; // 0.05 * 10^8

      this.logger.log(`🚀 Sending 0.05 APT airdrop to ${recipientAddress}...`);

      // Create transfer transaction
      const transaction = await this.aptos.transferCoinTransaction({
        sender: this.gasWallet.accountAddress,
        recipient: recipientAddress,
        amount: amountInOctas,
      });

      // Sign transaction
      const senderAuthenticator = this.aptos.transaction.sign({
        signer: this.gasWallet,
        transaction,
      });

      // Submit transaction
      const pendingTxn = await this.aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      // Wait for transaction to be confirmed
      const executedTxn = await this.aptos.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      if (executedTxn.success) {
        this.logger.log(`✅ Airdrop successful! Transaction: ${pendingTxn.hash}`);
        return {
          success: true,
          txHash: pendingTxn.hash,
        };
      } else {
        this.logger.error(`❌ Airdrop transaction failed: ${pendingTxn.hash}`);
        return {
          success: false,
          error: 'Transaction failed on blockchain',
        };
      }
    } catch (error: any) {
      this.logger.error(`❌ Error sending airdrop to ${recipientAddress}:`, error.message);
      return {
        success: false,
        error: error.message || 'Failed to send airdrop',
      };
    }
  }

  /**
   * Check if gas wallet has sufficient balance for airdrop
   * @returns true if balance >= 0.1 APT (safety margin)
   */
  async checkGasWalletBalance(): Promise<{ hasBalance: boolean; balance?: string }> {
    if (!this.gasWallet) {
      return { hasBalance: false };
    }

    try {
      const balance = await this.aptos.getAccountAPTAmount({
        accountAddress: this.gasWallet.accountAddress,
      });

      // Convert from octas to APT (8 decimals)
      const balanceInAPT = Number(balance) / 100000000;
      
      // Check if balance is at least 0.1 APT (safety margin)
      const hasBalance = balanceInAPT >= 0.1;

      return {
        hasBalance,
        balance: balanceInAPT.toFixed(8),
      };
    } catch (error: any) {
      this.logger.error('Error checking gas wallet balance:', error.message);
      return { hasBalance: false };
    }
  }
}

