import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { authenticator } from "otplib";
import * as crypto from "crypto";
import { createClient } from "redis";

import { DatabaseService } from "../database/database.service";
import { EncryptionService } from "../common/encryption.service";
import { AuditService } from "../common/audit.service";
import { ChallengeData, ChallengeResponse } from "../common/interfaces";

/**
 * 🎯 Challenge Service - OCRA-like Challenge-Response Authentication
 *
 * Following security-practices.mdc OCRA-like implementation:
 * - Transaction-specific challenges
 * - Challenge-response using TOTP + context
 * - 5-minute challenge expiry
 * - Replay protection
 * - HSM key release authorization
 *
 * How it works:
 * 1. Generate transaction-specific challenge
 * 2. Guardian receives challenge via WhatsApp
 * 3. Guardian enters challenge in authenticator app
 * 4. System validates response and releases HSM key
 */
@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);
  private redisClient: any;

  constructor(
    private readonly database: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    this.initializeRedis();

    // Configure otplib for OCRA-like challenges
    authenticator.options = {
      window: 1, // Allow 1 step tolerance
      digits: 6, // 6-digit codes
      step: 30, // 30 second intervals
      crypto: crypto, // Use Node crypto
    };
  }

  /**
   * Initialize Redis for challenge storage
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: this.configService.get("REDIS_URL", "redis://localhost:6379"),
      });

      this.redisClient.on("error", (err) => {
        this.logger.error("Redis Client Error:", err);
      });

      await this.redisClient.connect();
      this.logger.log("✅ Redis connected for challenge storage");
    } catch (error) {
      this.logger.error("❌ Redis connection failed:", error.message);
      // For development, continue without Redis
      this.redisClient = {
        setEx: async () => "OK",
        get: async () => null,
        del: async () => 1,
      };
      this.logger.log("⚠️ Using mock Redis for development");
    }
  }

  // ==================== CHALLENGE GENERATION ====================

  /**
   * Generate transaction-specific challenge (OCRA-like)
   * Following security-practices.mdc generateTransactionChallenge()
   */
  async generateTransactionChallenge(
    transactionId: string,
  ): Promise<ChallengeData> {
    try {
      this.logger.log(
        `🎯 Generating challenge for transaction: ${transactionId}`,
      );

      // Get transaction details
      const transaction = await this.database.transaction.findUnique({
        where: { id: transactionId },
        include: {
          fromWallet: true,
          user: true,
        },
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // 1. Create transaction-specific challenge data
      const challengeData = {
        transactionId: transaction.id,
        amount: transaction.amount.toString(),
        toAddress: transaction.toAddress,
        fromWallet: transaction.fromWallet.publicKey,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(8).toString("hex"),
      };

      // 2. Generate full challenge string
      const fullChallenge = `STELLAR:${challengeData.transactionId}:${challengeData.amount}:${challengeData.toAddress}:${challengeData.timestamp}:${challengeData.nonce}`;

      // 3. Create challenge hash (SHA256)
      const challengeHash = crypto
        .createHash("sha256")
        .update(fullChallenge)
        .digest("hex");

      // 4. Short challenge for guardian display (16 characters)
      const displayChallenge = challengeHash.substring(0, 16).toUpperCase();

      // 5. Store challenge in Redis with 5-minute expiry
      const expiresAt = new Date(Date.now() + 300000); // 5 minutes
      await this.redisClient.setEx(
        `tx_challenge:${transactionId}`,
        300, // 5 minutes TTL
        JSON.stringify(challengeData),
      );

      // 6. Store in database for audit trail
      await this.database.transactionChallenge.create({
        data: {
          transactionId: transaction.id,
          challengeHash: displayChallenge,
          fullChallenge: fullChallenge,
          challengeData: challengeData,
          isActive: true,
          isUsed: false,
          expiresAt: expiresAt,
        },
      });

      const result: ChallengeData = {
        challengeHash: displayChallenge,
        fullChallenge: fullChallenge,
        challengeData,
        expiresAt,
      };

      this.logger.log(
        `✅ Challenge generated: ${displayChallenge} (expires in 5 min)`,
      );
      return result;
    } catch (error) {
      this.logger.error("❌ Challenge generation failed:", error.message);
      throw error;
    }
  }

  // ==================== CHALLENGE VALIDATION ====================

  /**
   * Validate challenge-response and authorize HSM key release
   * Following security-practices.mdc validateChallengeResponseAndReleaseKey()
   */
  async validateChallengeResponse(
    guardianId: string,
    challengeHash: string,
    responseCode: string,
    transactionId: string,
  ): Promise<{
    valid: boolean;
    authMethod: "OCRA_LIKE" | "TOTP_FALLBACK";
    keyReleaseId?: string;
  }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `🔍 Validating challenge response: ${challengeHash} for guardian: ${guardianId}`,
      );

      // 1. Check if challenge exists and is valid
      const challenge = await this.database.transactionChallenge.findUnique({
        where: { challengeHash },
        include: { transaction: true },
      });

      if (!challenge || !challenge.isActive || challenge.isUsed) {
        throw new Error("Challenge not found or already used");
      }

      if (challenge.expiresAt < new Date()) {
        throw new Error("Challenge expired");
      }

      if (challenge.transactionId !== transactionId) {
        throw new Error("Challenge mismatch with transaction");
      }

      // 2. Get guardian with TOTP secret
      const guardian = await this.database.guardian.findUnique({
        where: { id: guardianId },
        include: { user: true },
      });

      if (!guardian || !guardian.isActive) {
        throw new Error("Guardian not found or inactive");
      }

      // 3. Generate contextual secret using OCRA-like approach (base32)
      const guardianTotpSecret = this.encryption.decrypt(guardian.totpSecret);
      const challengeContext = challenge.fullChallenge;
      // Derive a base32 secret from HMAC-SHA1(secret, context)
      const hmacDigest = crypto
        .createHmac("sha1", guardianTotpSecret)
        .update(challengeContext)
        .digest();
      const contextualSecret = this.base32Encode(hmacDigest);

      // 4. Validate challenge-response code (OCRA-like)
      const isValidOCRA = authenticator.verify({
        token: responseCode,
        secret: contextualSecret,
      });

      // 5. Also validate against pure TOTP for backwards compatibility
      const isValidTOTP = authenticator.verify({
        token: responseCode,
        secret: guardianTotpSecret,
      });

      if (!isValidOCRA && !isValidTOTP) {
        // Log failed attempt
        await this.auditService.logChallengeEvent(
          guardianId,
          "validation_failed",
          challengeHash,
          "failure",
          "UNKNOWN",
        );

        throw new Error("Invalid challenge response or TOTP code");
      }

      const authMethod = isValidOCRA ? "OCRA_LIKE" : "TOTP_FALLBACK";

      // 6. Mark challenge as used
      await this.database.transactionChallenge.update({
        where: { id: challenge.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // 7. Create challenge response record
      await this.database.challengeResponse.create({
        data: {
          challengeId: challenge.id,
          guardianId: guardianId,
          responseCode: responseCode,
          responseMethod: authMethod,
          isValid: true,
          ipAddress: "backend-service",
        },
      });

      // 8. Generate key release ID for HSM authorization
      const keyReleaseId = `release_${crypto.randomBytes(12).toString("hex")}`;

      // Audit log success
      await this.auditService.logChallengeEvent(
        guardianId,
        "validation_success",
        challengeHash,
        "success",
        authMethod,
      );

      this.logger.log(
        `✅ Challenge validated: ${challengeHash} using ${authMethod}`,
      );

      return {
        valid: true,
        authMethod,
        keyReleaseId,
      };
    } catch (error) {
      // Audit log failure
      await this.auditService.logChallengeEvent(
        guardianId,
        "validation_error",
        challengeHash,
        "failure",
        "ERROR",
      );

      this.logger.error("❌ Challenge validation failed:", error.message);

      return {
        valid: false,
        authMethod: "TOTP_FALLBACK",
      };
    }
  }

  // ==================== CHALLENGE MANAGEMENT ====================

  /**
   * Clean expired challenges (scheduled task)
   */
  async cleanExpiredChallenges(): Promise<number> {
    try {
      this.logger.log("🧹 Cleaning expired challenges...");

      const result = await this.database.transactionChallenge.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true,
        },
        data: { isActive: false },
      });

      this.logger.log(`✅ Cleaned ${result.count} expired challenges`);
      return result.count;
    } catch (error) {
      this.logger.error(
        "❌ Failed to clean expired challenges:",
        error.message,
      );
      return 0;
    }
  }

  /**
   * Get challenge status
   */
  async getChallengeStatus(challengeHash: string): Promise<{
    exists: boolean;
    isActive: boolean;
    isUsed: boolean;
    expiresAt?: Date;
    transactionId?: string;
  }> {
    try {
      const challenge = await this.database.transactionChallenge.findUnique({
        where: { challengeHash },
      });

      if (!challenge) {
        return { exists: false, isActive: false, isUsed: false };
      }

      return {
        exists: true,
        isActive: challenge.isActive,
        isUsed: challenge.isUsed,
        expiresAt: challenge.expiresAt,
        transactionId: challenge.transactionId,
      };
    } catch (error) {
      this.logger.error("❌ Failed to get challenge status:", error.message);
      return { exists: false, isActive: false, isUsed: false };
    }
  }

  /**
   * Generate challenge for guardian app display
   */
  generateChallengeDisplayData(challenge: ChallengeData) {
    return {
      challenge: challenge.challengeHash,
      transaction: {
        amount: challenge.challengeData.amount + " XLM",
        destination: `${challenge.challengeData.toAddress.substring(0, 8)}...${challenge.challengeData.toAddress.slice(-8)}`,
        type: "PAYMENT",
      },
      expiresIn: Math.floor(
        (challenge.expiresAt.getTime() - Date.now()) / 1000,
      ), // seconds
      instructions: [
        "1. Open your Authenticator App",
        "2. Add the challenge code manually",
        `3. Enter challenge: ${challenge.challengeHash}`,
        "4. Submit the generated 6-digit code",
      ],
    };
  }

  /**
   * Encode buffer to RFC4648 base32 (no padding)
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }
    return output;
  }
}
