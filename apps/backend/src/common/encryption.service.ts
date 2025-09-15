import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';

/**
 * 🔐 Encryption Service - AES-256-GCM encryption for sensitive data
 * 
 * Used for encrypting:
 * - TOTP secrets
 * - PII data (before HSM storage)
 * - Backup codes
 * - Other sensitive information
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get('ENCRYPTION_KEY');
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be exactly 64 characters (32 bytes hex)');
    }
    
    this.key = Buffer.from(encryptionKey, 'hex');
    this.logger.log('✅ Encryption service initialized');
  }

  /**
   * Encrypt text using AES-256-GCM
   */
  encrypt(text: string): string {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Format: iv:authTag:encrypted
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logger.error('❌ Encryption failed:', error.message);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt text using AES-256-GCM
   */
  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('❌ Decryption failed:', error.message);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Create HMAC for data integrity
   */
  createHmac(data: string): string {
    return createHmac('sha256', this.key).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHmac(data: string, hmac: string): boolean {
    const computedHmac = this.createHmac(data);
    return computedHmac === hmac;
  }
}
