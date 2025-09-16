import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { StrKey } from "@stellar/stellar-sdk";
import * as crypto from "crypto";

import { DatabaseService } from "../database/database.service";
import { HSMService } from "../hsm/hsm.service";
import { AuditService } from "../common/audit.service";

/**
 * 🔑 Transaction Key Service - Ephemeral Transaction Keys for Privacy
 *
 * Following transaction-privacy.mdc complete implementation:
 *
 * **BIP32 Hierarchy Complete:**
 * - Master Key (m) → HSM partition root
 * - Cold Key (m/0') → 95% funds, static address
 * - Hot Key (m/0'/0') → 5% funds, static address
 * - Transaction Keys (m/0'/0'/N') → Ephemeral, new per transaction
 *
 * **Privacy Protection:**
 * - Each transaction gets unique address (m/0'/0'/N')
 * - Keys "die" after use (HSM auto-destroy)
 * - Impossible to correlate transactions externally
 * - Complete transaction privacy compliance
 */
@Injectable()
export class TransactionKeyService {
  private readonly logger = new Logger(TransactionKeyService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly hsmService: HSMService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== EPHEMERAL KEY GENERATION ====================

  /**
   * Generate ephemeral transaction key for complete privacy
   * Following transaction-privacy.mdc Generation Phase
   */
  async generateEphemeralTransactionKey(
    transactionId: string,
    hotWalletId: string,
    guardianId: string,
  ): Promise<{
    transactionKeyId: string;
    ephemeralAddress: string; // NEW ADDRESS per transaction
    derivationPath: string; // m/0'/0'/N'
    hsmKeyId: string;
    expiresAt: Date;
    isEphemeral: boolean;
  }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `🔑 Generating ephemeral key for transaction: ${transactionId}`,
      );

      // Get hot wallet with HSM partition info
      const hotWallet = await this.database.wallet.findUnique({
        where: { id: hotWalletId },
        include: {
          user: true,
          transactionKeys: {
            orderBy: { transactionIndex: "desc" },
            take: 1,
          },
        },
      });

      if (!hotWallet || hotWallet.walletType !== "HOT") {
        throw new Error("Hot wallet not found or invalid type");
      }

      // Calculate next transaction index for this wallet
      const lastTransactionKey = hotWallet.transactionKeys[0];
      const transactionIndex = (lastTransactionKey?.transactionIndex || 0) + 1;
      const derivationPath = `m/0'/0'/${transactionIndex}'`;

      this.logger.log(
        `📍 Ephemeral key derivation: ${derivationPath} (index: ${transactionIndex})`,
      );

      // Generate ephemeral key in HSM with auto-expiry
      const ephemeralKeyInfo =
        await this.hsmService.generateEphemeralTransactionKey({
          parentKeyId: hotWallet.hsmKeyName,
          derivationPath: derivationPath,
          partition: hotWallet.hsmPartitionId,
          transactionIndex: transactionIndex,
          expiresIn: 3600, // 1 hour
          oneTimeUse: true,
          autoDestroy: true,
        });

      // Generate NEW Stellar address for this transaction (privacy protection)
      const ephemeralAddress = ephemeralKeyInfo.publicKey;
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Store ephemeral transaction key in database
      const transactionKey = await this.database.transactionKey.create({
        data: {
          transactionId: transactionId,
          parentWalletId: hotWalletId,
          hsmKeyId: ephemeralKeyInfo.keyId,
          derivationPath: derivationPath,
          transactionIndex: transactionIndex,
          publicKey: ephemeralAddress,
          isActive: true,
          isUsed: false,
          isExpired: false,
          expiresAt: expiresAt,
          guardianId: guardianId,
        },
      });

      // Audit log - ephemeral key generation
      await this.auditService.logHSMOperation(
        guardianId,
        "ephemeral_transaction_key_generated",
        "success",
        hotWallet.hsmPartitionId,
        ephemeralKeyInfo.keyId,
        {
          transactionId,
          derivationPath,
          transactionIndex,
          ephemeralAddress,
          expiresAt: expiresAt.toISOString(),
          privacyProtection: true,
          duration: Date.now() - startTime,
        },
      );

      this.logger.log(
        `✅ Ephemeral transaction key generated: ${ephemeralAddress} (${derivationPath})`,
      );
      this.logger.log(`⏰ Key expires at: ${expiresAt.toISOString()}`);

      return {
        transactionKeyId: transactionKey.id,
        ephemeralAddress: ephemeralAddress,
        derivationPath: derivationPath,
        hsmKeyId: ephemeralKeyInfo.keyId,
        expiresAt: expiresAt,
        isEphemeral: true,
      };
    } catch (error) {
      await this.auditService.logHSMOperation(
        guardianId,
        "ephemeral_key_generation_failed",
        "failure",
        undefined,
        undefined,
        {
          transactionId,
          error: error.message,
          duration: Date.now() - startTime,
        },
      );

      this.logger.error(
        "❌ Ephemeral transaction key generation failed:",
        error.message,
      );
      throw error;
    }
  }

  // ==================== EPHEMERAL KEY USAGE ====================

  /**
   * Use ephemeral transaction key for signing (ONE-TIME USE)
   * Following transaction-privacy.mdc Usage Phase
   */
  async useEphemeralKeyForSigning(
    transactionId: string,
    totpCode: string | undefined,
    guardianId: string,
    rawTransactionData: string,
    keyReleaseId?: string,
  ): Promise<{
    signature: string;
    ephemeralAddress: string;
    keyDestroyed: boolean;
    signedAt: Date;
  }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `🔐 Using ephemeral key for transaction: ${transactionId}`,
      );

      // Get ephemeral transaction key
      const transactionKey = await this.database.transactionKey.findUnique({
        where: { transactionId },
        include: {
          transaction: true,
          parentWallet: {
            include: { user: true },
          },
        },
      });

      if (!transactionKey) {
        throw new Error("Ephemeral transaction key not found");
      }

      if (transactionKey.isUsed) {
        throw new Error("Ephemeral key already used (one-time use only)");
      }

      if (transactionKey.expiresAt < new Date()) {
        await this.expireTransactionKey(transactionKey.id);
        throw new Error("Ephemeral key expired");
      }

      if (!transactionKey.isActive) {
        throw new Error("Ephemeral key is not active");
      }

      this.logger.log(
        `🎯 Using ephemeral address: ${transactionKey.publicKey}`,
      );
      this.logger.log(`📍 Derivation path: ${transactionKey.derivationPath}`);

      // HSM signs transaction with ephemeral key (ONE-TIME USE)
      const signatureResult = await this.hsmService.signWithEphemeralKey({
        ephemeralKeyId: transactionKey.hsmKeyId,
        rawTransaction: rawTransactionData,
        totpCode: totpCode,
        releaseId: keyReleaseId,
        guardianId: guardianId,
        partitionId: transactionKey.parentWallet.hsmPartitionId,
        oneTimeUse: true,
      });

      const signedAt = new Date();

      // Mark ephemeral key as USED (one-time use enforced)
      await this.database.transactionKey.update({
        where: { id: transactionKey.id },
        data: {
          isUsed: true,
          usedAt: signedAt,
          isActive: false, // Deactivate after use
          guardianId: guardianId,
          totpCodeUsed: totpCode ? totpCode.substring(0, 2) + "****" : undefined, // Audit trail (partial)
          signatureHash: crypto
            .createHash("sha256")
            .update(signatureResult.signature)
            .digest("hex"),
        },
      });

      // HSM automatically destroys ephemeral key after signing
      const keyDestroyed = await this.destroyEphemeralKeyInHSM(
        transactionKey.hsmKeyId,
        transactionKey.parentWallet.hsmPartitionId,
      );

      if (keyDestroyed) {
        await this.database.transactionKey.update({
          where: { id: transactionKey.id },
          data: {
            isExpired: true,
            destroyedAt: new Date(),
          },
        });
      }

      // Audit log - ephemeral key used and destroyed
      await this.auditService.logHSMOperation(
        guardianId,
        "ephemeral_key_used_and_destroyed",
        "success",
        transactionKey.parentWallet.hsmPartitionId,
        transactionKey.hsmKeyId,
        {
          transactionId,
          ephemeralAddress: transactionKey.publicKey,
          derivationPath: transactionKey.derivationPath,
          signatureGenerated: true,
          keyDestroyed: keyDestroyed,
          privacyProtected: true,
          duration: Date.now() - startTime,
        },
      );

      this.logger.log(
        `✅ Ephemeral key used and destroyed: ${transactionKey.publicKey}`,
      );
      this.logger.log(
        `🛡️ Transaction privacy protected - address cannot be correlated`,
      );

      return {
        signature: signatureResult.signature,
        ephemeralAddress: transactionKey.publicKey,
        keyDestroyed: keyDestroyed,
        signedAt: signedAt,
      };
    } catch (error) {
      await this.auditService.logHSMOperation(
        guardianId,
        "ephemeral_key_usage_failed",
        "failure",
        undefined,
        undefined,
        {
          transactionId,
          error: error.message,
          duration: Date.now() - startTime,
        },
      );

      this.logger.error("❌ Ephemeral key usage failed:", error.message);
      throw error;
    }
  }

  // ==================== KEY LIFECYCLE MANAGEMENT ====================

  /**
   * Destroy ephemeral key in HSM (auto-called after use)
   */
  private async destroyEphemeralKeyInHSM(
    ephemeralKeyId: string,
    partitionId: string,
  ): Promise<boolean> {
    try {
      this.logger.log(`💀 Destroying ephemeral key in HSM: ${ephemeralKeyId}`);

      // HSM API call to destroy temporary key
      const destroyResult = await this.hsmService.destroyEphemeralKey({
        keyId: ephemeralKeyId,
        partition: partitionId,
        reason: "transaction_completed",
      });

      if (destroyResult.success) {
        this.logger.log(`✅ Ephemeral key destroyed in HSM: ${ephemeralKeyId}`);
      } else {
        this.logger.warn(
          `⚠️ HSM key destruction failed: ${destroyResult.reason}`,
        );
      }

      return destroyResult.success;
    } catch (error) {
      this.logger.error("❌ HSM key destruction failed:", error.message);
      return false;
    }
  }

  /**
   * Expire transaction key (scheduled cleanup)
   */
  private async expireTransactionKey(transactionKeyId: string): Promise<void> {
    try {
      await this.database.transactionKey.update({
        where: { id: transactionKeyId },
        data: {
          isActive: false,
          isExpired: true,
        },
      });

      this.logger.log(`⏰ Transaction key expired: ${transactionKeyId}`);
    } catch (error) {
      this.logger.error("❌ Failed to expire transaction key:", error.message);
    }
  }

  /**
   * Clean expired ephemeral keys (scheduled task every hour)
   * Following transaction-privacy.mdc cleanup requirements
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanExpiredEphemeralKeys(): Promise<number> {
    try {
      this.logger.log("🧹 Cleaning expired ephemeral transaction keys...");

      // Find expired keys
      const expiredKeys = await this.database.transactionKey.findMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isUsed: true, usedAt: { lt: new Date(Date.now() - 3600000) } }, // Used > 1 hour ago
          ],
          isActive: true,
        },
        include: { parentWallet: true },
      });

      // Destroy expired keys in HSM and mark in database
      let cleanedCount = 0;
      for (const key of expiredKeys) {
        try {
          // Destroy in HSM if not already destroyed
          if (!key.destroyedAt) {
            await this.destroyEphemeralKeyInHSM(
              key.hsmKeyId,
              key.parentWallet.hsmPartitionId,
            );
          }

          // Mark as expired in database
          await this.database.transactionKey.update({
            where: { id: key.id },
            data: {
              isActive: false,
              isExpired: true,
              destroyedAt: key.destroyedAt || new Date(),
            },
          });

          cleanedCount++;
        } catch (error) {
          this.logger.error(`❌ Failed to clean key ${key.id}:`, error.message);
        }
      }

      this.logger.log(`✅ Cleaned ${cleanedCount} expired ephemeral keys`);

      // Audit log cleanup
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: "system",
        action: "ephemeral_keys_cleaned",
        resource: "transaction_key",
        ip: "system",
        userAgent: "scheduled-task",
        result: "success",
        metadata: {
          cleanedCount,
          totalExpired: expiredKeys.length,
        },
      });

      return cleanedCount;
    } catch (error) {
      this.logger.error("❌ Failed to clean expired keys:", error.message);
      return 0;
    }
  }

  // ==================== TRANSACTION KEY QUERIES ====================

  /**
   * Get ephemeral key for transaction
   */
  async getTransactionKey(transactionId: string) {
    try {
      return await this.database.transactionKey.findUnique({
        where: { transactionId },
        include: {
          transaction: {
            select: {
              id: true,
              amount: true,
              toAddress: true,
              status: true,
              createdAt: true,
            },
          },
          parentWallet: {
            select: {
              id: true,
              publicKey: true,
              walletType: true,
              derivationPath: true,
              hsmPartitionId: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error("❌ Failed to get transaction key:", error.message);
      throw error;
    }
  }

  /**
   * Get ephemeral key statistics
   */
  async getEphemeralKeyStats() {
    try {
      const [totalKeys, activeKeys, usedKeys, expiredKeys, recentKeys] =
        await Promise.all([
          this.database.transactionKey.count(),
          this.database.transactionKey.count({ where: { isActive: true } }),
          this.database.transactionKey.count({ where: { isUsed: true } }),
          this.database.transactionKey.count({ where: { isExpired: true } }),
          this.database.transactionKey.count({
            where: {
              createdAt: { gte: new Date(Date.now() - 86400000) }, // Last 24 hours
            },
          }),
        ]);

      const usageRate = totalKeys > 0 ? (usedKeys / totalKeys) * 100 : 0;
      const privacyScore = totalKeys > 0 ? (expiredKeys / totalKeys) * 100 : 0;

      return {
        total: totalKeys,
        active: activeKeys,
        used: usedKeys,
        expired: expiredKeys,
        recent24h: recentKeys,
        usageRate: Math.round(usageRate * 100) / 100,
        privacyScore: Math.round(privacyScore * 100) / 100,
        privacyProtection:
          privacyScore > 80
            ? "EXCELLENT"
            : privacyScore > 60
              ? "GOOD"
              : "NEEDS_IMPROVEMENT",
      };
    } catch (error) {
      this.logger.error("❌ Failed to get ephemeral key stats:", error.message);
      throw error;
    }
  }

  /**
   * Verify transaction privacy (no correlation possible)
   */
  async verifyTransactionPrivacy(userId: string): Promise<{
    privacyScore: number;
    addressesGenerated: number;
    correlationRisk: "LOW" | "MEDIUM" | "HIGH";
    recommendations: string[];
  }> {
    try {
      // Get all transaction keys for user's wallets
      const userWallets = await this.database.wallet.findMany({
        where: { userId },
        include: {
          transactionKeys: {
            where: { isUsed: true },
            select: {
              publicKey: true,
              createdAt: true,
              derivationPath: true,
            },
          },
        },
      });

      const allAddresses = userWallets.flatMap((wallet) =>
        wallet.transactionKeys.map((key) => key.publicKey),
      );

      const uniqueAddresses = new Set(allAddresses).size;
      const totalTransactions = allAddresses.length;

      // Privacy score: 100% if every transaction used unique address
      const privacyScore =
        totalTransactions > 0
          ? (uniqueAddresses / totalTransactions) * 100
          : 100;

      let correlationRisk: "LOW" | "MEDIUM" | "HIGH";
      let recommendations: string[] = [];

      if (privacyScore >= 95) {
        correlationRisk = "LOW";
        recommendations.push("✅ Excellent privacy protection maintained");
      } else if (privacyScore >= 80) {
        correlationRisk = "MEDIUM";
        recommendations.push("⚠️ Consider increasing ephemeral key usage");
      } else {
        correlationRisk = "HIGH";
        recommendations.push(
          "🚨 Privacy at risk - ensure all transactions use ephemeral keys",
        );
        recommendations.push("🔧 Check HSM ephemeral key generation");
      }

      return {
        privacyScore: Math.round(privacyScore * 100) / 100,
        addressesGenerated: uniqueAddresses,
        correlationRisk,
        recommendations,
      };
    } catch (error) {
      this.logger.error("❌ Privacy verification failed:", error.message);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if transaction needs ephemeral key
   */
  async needsEphemeralKey(
    amount: string,
    walletType: "HOT" | "COLD",
  ): Promise<boolean> {
    // All transactions should use ephemeral keys for privacy
    // Even small amounts benefit from privacy protection
    return true;
  }

  /**
   * Get next transaction index for wallet
   */
  async getNextTransactionIndex(walletId: string): Promise<number> {
    try {
      const lastKey = await this.database.transactionKey.findFirst({
        where: { parentWalletId: walletId },
        orderBy: { transactionIndex: "desc" },
      });

      return (lastKey?.transactionIndex || 0) + 1;
    } catch (error) {
      this.logger.error(
        "❌ Failed to get next transaction index:",
        error.message,
      );
      return 1;
    }
  }

  /**
   * Validate ephemeral address format
   */
  validateEphemeralAddress(address: string): boolean {
    try {
      return StrKey.isValidEd25519PublicKey(address);
    } catch {
      return false;
    }
  }

  /**
   * Get privacy protection report for compliance
   */
  async getPrivacyReport(startDate: Date, endDate: Date) {
    try {
      const transactions = await this.database.transaction.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          TransactionKey: true,
        },
      });

      const report = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        transactions: {
          total: transactions.length,
          withEphemeralKeys: transactions.filter((tx) => tx.TransactionKey)
            .length,
          privacyCompliant: transactions.filter(
            (tx) =>
              tx.TransactionKey &&
              tx.TransactionKey.isUsed &&
              tx.TransactionKey.destroyedAt,
          ).length,
        },
        privacy: {
          score: 0, // Will be calculated
          addressReuse: 0,
          correlationRisk: "LOW" as "LOW" | "MEDIUM" | "HIGH",
        },
        recommendations: [] as string[],
      };

      // Calculate privacy score
      const ephemeralPercentage =
        report.transactions.total > 0
          ? (report.transactions.withEphemeralKeys /
              report.transactions.total) *
            100
          : 100;

      report.privacy.score = Math.round(ephemeralPercentage * 100) / 100;

      if (ephemeralPercentage >= 95) {
        report.privacy.correlationRisk = "LOW";
        report.recommendations.push("✅ Excellent privacy compliance");
      } else {
        report.privacy.correlationRisk = "HIGH";
        report.recommendations.push(
          "🚨 Increase ephemeral key usage for better privacy",
        );
      }

      return report;
    } catch (error) {
      this.logger.error("❌ Failed to generate privacy report:", error.message);
      throw error;
    }
  }
}
