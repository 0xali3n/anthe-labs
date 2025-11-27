import * as crypto from "node:crypto";
import { Logger } from "../utils/logger";

/**
 * Encryption Service using AES-256-GCM
 * Same implementation as API service
 */
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32; // 256 bits = 32 bytes
  // private readonly ivLength = 16; // 128 bits = 16 bytes
  private readonly masterKey: Buffer;

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      const errorMsg =
        "ENCRYPTION_KEY environment variable is required. " +
        "Generate a 32-byte (256-bit) key: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"";
      Logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!EncryptionService.validateKey(encryptionKey)) {
      const errorMsg = "ENCRYPTION_KEY must be at least 16 characters long";
      Logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Derive a consistent key from the environment variable
    this.masterKey = crypto.pbkdf2Sync(
      encryptionKey,
      "aptos-wallet-salt", // Salt for key derivation
      100000, // 100k iterations
      this.keyLength,
      "sha256"
    );

    Logger.success("✅ Encryption service initialized (AES-256-GCM)");
  }

  /**
   * Decrypt sensitive data (private keys)
   */
  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(":");
      if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format");
      }

      const [ivHex, tagHex, encryptedHex] = parts;

      const iv = Buffer.from(ivHex, "hex");
      const tag = Buffer.from(tagHex, "hex");
      const encrypted = Buffer.from(encryptedHex, "hex");

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.masterKey,
        iv
      );

      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Decryption failed: ${errorMessage}`);
    }
  }

  static validateKey(key: string): boolean {
    return Boolean(key && key.length >= 16);
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();

