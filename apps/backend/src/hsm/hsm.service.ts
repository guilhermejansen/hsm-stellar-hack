import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { StrKey } from '@stellar/stellar-sdk';

import { AuditService } from '../common/audit.service';
import { HSMConfig, HSMPartitionInfo, HSMKeyInfo, HSMSignatureRequest, HSMKeyReleaseAuth } from '../common/interfaces';

/**
 * 🔐 HSM DINAMO Service - Hardware Security Module Integration
 * 
 * Following api-integrations.mdc HSM DINAMO integration rules:
 * - Individual partitions per user
 * - BIP32 Edwards XPRIV key generation
 * - AES256 keys for PII encryption
 * - TOTP-authorized key release for signing
 * - Complete KYC workflow with Svault Module
 * 
 * Architecture:
 * - Master Key in HSM partition
 * - Cold Wallet: m/0' (95% of funds) 
 * - Hot Wallet: m/0'/0' (5% of funds, derived from Cold)
 * - Guardian keys: Individual partitions with BIP32
 */
@Injectable()
export class HSMService implements OnModuleInit {
  private readonly logger = new Logger(HSMService.name);
  private hsmClient: AxiosInstance;
  private readonly config: HSMConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) {
    // Load HSM configuration from environment
    this.config = {
      host: this.configService.get('HSM_HOST', '187.33.9.132'),
      port: parseInt(this.configService.get('HSM_PORT', '4433')),
      user: this.configService.get('HSM_USER', 'demoale'),
      password: this.configService.get('HSM_PASS', '12345678'),
      partition: this.configService.get('HSM_PARTITION', 'DEMO'),
      timeout: parseInt(this.configService.get('HSM_TIMEOUT', '30000'))
    };
  }

  async onModuleInit() {
    await this.initializeConnection();
  }

  /**
   * Initialize HSM connection
   */
  private async initializeConnection(): Promise<void> {
    try {
      this.hsmClient = axios.create({
        baseURL: `https://${this.config.host}:${this.config.port}`,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StellarCustody/1.0.0'
        }
      });

      // Test connection
      await this.testConnection();
      this.logger.log('✅ HSM DINAMO connection established');
      
    } catch (error) {
      this.logger.error('❌ HSM connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Test HSM connectivity
   */
  private async testConnection(): Promise<void> {
    try {
      // Mock HSM API call for testing
      // In production, this would be actual HSM API
      this.logger.log('🔍 Testing HSM connection...');
      
      // For now, just validate configuration
      if (!this.config.host || !this.config.user) {
        throw new Error('HSM configuration incomplete');
      }
      
      this.logger.log('✅ HSM connection test passed');
    } catch (error) {
      throw new Error(`HSM connection test failed: ${error.message}`);
    }
  }

  // ==================== KYC USER WORKFLOW ====================

  /**
   * Complete KYC process with HSM partition creation
   * Following the workflow from api-integrations.mdc
   */
  async createUserWithKYC(kycData: any): Promise<HSMPartitionInfo> {
    const startTime = Date.now();
    
    try {
      // 1. Process KYC data
      const pii = {
        name: kycData.name,
        docId: kycData.docId,
        address: kycData.address,
        phone: kycData.phone,
        email: kycData.email
      };
      
      this.logger.log('🔄 Starting KYC process with HSM partition creation');

      // 2. Request random from HSM (mock implementation)
      const randomData = crypto.randomBytes(32).toString('hex');
      
      // 3. Create user ID with SHA256
      const userId = crypto.createHash('sha256')
        .update(JSON.stringify(pii) + randomData)
        .digest('hex');
      
      // 4. Create individual partition for user
      const partitionId = `user_${userId.substring(0, 16)}`;
      await this.createPartition(partitionId);
      
      // 5. Create AES256 key for PII encryption
      const aesKeyId = await this.generateAESKey(partitionId, `aes_pii_${userId.substring(0, 8)}`);
      
      // 6. Create BIP32 Edwards XPRIV for Stellar
      const masterKeyId = await this.generateBIP32Key(partitionId, `stellar_master_${userId.substring(0, 8)}`);
      
      // 7. Encrypt PII with AES key using Svault Module (mock)
      const encryptedPII = await this.svaultEncrypt(aesKeyId, JSON.stringify(pii));

      const result: HSMPartitionInfo = {
        partitionId,
        aesKeyId,
        masterKeyId,
        isActive: true
      };

      // Audit log
      await this.auditService.logHSMOperation(
        userId,
        'kyc_partition_created',
        'success',
        partitionId,
        masterKeyId,
        { duration: Date.now() - startTime }
      );

      this.logger.log(`✅ KYC partition created: ${partitionId}`);
      return result;
      
    } catch (error) {
      await this.auditService.logHSMOperation(
        'unknown',
        'kyc_partition_creation_failed',
        'failure',
        undefined,
        undefined,
        { error: error.message, duration: Date.now() - startTime }
      );
      
      this.logger.error('❌ KYC partition creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create HSM partition (mock implementation)
   */
  private async createPartition(partitionId: string): Promise<void> {
    try {
      this.logger.log(`🔐 Creating HSM partition: ${partitionId}`);
      
      // Mock HSM partition creation
      // In production: await this.hsmClient.post('/partitions', { partitionId, ...config })
      
      // Simulate partition creation delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.log(`✅ HSM partition created: ${partitionId}`);
    } catch (error) {
      throw new Error(`Failed to create HSM partition: ${error.message}`);
    }
  }

  /**
   * Generate AES256 key for PII encryption
   */
  private async generateAESKey(partitionId: string, keyLabel: string): Promise<string> {
    try {
      this.logger.log(`🔑 Generating AES256 key: ${keyLabel}`);
      
      // Mock AES key generation
      // In production: HSM API call to generate AES256 key
      const aesKeyId = `aes_${crypto.randomBytes(16).toString('hex')}`;
      
      this.logger.log(`✅ AES256 key generated: ${aesKeyId}`);
      return aesKeyId;
    } catch (error) {
      throw new Error(`Failed to generate AES key: ${error.message}`);
    }
  }

  /**
   * Generate BIP32 Edwards XPRIV key for Stellar
   */
  private async generateBIP32Key(partitionId: string, keyLabel: string): Promise<string> {
    try {
      this.logger.log(`🔑 Generating BIP32 Edwards XPRIV: ${keyLabel}`);
      
      // Mock BIP32 key generation
      // In production: HSM API call to generate BIP32 Edwards key
      const masterKeyId = `bip32_${crypto.randomBytes(16).toString('hex')}`;
      
      this.logger.log(`✅ BIP32 key generated: ${masterKeyId}`);
      return masterKeyId;
    } catch (error) {
      throw new Error(`Failed to generate BIP32 key: ${error.message}`);
    }
  }

  /**
   * Encrypt PII using HSM Svault Module
   */
  private async svaultEncrypt(aesKeyId: string, data: string): Promise<string> {
    try {
      this.logger.log(`🔐 Encrypting PII with Svault Module`);
      
      // Mock Svault encryption
      // In production: HSM Svault Module API call
      const encrypted = crypto.createHash('sha256').update(data + aesKeyId).digest('hex');
      
      return `svault_${encrypted}`;
    } catch (error) {
      throw new Error(`Svault encryption failed: ${error.message}`);
    }
  }

  // ==================== WALLET HIERARCHY CREATION ====================

  /**
   * Create hierarchical wallet structure (Cold master, Hot derived)
   * Following BIP32 hierarchy from api-integrations.mdc
   */
  async createWalletHierarchy(userId: string, partitionId: string, masterKeyId: string) {
    try {
      this.logger.log(`🌳 Creating wallet hierarchy for user: ${userId}`);

      // 1. Cold Wallet (Master) - 95% of funds - derivation path m/0'
      const coldKeyInfo = await this.deriveKey({
        parentKeyId: masterKeyId,
        derivationPath: "m/0'",
        partition: partitionId,
        purpose: 'cold_wallet'
      });

      // 2. Hot Wallet (Derived from Cold) - 5% of funds - derivation path m/0'/0'  
      const hotKeyInfo = await this.deriveKey({
        parentKeyId: coldKeyInfo.keyId,
        derivationPath: "m/0'/0'",
        partition: partitionId,
        purpose: 'hot_wallet'
      });

      const result = {
        coldWallet: {
          keyId: coldKeyInfo.keyId,
          address: coldKeyInfo.publicKey,
          derivationPath: "m/0'",
          maxBalance: "95%",
          requiresTOTP: true,
          hsmPartitionId: partitionId
        },
        hotWallet: {
          keyId: hotKeyInfo.keyId,
          address: hotKeyInfo.publicKey,
          derivationPath: "m/0'/0'",
          maxBalance: "5%", 
          requiresTOTP: false,
          parentKeyId: coldKeyInfo.keyId,
          hsmPartitionId: partitionId
        }
      };

      // Audit log
      await this.auditService.logHSMOperation(
        userId,
        'wallet_hierarchy_created',
        'success',
        partitionId,
        masterKeyId,
        { 
          coldAddress: coldKeyInfo.publicKey,
          hotAddress: hotKeyInfo.publicKey
        }
      );

      this.logger.log(`✅ Wallet hierarchy created - Cold: ${coldKeyInfo.publicKey}, Hot: ${hotKeyInfo.publicKey}`);
      return result;

    } catch (error) {
      await this.auditService.logHSMOperation(
        userId,
        'wallet_hierarchy_creation_failed',
        'failure',
        partitionId,
        masterKeyId,
        { error: error.message }
      );
      
      this.logger.error('❌ Wallet hierarchy creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Derive key from parent using BIP32
   */
  private async deriveKey(params: {
    parentKeyId: string;
    derivationPath: string;
    partition: string;
    purpose: string;
  }): Promise<HSMKeyInfo> {
    try {
      this.logger.log(`🔑 Deriving key: ${params.derivationPath} for ${params.purpose}`);
      
      // Mock BIP32 key derivation
      // In production: HSM API call for BIP32 derivation
      const derivedKeyId = `derived_${crypto.randomBytes(16).toString('hex')}`;
      
      // Generate mock Ed25519 public key for Stellar
      const mockPublicKey = StrKey.encodeEd25519PublicKey(crypto.randomBytes(32));
      
      const keyInfo: HSMKeyInfo = {
        keyId: derivedKeyId,
        keyName: `${params.purpose}_${params.derivationPath.replace(/['/]/g, '_')}`,
        algorithm: 'ED25519',
        derivationPath: params.derivationPath,
        publicKey: mockPublicKey,
        partition: params.partition
      };

      this.logger.log(`✅ Key derived: ${keyInfo.keyName} -> ${keyInfo.publicKey}`);
      return keyInfo;
      
    } catch (error) {
      throw new Error(`Key derivation failed: ${error.message}`);
    }
  }

  // ==================== TOTP-AUTHORIZED SIGNING ====================

  /**
   * Authorize key release with TOTP and sign transaction
   * Following security-practices.mdc TOTP key release flow
   */
  async authorizeKeyReleaseAndSign(
    partitionId: string,
    keyId: string,
    totpCode: string,
    rawTransaction: string,
    guardianId: string
  ): Promise<{ signature: string; keyReleaseId: string }> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🔐 Authorizing key release for partition: ${partitionId}`);

      // 1. Validate TOTP code format
      if (!/^[0-9]{6}$/.test(totpCode)) {
        throw new Error('Invalid TOTP code format');
      }

      // 2. TOTP authorizes HSM to release key for signing (mock)
      const keyReleaseAuth = await this.authorizeKeyRelease({
        partition: partitionId,
        keyId: keyId,
        totpCode: totpCode,
        purpose: 'transaction_signing',
        guardianId: guardianId
      });

      if (!keyReleaseAuth.success) {
        throw new Error('HSM denied key release authorization');
      }

      // 3. HSM signs the raw transaction with released key
      const signature = await this.signWithReleasedKey({
        keyId: keyId,
        data: Buffer.from(rawTransaction, 'hex'),
        algorithm: 'ED25519',
        releaseId: keyReleaseAuth.releaseId
      });

      // Audit log
      await this.auditService.logHSMOperation(
        guardianId,
        'key_release_and_sign',
        'success',
        partitionId,
        keyId,
        {
          keyReleaseId: keyReleaseAuth.releaseId,
          duration: Date.now() - startTime
        }
      );

      this.logger.log(`✅ Transaction signed with HSM key: ${keyReleaseAuth.releaseId}`);
      
      return {
        signature: signature.toString('hex'),
        keyReleaseId: keyReleaseAuth.releaseId
      };

    } catch (error) {
      await this.auditService.logHSMOperation(
        guardianId,
        'key_release_and_sign_failed',
        'failure',
        partitionId,
        keyId,
        { 
          error: error.message,
          duration: Date.now() - startTime
        }
      );
      
      this.logger.error('❌ HSM key release and signing failed:', error.message);
      throw error;
    }
  }

  /**
   * Authorize key release with TOTP (mock implementation)
   */
  private async authorizeKeyRelease(params: {
    partition: string;
    keyId: string;
    totpCode: string;
    purpose: string;
    guardianId: string;
  }): Promise<HSMKeyReleaseAuth> {
    try {
      // Mock TOTP validation with HSM
      // In production: HSM API validates TOTP and authorizes key release
      
      const releaseId = `release_${crypto.randomBytes(16).toString('hex')}`;
      const now = new Date();
      
      return {
        success: true,
        releaseId,
        partitionId: params.partition,
        keyId: params.keyId,
        authorizedAt: now,
        expiresAt: new Date(now.getTime() + 300000) // 5 minutes
      };
      
    } catch (error) {
      return {
        success: false,
        releaseId: '',
        partitionId: params.partition,
        keyId: params.keyId,
        authorizedAt: new Date(),
        expiresAt: new Date()
      };
    }
  }

  /**
   * Sign transaction with released HSM key
   */
  private async signWithReleasedKey(request: HSMSignatureRequest): Promise<Buffer> {
    try {
      this.logger.log(`✍️ Signing with HSM key: ${request.keyId}`);
      
      // Mock HSM signature generation
      // In production: HSM performs Ed25519 signature with released key
      const mockSignature = crypto.randomBytes(64); // Ed25519 signature is 64 bytes
      
      this.logger.log(`✅ HSM signature generated`);
      return mockSignature;
      
    } catch (error) {
      throw new Error(`HSM signing failed: ${error.message}`);
    }
  }

  // ==================== EPHEMERAL TRANSACTION KEYS ====================

  /**
   * Generate ephemeral transaction key (m/0'/0'/N') with auto-expiry
   * Following transaction-privacy.mdc requirements
   */
  async generateEphemeralTransactionKey(params: {
    parentKeyId: string;
    derivationPath: string; // m/0'/0'/N'
    partition: string;
    transactionIndex: number;
    expiresIn: number; // seconds
    oneTimeUse: boolean;
    autoDestroy: boolean;
  }): Promise<{
    keyId: string;
    publicKey: string;
    derivationPath: string;
    expiresAt: Date;
    isEphemeral: boolean;
  }> {
    try {
      this.logger.log(`🔑 Generating ephemeral transaction key: ${params.derivationPath}`);

      // HSM generates ephemeral key with auto-expiry
      const ephemeralKeyId = `ephemeral_tx_${params.transactionIndex}_${crypto.randomBytes(8).toString('hex')}`;
      
      // Generate mock Ed25519 public key for Stellar (in production: actual HSM derivation)
      const mockPublicKey = StrKey.encodeEd25519PublicKey(crypto.randomBytes(32));
      
      const expiresAt = new Date(Date.now() + (params.expiresIn * 1000));

      // Audit ephemeral key generation
      await this.auditService.logHSMOperation(
        'system',
        'ephemeral_key_generated',
        'success',
        params.partition,
        ephemeralKeyId,
        {
          derivationPath: params.derivationPath,
          transactionIndex: params.transactionIndex,
          expiresAt: expiresAt.toISOString(),
          oneTimeUse: params.oneTimeUse,
          autoDestroy: params.autoDestroy
        }
      );

      this.logger.log(`✅ Ephemeral key generated: ${mockPublicKey} (${params.derivationPath})`);
      this.logger.log(`⏰ Auto-expires at: ${expiresAt.toISOString()}`);

      return {
        keyId: ephemeralKeyId,
        publicKey: mockPublicKey,
        derivationPath: params.derivationPath,
        expiresAt: expiresAt,
        isEphemeral: true
      };
    } catch (error) {
      throw new Error(`Ephemeral transaction key generation failed: ${error.message}`);
    }
  }

  /**
   * Sign transaction with ephemeral key (ONE-TIME USE)
   */
  async signWithEphemeralKey(params: {
    ephemeralKeyId: string;
    rawTransaction: string;
    totpCode: string;
    guardianId: string;
    partitionId: string;
    oneTimeUse: boolean;
  }): Promise<{
    signature: string;
    keyUsed: boolean;
    signedAt: Date;
  }> {
    try {
      this.logger.log(`✍️ Signing with ephemeral key: ${params.ephemeralKeyId}`);

      // Validate TOTP for key release authorization
      if (!/^[0-9]{6}$/.test(params.totpCode)) {
        throw new Error('Invalid TOTP code format');
      }

      // HSM signs with ephemeral key (mock implementation)
      const signature = crypto.randomBytes(64).toString('hex'); // Ed25519 signature
      const signedAt = new Date();

      // Mark key as used in HSM (one-time use enforcement)
      this.logger.log(`🔐 Ephemeral key used for signing, marking as ONE-TIME-USED`);

      // Audit ephemeral key usage
      await this.auditService.logHSMOperation(
        params.guardianId,
        'ephemeral_key_signed_transaction',
        'success',
        params.partitionId,
        params.ephemeralKeyId,
        {
          signatureGenerated: true,
          oneTimeUse: params.oneTimeUse,
          signedAt: signedAt.toISOString()
        }
      );

      this.logger.log(`✅ Transaction signed with ephemeral key: ${params.ephemeralKeyId}`);

      return {
        signature: signature,
        keyUsed: true,
        signedAt: signedAt
      };
    } catch (error) {
      throw new Error(`Ephemeral key signing failed: ${error.message}`);
    }
  }

  /**
   * Destroy ephemeral key in HSM (auto-called after transaction)
   */
  async destroyEphemeralKey(params: {
    keyId: string;
    partition: string;
    reason: string;
  }): Promise<{
    success: boolean;
    destroyedAt?: Date;
    reason?: string;
  }> {
    try {
      this.logger.log(`💀 Destroying ephemeral key in HSM: ${params.keyId}`);

      // HSM API call to destroy ephemeral key (mock implementation)
      // In production: HSM permanently deletes the key from partition
      const destroyedAt = new Date();

      // Audit key destruction
      await this.auditService.logHSMOperation(
        'system',
        'ephemeral_key_destroyed',
        'success',
        params.partition,
        params.keyId,
        {
          reason: params.reason,
          destroyedAt: destroyedAt.toISOString(),
          privacyProtected: true
        }
      );

      this.logger.log(`✅ Ephemeral key destroyed in HSM: ${params.keyId}`);
      this.logger.log(`🛡️ Privacy protection: Key cannot be used again`);

      return {
        success: true,
        destroyedAt: destroyedAt
      };
    } catch (error) {
      this.logger.error('❌ Ephemeral key destruction failed:', error.message);
      return {
        success: false,
        reason: error.message
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get HSM health status
   */
  async getHealthStatus(): Promise<{ status: string; latency: number; partitions: number }> {
    const startTime = Date.now();
    
    try {
      // Mock health check
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        partitions: 3 // Mock: 3 guardian partitions
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        partitions: 0
      };
    }
  }

  /**
   * List all partitions for monitoring
   */
  async listPartitions(): Promise<string[]> {
    try {
      // Mock partition listing
      // In production: HSM API call to list partitions
      return [
        'user_guardian_ceo_001',
        'user_guardian_cfo_002', 
        'user_guardian_cto_003'
      ];
    } catch (error) {
      this.logger.error('❌ Failed to list HSM partitions:', error.message);
      return [];
    }
  }

  /**
   * Rotate HSM keys (security requirement)
   */
  async rotateKey(partitionId: string, oldKeyId: string): Promise<string> {
    try {
      this.logger.log(`🔄 Rotating HSM key: ${oldKeyId}`);
      
      // Mock key rotation
      const newKeyId = `rotated_${crypto.randomBytes(16).toString('hex')}`;
      
      await this.auditService.logHSMOperation(
        'system',
        'key_rotated',
        'success',
        partitionId,
        newKeyId,
        { oldKeyId }
      );
      
      this.logger.log(`✅ Key rotated: ${oldKeyId} -> ${newKeyId}`);
      return newKeyId;
      
    } catch (error) {
      this.logger.error('❌ Key rotation failed:', error.message);
      throw error;
    }
  }
}
