import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';

/**
 * Encryption Service using AES-256-GCM
 *
 * Security Features:
 * - AES-256-GCM (Galois/Counter Mode) - Industry standard authenticated encryption
 * - Random IV (Initialization Vector) for each encryption
 * - Authentication tag to detect tampering
 * - Master key from environment variable (ENCRYPTION_KEY)
 *
 * NEVER expose private keys in plaintext!
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits = 32 bytes
  private readonly ivLength = 16; // 128 bits = 16 bytes
  private readonly tagLength = 16; // 128 bits = 16 bytes
  private readonly masterKey: Buffer;

  constructor() {
    // Get encryption key from environment variable
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      const errorMsg =
        'ENCRYPTION_KEY environment variable is required. ' +
        "Generate a 32-byte (256-bit) key: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"";
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Validate key length (should be at least 16 characters)
    if (!EncryptionService.validateKey(encryptionKey)) {
      const errorMsg = 'ENCRYPTION_KEY must be at least 16 characters long';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Derive a consistent key from the environment variable
    // Using PBKDF2 to ensure we have exactly 32 bytes
    this.masterKey = crypto.pbkdf2Sync(
      encryptionKey,
      'aptos-wallet-salt', // Salt for key derivation
      100000, // 100k iterations (slower but more secure)
      this.keyLength,
      'sha256',
    );

    console.log('✅ Encryption service initialized (AES-256-GCM)');
  }

  /**
   * Encrypt sensitive data (private keys)
   * @param plaintext - The data to encrypt (private key)
   * @returns Encrypted data in format: iv:tag:encryptedData (hex encoded)
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Return: iv:tag:encryptedData (all hex encoded)
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data (private keys)
   * @param encryptedData - Encrypted data in format: iv:tag:encryptedData
   * @returns Decrypted plaintext (private key)
   */
  decrypt(encryptedData: string): string {
    try {
      // Split the encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, tagHex, encryptedHex] = parts;

      // Convert hex strings back to buffers
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.masterKey,
        iv,
      );

      // Set authentication tag
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Validate encryption key format
   */
  static validateKey(key: string): boolean {
    // Key should be at least 32 characters (we'll derive 32 bytes from it)
    return Boolean(key && key.length >= 16);
  }
}
