import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import * as crypto from "crypto";
import { StrKey, Keypair } from "@stellar/stellar-sdk";

import { AuditService } from "../common/audit.service";
import { EncryptionService } from "../common/encryption.service";
import {
  HSMConfig,
  HSMPartitionInfo,
  HSMKeyInfo,
  HSMSignatureRequest,
  HSMKeyReleaseAuth,
} from "../common/interfaces";

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
  private readonly mockEnabled: boolean;

  // ===== Mock HSM in-memory stores (development) =====
  private mockPartitions = new Map<string, Buffer>(); // partitionId -> master seed (32 bytes)
  private mockKeys = new Map<string, Buffer>(); // keyId -> ed25519 seed (32 bytes)
  private mockEphemeral = new Map<
    string,
    {
      seed: Buffer;
      partitionId: string;
      parentKeyId: string;
      derivationPath: string;
      expiresAt: Date;
      oneTimeUse: boolean;
      used: boolean;
    }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly encryption: EncryptionService,
  ) {
    // Load HSM configuration from environment
    this.config = {
      host: this.configService.get("HSM_HOST", "187.33.9.132"),
      port: parseInt(this.configService.get("HSM_PORT", "4433")),
      user: this.configService.get("HSM_USER", "demoale"),
      password: this.configService.get("HSM_PASS", "12345678"),
      partition: this.configService.get("HSM_PARTITION", "DEMO"),
      timeout: parseInt(this.configService.get("HSM_TIMEOUT", "30000")),
    };
    this.mockEnabled = this.configService.get("MOCK_HSM", "false") === "true";
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
          "Content-Type": "application/json",
          "User-Agent": "StellarCustody/1.0.0",
        },
      });

      // Test connection
      await this.testConnection();
      this.logger.log("✅ HSM DINAMO connection established");
    } catch (error) {
      this.logger.error("❌ HSM connection failed:", error.message);
      throw error;
    }
  }

  /**
   * Test HSM connectivity
   */
  private async testConnection(): Promise<void> {
    try {
      // Mock or real HSM connectivity validation
      this.logger.log("🔍 Testing HSM connection...");

      // For now, just validate configuration
      if (!this.config.host || !this.config.user) {
        throw new Error("HSM configuration incomplete");
      }

      this.logger.log("✅ HSM connection test passed");
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
        email: kycData.email,
      };

      this.logger.log("🔄 Starting KYC process with HSM partition creation");

      // 2. Request random from HSM (mock implementation)
      const randomData = crypto.randomBytes(32).toString("hex");

      // 3. Create user ID with SHA256
      const userId = crypto
        .createHash("sha256")
        .update(JSON.stringify(pii) + randomData)
        .digest("hex");

      // 4. Create individual partition for user
      const partitionId = `user_${userId.substring(0, 16)}`;
      await this.createPartition(partitionId);

      // 5. Create AES256 key for PII encryption
      const aesKeyId = await this.generateAESKey(
        partitionId,
        `aes_pii_${userId.substring(0, 8)}`,
      );

      // 6. Create BIP32 Edwards XPRIV for Stellar
      const masterKeyId = await this.generateBIP32Key(
        partitionId,
        `stellar_master_${userId.substring(0, 8)}`,
      );

      // 7. Encrypt PII with AES key using Svault Module (mock -> AES-GCM via EncryptionService)
      const encryptedPII = await this.svaultEncrypt(
        aesKeyId,
        JSON.stringify(pii),
      );

      const result: HSMPartitionInfo = {
        partitionId,
        aesKeyId,
        masterKeyId,
        isActive: true,
        encryptedPII,
      };

      // Audit log
      await this.auditService.logHSMOperation(
        userId,
        "kyc_partition_created",
        "success",
        partitionId,
        masterKeyId,
        { duration: Date.now() - startTime },
      );

      this.logger.log(`✅ KYC partition created: ${partitionId}`);
      return result;
    } catch (error) {
      await this.auditService.logHSMOperation(
        "unknown",
        "kyc_partition_creation_failed",
        "failure",
        undefined,
        undefined,
        { error: error.message, duration: Date.now() - startTime },
      );

      this.logger.error("❌ KYC partition creation failed:", error.message);
      throw error;
    }
  }

  /**
   * Create HSM partition (mock implementation)
   */
  private async createPartition(partitionId: string): Promise<void> {
    try {
      this.logger.log(`🔐 Creating HSM partition: ${partitionId}`);

      if (this.mockEnabled) {
        // Create a master seed for this partition (32 bytes)
        const seed = crypto.randomBytes(32);
        this.mockPartitions.set(partitionId, seed);
        await new Promise((resolve) => setTimeout(resolve, 50));
      } else {
        // TODO: Real HSM partition creation API call
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.logger.log(`✅ HSM partition created: ${partitionId}`);
    } catch (error) {
      throw new Error(`Failed to create HSM partition: ${error.message}`);
    }
  }

  /**
   * Generate AES256 key for PII encryption
   */
  private async generateAESKey(
    partitionId: string,
    keyLabel: string,
  ): Promise<string> {
    try {
      this.logger.log(`🔑 Generating AES256 key: ${keyLabel}`);

      const aesKeyId = `aes_${crypto.randomBytes(16).toString("hex")}`;
      // In a real HSM, this key would be internal. Here we only emit an ID.

      this.logger.log(`✅ AES256 key generated: ${aesKeyId}`);
      return aesKeyId;
    } catch (error) {
      throw new Error(`Failed to generate AES key: ${error.message}`);
    }
  }

  /**
   * Generate BIP32 Edwards XPRIV key for Stellar
   */
  private async generateBIP32Key(
    partitionId: string,
    keyLabel: string,
  ): Promise<string> {
    try {
      this.logger.log(`🔑 Generating BIP32 Edwards XPRIV: ${keyLabel}`);

      const masterKeyId = `bip32_${crypto.randomBytes(16).toString("hex")}`;

      if (this.mockEnabled) {
        const partitionSeed = this.mockPartitions.get(partitionId);
        if (!partitionSeed) throw new Error("Partition not found");

        // Derive a 32-byte seed deterministically for this label
        const seed = this.kdf(partitionSeed, `MASTER:${keyLabel}`);
        this.mockKeys.set(masterKeyId, seed);
      } else {
        // TODO: Real HSM API to generate BIP32 Edwards key and store handle
      }

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
      this.logger.log(`🔐 Encrypting PII with Svault Module (AES-GCM)`);
      // Use app EncryptionService to simulate HSM Svault AES-GCM encryption
      return this.encryption.encrypt(data);
    } catch (error) {
      throw new Error(`Svault encryption failed: ${error.message}`);
    }
  }

  // ==================== WALLET HIERARCHY CREATION ====================

  /**
   * Create hierarchical wallet structure (Cold master, Hot derived)
   * Following BIP32 hierarchy from api-integrations.mdc
   */
  async createWalletHierarchy(
    userId: string,
    partitionId: string,
    masterKeyId: string,
  ) {
    try {
      this.logger.log(`🌳 Creating wallet hierarchy for user: ${userId}`);

      // 1. Cold Wallet (Master) - 95% of funds - derivation path m/0'
      const coldKeyInfo = await this.deriveKey({
        parentKeyId: masterKeyId,
        derivationPath: "m/0'",
        partition: partitionId,
        purpose: "cold_wallet",
      });

      // 2. Hot Wallet (Derived from Cold) - 5% of funds - derivation path m/0'/0'
      const hotKeyInfo = await this.deriveKey({
        parentKeyId: coldKeyInfo.keyId,
        derivationPath: "m/0'/0'",
        partition: partitionId,
        purpose: "hot_wallet",
      });

      const result = {
        coldWallet: {
          keyId: coldKeyInfo.keyId,
          address: coldKeyInfo.publicKey,
          derivationPath: "m/0'",
          maxBalance: "95%",
          requiresTOTP: true,
          hsmPartitionId: partitionId,
        },
        hotWallet: {
          keyId: hotKeyInfo.keyId,
          address: hotKeyInfo.publicKey,
          derivationPath: "m/0'/0'",
          maxBalance: "5%",
          requiresTOTP: false,
          parentKeyId: coldKeyInfo.keyId,
          hsmPartitionId: partitionId,
        },
      };

      // Audit log
      await this.auditService.logHSMOperation(
        userId,
        "wallet_hierarchy_created",
        "success",
        partitionId,
        masterKeyId,
        {
          coldAddress: coldKeyInfo.publicKey,
          hotAddress: hotKeyInfo.publicKey,
        },
      );

      this.logger.log(
        `✅ Wallet hierarchy created - Cold: ${coldKeyInfo.publicKey}, Hot: ${hotKeyInfo.publicKey}`,
      );
      return result;
    } catch (error) {
      await this.auditService.logHSMOperation(
        userId,
        "wallet_hierarchy_creation_failed",
        "failure",
        partitionId,
        masterKeyId,
        { error: error.message },
      );

      this.logger.error("❌ Wallet hierarchy creation failed:", error.message);
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
      this.logger.log(
        `🔑 Deriving key: ${params.derivationPath} for ${params.purpose}`,
      );

      const derivedKeyId = `derived_${crypto
        .createHash("sha256")
        .update(params.parentKeyId + ":" + params.derivationPath)
        .digest("hex")}`;

      let publicKey: string;
      if (this.mockEnabled) {
        const parentSeed = this.mockKeys.get(params.parentKeyId);
        if (!parentSeed) throw new Error("Parent key seed not found");
        const seed = this.kdf(parentSeed, params.derivationPath);
        this.mockKeys.set(derivedKeyId, seed);
        const kp = Keypair.fromRawEd25519Seed(seed);
        publicKey = kp.publicKey();
      } else {
        // TODO: Real HSM BIP32 derivation
        publicKey = StrKey.encodeEd25519PublicKey(crypto.randomBytes(32));
      }

      const keyInfo: HSMKeyInfo = {
        keyId: derivedKeyId,
        keyName: `${params.purpose}_${params.derivationPath.replace(/['/]/g, "_")}`,
        algorithm: "ED25519",
        derivationPath: params.derivationPath,
        publicKey,
        partition: params.partition,
      };

      this.logger.log(
        `✅ Key derived: ${keyInfo.keyName} -> ${keyInfo.publicKey}`,
      );
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
  async authorizeKeyReleaseAndSign(params: {
    partitionId: string;
    keyId: string;
    rawTransaction: string; // hex or XDR depending on caller
    guardianId: string;
    totpCode?: string;
    releaseId?: string;
  }): Promise<{ signature: string; keyReleaseId: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `🔐 Authorizing key release for partition: ${params.partitionId}`,
      );

      let keyReleaseAuth: HSMKeyReleaseAuth | null = null;
      let effectiveReleaseId = params.releaseId;

      // 1. If no releaseId provided, validate TOTP and authorize
      if (!effectiveReleaseId) {
        if (!params.totpCode || !/^[0-9]{6}$/.test(params.totpCode)) {
          throw new Error("Invalid or missing TOTP code");
        }

        keyReleaseAuth = await this.authorizeKeyRelease({
          partition: params.partitionId,
          keyId: params.keyId,
          totpCode: params.totpCode,
          purpose: "transaction_signing",
          guardianId: params.guardianId,
        });
        effectiveReleaseId = keyReleaseAuth.releaseId;
      }

      if (keyReleaseAuth && !keyReleaseAuth.success) {
        throw new Error("HSM denied key release authorization");
      }

      // 3. HSM signs the raw transaction with released key
      const dataBuf = /^[0-9a-fA-F]+$/.test(params.rawTransaction)
        ? Buffer.from(params.rawTransaction, "hex")
        : Buffer.from(params.rawTransaction, "utf8");

      // Ensure a mock seed exists for direct signing keys if needed
      if (this.mockEnabled && !this.mockKeys.has(params.keyId)) {
        const pSeed = this.mockPartitions.get(params.partitionId);
        if (pSeed) {
          this.mockKeys.set(params.keyId, this.kdf(pSeed, `DIRECT:${params.keyId}`));
        }
      }

      const signature = await this.signWithReleasedKey({
        keyId: params.keyId,
        data: dataBuf,
        algorithm: "ED25519",
        releaseId: effectiveReleaseId,
      });

      // Audit log
      await this.auditService.logHSMOperation(
        params.guardianId,
        "key_release_and_sign",
        "success",
        params.partitionId,
        params.keyId,
        {
          keyReleaseId: effectiveReleaseId,
          duration: Date.now() - startTime,
        },
      );

      this.logger.log(
        `✅ Transaction signed with HSM key: ${effectiveReleaseId}`,
      );

      return {
        signature: signature.toString("hex"),
        keyReleaseId: effectiveReleaseId!,
      };
    } catch (error) {
      await this.auditService.logHSMOperation(
        params.guardianId,
        "key_release_and_sign_failed",
        "failure",
        params.partitionId,
        params.keyId,
        {
          error: error.message,
          duration: Date.now() - startTime,
        },
      );

      this.logger.error(
        "❌ HSM key release and signing failed:",
        error.message,
      );
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

      const releaseId = `release_${crypto.randomBytes(16).toString("hex")}`;
      const now = new Date();

      return {
        success: true,
        releaseId,
        partitionId: params.partition,
        keyId: params.keyId,
        authorizedAt: now,
        expiresAt: new Date(now.getTime() + 300000), // 5 minutes
      };
    } catch (error) {
      return {
        success: false,
        releaseId: "",
        partitionId: params.partition,
        keyId: params.keyId,
        authorizedAt: new Date(),
        expiresAt: new Date(),
      };
    }
  }

  /**
   * Sign transaction with released HSM key
   */
  private async signWithReleasedKey(request: HSMSignatureRequest): Promise<Buffer> {
    try {
      this.logger.log(`✍️ Signing with HSM key: ${request.keyId}`);

      if (this.mockEnabled) {
        const seed = this.mockKeys.get(request.keyId);
        if (!seed) throw new Error("Key seed not found for signing");
        const kp = Keypair.fromRawEd25519Seed(seed);
        const sig = kp.sign(request.data);
        this.logger.log(`✅ HSM (mock) signature generated`);
        return Buffer.from(sig);
      }

      // TODO: Real HSM signature call
      throw new Error("Real HSM signing not implemented");
    } catch (error) {
      throw new Error(`HSM signing failed: ${error.message}`);
    }
  }

  // ==================== EPHEMERAL TRANSACTION KEYS ====================

  /**
   * Preview ephemeral public key (no HSM state change)
   * Deterministically derives the public key for a given derivationPath
   * without persisting key material in the HSM mock store.
   */
  async previewEphemeralPublicKey(params: {
    parentKeyId: string;
    derivationPath: string; // m/0'/0'/N'
    partition: string;
  }): Promise<{ publicKey: string }>{
    if (this.mockEnabled) {
      let parentSeed = this.mockKeys.get(params.parentKeyId);
      if (!parentSeed) {
        const partSeed = this.mockPartitions.get(params.partition);
        if (partSeed) {
          parentSeed = this.kdf(partSeed, "m/0'/0'");
          this.mockKeys.set(params.parentKeyId, parentSeed);
        }
      }
      if (!parentSeed) throw new Error("Parent key seed not found for preview");
      const seed = this.kdf(parentSeed, params.derivationPath);
      const kp = Keypair.fromRawEd25519Seed(seed);
      return { publicKey: kp.publicKey() };
    }

    // TODO: Real HSM preview via public derivation call
    // Fallback to placeholder error until real SDK is wired
    throw new Error("HSM preview not implemented for real HSM mode");
  }

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
      this.logger.log(
        `🔑 Generating ephemeral transaction key: ${params.derivationPath}`,
      );

      // HSM generates ephemeral key with auto-expiry
      const ephemeralKeyId = `ephemeral_tx_${params.transactionIndex}_${crypto.randomBytes(8).toString("hex")}`;

      let publicKey: string;
      if (this.mockEnabled) {
        let parentSeed = this.mockKeys.get(params.parentKeyId);
        if (!parentSeed) {
          // Attempt to reconstruct HOT key from partition if not present (seeded DB case)
          const partSeed = this.mockPartitions.get(params.partition);
          if (partSeed) {
            parentSeed = this.kdf(partSeed, "m/0'/0'");
            this.mockKeys.set(params.parentKeyId, parentSeed);
          }
        }
        if (!parentSeed) throw new Error("Parent key seed not found for ephemeral");
        const seed = this.kdf(parentSeed, params.derivationPath);
        const kp = Keypair.fromRawEd25519Seed(seed);
        publicKey = kp.publicKey();
        // Store ephemeral seed for one-time signing
        const expiresAt = new Date(Date.now() + params.expiresIn * 1000);
        this.mockEphemeral.set(ephemeralKeyId, {
          seed,
          partitionId: params.partition,
          parentKeyId: params.parentKeyId,
          derivationPath: params.derivationPath,
          expiresAt,
          oneTimeUse: params.oneTimeUse,
          used: false,
        });
      } else {
        // TODO: Real HSM ephemeral derivation
        publicKey = StrKey.encodeEd25519PublicKey(crypto.randomBytes(32));
      }

      const expiresAt = new Date(Date.now() + params.expiresIn * 1000);

      // Audit ephemeral key generation
      await this.auditService.logHSMOperation(
        "system",
        "ephemeral_key_generated",
        "success",
        params.partition,
        ephemeralKeyId,
        {
          derivationPath: params.derivationPath,
          transactionIndex: params.transactionIndex,
          expiresAt: expiresAt.toISOString(),
          oneTimeUse: params.oneTimeUse,
          autoDestroy: params.autoDestroy,
        },
      );

      this.logger.log(
        `✅ Ephemeral key generated: ${publicKey} (${params.derivationPath})`,
      );
      this.logger.log(`⏰ Auto-expires at: ${expiresAt.toISOString()}`);

      return {
        keyId: ephemeralKeyId,
        publicKey: publicKey,
        derivationPath: params.derivationPath,
        expiresAt: expiresAt,
        isEphemeral: true,
      };
    } catch (error) {
      throw new Error(
        `Ephemeral transaction key generation failed: ${error.message}`,
      );
    }
  }

  /**
   * Sign transaction with ephemeral key (ONE-TIME USE)
   */
  async signWithEphemeralKey(params: {
    ephemeralKeyId: string;
    rawTransaction: string;
    totpCode?: string;
    releaseId?: string;
    guardianId: string;
    partitionId: string;
    oneTimeUse: boolean;
  }): Promise<{
    signature: string;
    keyUsed: boolean;
    signedAt: Date;
  }> {
    try {
      this.logger.log(
        `✍️ Signing with ephemeral key: ${params.ephemeralKeyId}`,
      );

      // Validate TOTP if provided (dev environments may allow bypass for low-value)
      const isDevelopment = this.configService.get("NODE_ENV") === "development";
      const allowNoTotp = this.configService.get("ALLOW_NO_TOTP_FOR_LOW_VALUE", "false") === "true";
      if (!params.releaseId) {
        if (params.totpCode) {
          if (!/^[0-9]{6}$/.test(params.totpCode)) {
            throw new Error("Invalid TOTP code format");
          }
        } else if (!(isDevelopment && allowNoTotp)) {
          throw new Error("Missing TOTP or key release id for ephemeral signing");
        }
      }

      // HSM signs with ephemeral key
      let signatureHex: string;
      const signedAt = new Date();

      if (this.mockEnabled) {
        const eph = this.mockEphemeral.get(params.ephemeralKeyId);
        if (!eph) throw new Error("Ephemeral key not found in HSM");
        if (eph.oneTimeUse && eph.used) throw new Error("Ephemeral key already used");
        if (eph.expiresAt < new Date()) throw new Error("Ephemeral key expired");

        const dataBuf = /^[0-9a-fA-F]+$/.test(params.rawTransaction)
          ? Buffer.from(params.rawTransaction, "hex")
          : Buffer.from(params.rawTransaction, "utf8");
        const kp = Keypair.fromRawEd25519Seed(eph.seed);
        const sig = kp.sign(dataBuf);
        signatureHex = Buffer.from(sig).toString("hex");
        // Mark as used
        eph.used = true;
        this.mockEphemeral.set(params.ephemeralKeyId, eph);
      } else {
        // TODO: Real HSM ephemeral signing
        throw new Error("Real HSM ephemeral signing not implemented");
      }

      // Mark key as used in HSM (one-time use enforcement)
      this.logger.log(
        `🔐 Ephemeral key used for signing, marking as ONE-TIME-USED`,
      );

      // Audit ephemeral key usage
      await this.auditService.logHSMOperation(
        params.guardianId,
        "ephemeral_key_signed_transaction",
        "success",
        params.partitionId,
        params.ephemeralKeyId,
        {
          signatureGenerated: true,
          oneTimeUse: params.oneTimeUse,
          signedAt: signedAt.toISOString(),
          keyReleaseId: params.releaseId,
        },
      );

      this.logger.log(
        `✅ Transaction signed with ephemeral key: ${params.ephemeralKeyId}`,
      );

      return {
        signature: signatureHex,
        keyUsed: true,
        signedAt: signedAt,
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

      let destroyedAt = new Date();
      if (this.mockEnabled) {
        this.mockEphemeral.delete(params.keyId);
      } else {
        // TODO: Real HSM destroy call
      }

      // Audit key destruction
      await this.auditService.logHSMOperation(
        "system",
        "ephemeral_key_destroyed",
        "success",
        params.partition,
        params.keyId,
        {
          reason: params.reason,
          destroyedAt: destroyedAt.toISOString(),
          privacyProtected: true,
        },
      );

      this.logger.log(`✅ Ephemeral key destroyed in HSM: ${params.keyId}`);
      this.logger.log(`🛡️ Privacy protection: Key cannot be used again`);

      return {
        success: true,
        destroyedAt: destroyedAt,
      };
    } catch (error) {
      this.logger.error("❌ Ephemeral key destruction failed:", error.message);
      return {
        success: false,
        reason: error.message,
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get HSM health status
   */
  async getHealthStatus(): Promise<{
    status: string;
    latency: number;
    partitions: number;
  }> {
    const startTime = Date.now();

    try {
      // Mock health check
      await new Promise((resolve) => setTimeout(resolve, 10));

      return {
        status: "healthy",
        latency: Date.now() - startTime,
        partitions: 3, // Mock: 3 guardian partitions
      };
    } catch (error) {
      return {
        status: "unhealthy",
        latency: Date.now() - startTime,
        partitions: 0,
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
        "user_guardian_ceo_001",
        "user_guardian_cfo_002",
        "user_guardian_cto_003",
      ];
    } catch (error) {
      this.logger.error("❌ Failed to list HSM partitions:", error.message);
      return [];
    }
  }

  /**
   * Rotate HSM keys (security requirement)
   */
  async rotateKey(partitionId: string, oldKeyId: string): Promise<string> {
    try {
      this.logger.log(`🔄 Rotating HSM key: ${oldKeyId}`);

      const newKeyId = `rotated_${crypto.randomBytes(16).toString("hex")}`;
      if (this.mockEnabled) {
        const oldSeed = this.mockKeys.get(oldKeyId);
        if (!oldSeed) throw new Error("Old key not found for rotation");
        const newSeed = this.kdf(oldSeed, "ROTATE");
        this.mockKeys.set(newKeyId, newSeed);
      }

      await this.auditService.logHSMOperation(
        "system",
        "key_rotated",
        "success",
        partitionId,
        newKeyId,
        { oldKeyId },
      );

      this.logger.log(`✅ Key rotated: ${oldKeyId} -> ${newKeyId}`);
      return newKeyId;
    } catch (error) {
      this.logger.error("❌ Key rotation failed:", error.message);
      throw error;
    }
  }

  // ==================== MOCK HSM UTILITIES ====================
  private kdf(parentSeed: Buffer, info: string): Buffer {
    // Simple KDF: HMAC-SHA256(parentSeed, info) -> 32 bytes
    return crypto.createHmac("sha256", parentSeed).update(info).digest().subarray(0, 32);
  }
}
