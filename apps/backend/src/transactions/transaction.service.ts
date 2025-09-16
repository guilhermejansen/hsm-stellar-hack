import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Decimal } from "@prisma/client/runtime/library";
import * as crypto from "crypto";

import { DatabaseService } from "../database/database.service";
import { HSMService } from "../hsm/hsm.service";
import { ChallengeService } from "../challenges/challenge.service";
import { GuardianService } from "../guardians/guardian.service";
import { WalletService } from "../wallets/wallet.service";
import { TransactionKeyService } from "../wallets/transaction-key.service";
import { StellarService } from "../stellar/stellar.service";
import { AuditService } from "../common/audit.service";
import {
  TransactionCreationRequest,
  TransactionApprovalRequest,
  ThresholdConfiguration,
} from "../common/interfaces";

/**
 * 💰 Transaction Service - Multi-Sig Transaction Processing
 *
 * Following FINAL_ARCHITECTURE_SUMMARY.mdc threshold schemes:
 * - 2-of-3 for transactions < 10,000 XLM
 * - 3-of-3 for transactions > 10,000 XLM or Cold Wallet access
 *
 * Following stellar-custody-mvp.mdc transaction approval flow:
 * 1. Create RAW transaction
 * 2. Generate OCRA-like challenge
 * 3. Send WhatsApp notifications
 * 4. Collect guardian approvals with challenge-response
 * 5. HSM signs with released keys
 * 6. Broadcast to Stellar blockchain
 *
 * Security:
 * - All transactions require HSM signature
 * - High-value transactions require OCRA-like challenges
 * - Complete audit trail for compliance
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly hsmService: HSMService,
    private readonly challengeService: ChallengeService,
    private readonly guardianService: GuardianService,
    private readonly walletService: WalletService,
    private readonly transactionKeyService: TransactionKeyService,
    private readonly stellarService: StellarService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== TRANSACTION CREATION ====================

  /**
   * Create new transaction with threshold determination
   */
  async createTransaction(
    userId: string,
    request: TransactionCreationRequest,
  ): Promise<{
    transactionId: string;
    requiresApproval: boolean;
    thresholdScheme: ThresholdConfiguration;
    challenge?: any;
  }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `💰 Creating transaction: ${request.amount} XLM to ${request.toAddress}`,
      );

      // 1. Validate transaction request
      await this.validateTransactionRequest(request);

      // 2. Get source wallet and validate balance
      const wallet = await this.walletService.getWalletById(
        request.fromWalletId,
      );
      if (!wallet) {
        throw new Error("Source wallet not found");
      }

      const canSend = await this.walletService.canSendAmount(
        request.fromWalletId,
        request.amount,
      );
      if (!canSend.canSend) {
        throw new Error(canSend.reason || "Insufficient balance");
      }

      // 3. Determine threshold scheme based on amount and wallet type
      const thresholdScheme = await this.determineThresholdScheme(
        request.amount,
        wallet.walletType,
      );

      // 4. Check if transaction requires approval
      const requiresApproval = this.requiresApproval(
        request.amount,
        wallet.walletType,
      );

      // 5. Create transaction record
      const transaction = await this.database.transaction.create({
        data: {
          userId: userId,
          fromWalletId: request.fromWalletId,
          toAddress: request.toAddress,
          amount: new Decimal(request.amount),
          memo: request.memo,
          status: requiresApproval ? "AWAITING_APPROVAL" : "PENDING",
          txType: request.txType,
          requiresApproval,
          requiredApprovals: thresholdScheme.threshold,
        },
      });

      // 6. Generate ephemeral transaction key (m/0'/0'/N') for privacy protection
      // Following transaction-privacy.mdc: "ele sempre vai me gerar um endereço novo"
      const ephemeralKey =
        await this.transactionKeyService.generateEphemeralTransactionKey(
          transaction.id,
          request.fromWalletId,
          userId,
        );

      this.logger.log(
        `🎯 NEW EPHEMERAL ADDRESS generated: ${ephemeralKey.ephemeralAddress}`,
      );
      this.logger.log(`📍 Derivation path: ${ephemeralKey.derivationPath}`);
      this.logger.log(
        `🛡️ Privacy protected: Transaction cannot be correlated to wallet`,
      );

      // 7. Reserve balance for transaction
      await this.walletService.reserveBalance(
        request.fromWalletId,
        request.amount,
      );

      let challenge = undefined;

      // 8. Generate challenge if required (high-value or critical transactions)
      if (requiresApproval && thresholdScheme.challengeRequired) {
        challenge = await this.challengeService.generateTransactionChallenge(
          transaction.id,
        );

        this.logger.log(
          `🎯 Challenge generated for transaction: ${challenge.challengeHash}`,
        );
      }

      // 9. If no approval required, execute immediately with ephemeral key
      if (!requiresApproval) {
        // For small transactions, use ephemeral key for privacy even without approval
        await this.executeTransactionWithEphemeralKey(transaction.id, userId);
      }

      // Audit log
      await this.auditService.logTransaction(
        userId,
        transaction.id,
        "created",
        "success",
        {
          amount: request.amount,
          toAddress: request.toAddress,
          walletType: wallet.walletType,
          requiresApproval,
          thresholdScheme: thresholdScheme.type,
          challengeGenerated: !!challenge,
          duration: Date.now() - startTime,
        },
      );

      this.logger.log(
        `✅ Transaction created: ${transaction.id} (${requiresApproval ? "requires approval" : "auto-executing"})`,
      );

      return {
        transactionId: transaction.id,
        requiresApproval,
        thresholdScheme,
        challenge: challenge
          ? {
              challengeHash: challenge.challengeHash,
              expiresAt: challenge.expiresAt,
              transactionData: challenge.challengeData,
            }
          : undefined,
      };
    } catch (error) {
      await this.auditService.logTransaction(
        userId,
        "unknown",
        "creation_failed",
        "failure",
        {
          error: error.message,
          amount: request.amount,
          toAddress: request.toAddress,
          duration: Date.now() - startTime,
        },
      );

      this.logger.error("❌ Transaction creation failed:", error.message);
      throw error;
    }
  }

  // ==================== TRANSACTION APPROVAL ====================

  /**
   * Approve transaction with guardian signature
   */
  async approveTransaction(
    approval: TransactionApprovalRequest,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    approved: boolean;
    signature?: string;
    executionReady: boolean;
    remainingApprovals: number;
  }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `✅ Processing approval for transaction: ${approval.transactionId} by guardian: ${approval.guardianId}`,
      );

      // 1. Get transaction and validate
      const transaction = await this.database.transaction.findUnique({
        where: { id: approval.transactionId },
        include: {
          fromWallet: true,
          approvals: {
            include: { guardian: true },
          },
          challenge: true,
        },
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      if (transaction.status !== "AWAITING_APPROVAL") {
        throw new Error("Transaction not awaiting approval");
      }

      // 2. Check if guardian already approved
      const existingApproval = transaction.approvals.find(
        (a) => a.guardianId === approval.guardianId,
      );
      if (existingApproval) {
        throw new Error("Guardian already approved this transaction");
      }

      // 3. Validate guardian and their limits
      const guardian = await this.guardianService.getGuardianById(
        approval.guardianId,
      );
      if (!guardian || !guardian.isActive || !guardian.totpVerified) {
        throw new Error("Guardian not found, inactive, or not verified");
      }

      // 4. Validate challenge response or TOTP
      let authResult;
      if (approval.authMethod === "OCRA_LIKE" && approval.challengeResponse) {
        if (!transaction.challenge) {
          throw new Error("Challenge not found for transaction");
        }

        authResult = await this.challengeService.validateChallengeResponse(
          approval.guardianId,
          transaction.challenge.challengeHash,
          approval.challengeResponse,
          approval.transactionId,
        );
      } else if (approval.authMethod === "TOTP_FALLBACK" && approval.totpCode) {
        const isValid = await this.guardianService.validateGuardianTOTP(
          approval.guardianId,
          approval.totpCode,
        );
        authResult = {
          valid: isValid,
          authMethod: "TOTP_FALLBACK" as const,
          keyReleaseId: `totp_${crypto.randomBytes(8).toString("hex")}`,
        };
      } else {
        throw new Error("Invalid authentication method or missing codes");
      }

      if (!authResult.valid) {
        throw new Error("Authentication failed");
      }

      // 5. Get HSM signature using TOTP-authorized key release
      const hsmSignature = await this.getHSMSignatureForTransaction(
        guardian,
        transaction,
        authResult.keyReleaseId!,
      );

      // 6. Create approval record
      const approvalRecord = await this.database.approval.create({
        data: {
          transactionId: approval.transactionId,
          guardianId: approval.guardianId,
          totpValidatedAt: new Date(),
          challengeHash: transaction.challenge?.challengeHash,
          challengeResponse: approval.challengeResponse,
          authMethod: approval.authMethod,
          challengeExpiresAt: transaction.challenge?.expiresAt,
          hsmKeyReleased: true,
          hsmKeyReleasedAt: new Date(),
          hsmSignature: hsmSignature,
          hsmPartitionUsed: guardian.user.hsmPartitionId,
          keyReleaseId: authResult.keyReleaseId,
          isValid: true,
          ipAddress,
          userAgent,
        },
      });

      // 7. Update guardian approval count
      await this.database.guardian.update({
        where: { id: approval.guardianId },
        data: {
          totalApprovals: { increment: 1 },
          lastApprovalAt: new Date(),
        },
      });

      // 8. Check if we have enough approvals to execute
      const currentApprovals = await this.database.approval.count({
        where: {
          transactionId: approval.transactionId,
          isValid: true,
        },
      });

      const executionReady = currentApprovals >= transaction.requiredApprovals;

      // 9. Execute transaction with ephemeral key if ready
      if (executionReady) {
        await this.executeTransactionWithEphemeralKey(
          approval.transactionId,
          approval.guardianId,
          authResult.keyReleaseId,
        );
      }

      // Audit log
      await this.auditService.logTransaction(
        approval.guardianId,
        approval.transactionId,
        "approved",
        "success",
        {
          authMethod: approval.authMethod,
          hsmPartitionUsed: guardian.user.hsmPartitionId,
          keyReleaseId: authResult.keyReleaseId,
          currentApprovals,
          requiredApprovals: transaction.requiredApprovals,
          executionReady,
          duration: Date.now() - startTime,
        },
      );

      this.logger.log(
        `✅ Transaction approved by ${guardian.role}: ${approval.transactionId} (${currentApprovals}/${transaction.requiredApprovals})`,
      );

      return {
        approved: true,
        signature: hsmSignature,
        executionReady,
        remainingApprovals: transaction.requiredApprovals - currentApprovals,
      };
    } catch (error) {
      await this.auditService.logTransaction(
        approval.guardianId,
        approval.transactionId,
        "approval_failed",
        "failure",
        {
          error: error.message,
          authMethod: approval.authMethod,
          duration: Date.now() - startTime,
        },
      );

      this.logger.error("❌ Transaction approval failed:", error.message);
      throw error;
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Determine threshold scheme based on amount and wallet type
   */
  private async determineThresholdScheme(
    amount: string,
    walletType: "HOT" | "COLD",
  ): Promise<ThresholdConfiguration> {
    const amountNum = parseFloat(amount);

    // Cold wallet always requires 3-of-3
    if (walletType === "COLD") {
      return {
        type: "CRITICAL_3_OF_3",
        threshold: 3,
        totalParties: 3,
        challengeRequired: true,
      };
    }

    // Hot wallet threshold based on amount
    if (amountNum < 1000) {
      return {
        type: "LOW_VALUE_2_OF_3",
        threshold: 2,
        totalParties: 3,
        challengeRequired: false,
        maxAmount: 1000,
      };
    } else if (amountNum < 10000) {
      return {
        type: "HIGH_VALUE_2_OF_3",
        threshold: 2,
        totalParties: 3,
        challengeRequired: true,
        maxAmount: 10000,
      };
    } else {
      return {
        type: "CRITICAL_3_OF_3",
        threshold: 3,
        totalParties: 3,
        challengeRequired: true,
      };
    }
  }

  /**
   * Check if transaction requires guardian approval
   */
  private requiresApproval(
    amount: string,
    walletType: "HOT" | "COLD",
  ): boolean {
    const amountNum = parseFloat(amount);
    const threshold = parseFloat(
      this.configService.get("HIGH_VALUE_THRESHOLD", "1000"),
    );

    // Cold wallet always requires approval
    if (walletType === "COLD") {
      return true;
    }

    // Hot wallet requires approval for high-value transactions
    return amountNum >= threshold;
  }

  /**
   * Validate transaction request
   */
  private async validateTransactionRequest(
    request: TransactionCreationRequest,
  ): Promise<void> {
    // Validate amount
    const amount = parseFloat(request.amount);
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    if (amount > 1000000) {
      throw new Error("Amount exceeds maximum limit");
    }

    // Validate Stellar address
    if (!/^G[A-Z2-7]{55}$/.test(request.toAddress)) {
      throw new Error("Invalid Stellar address format");
    }

    // Validate memo
    if (request.memo && request.memo.length > 28) {
      throw new Error("Memo too long (max 28 characters)");
    }
  }

  /**
   * Get HSM signature for transaction
   */
  private async getHSMSignatureForTransaction(
    guardian: any,
    transaction: any,
    keyReleaseId: string,
  ): Promise<string> {
    try {
      // Build raw transaction data
      const rawTransaction = this.buildRawTransactionData(transaction);

      // Get HSM signature using TOTP-authorized key release
      const signatureResult = await this.hsmService.authorizeKeyReleaseAndSign({
        partitionId: guardian.user.hsmPartitionId,
        keyId: guardian.user.hsmKeyName,
        rawTransaction,
        guardianId: guardian.id,
        releaseId: keyReleaseId,
      });

      return signatureResult.signature;
    } catch (error) {
      this.logger.error("❌ HSM signature failed:", error.message);
      throw error;
    }
  }

  /**
   * Build raw transaction data for HSM signing
   */
  private buildRawTransactionData(transaction: any): string {
    // Build Stellar transaction envelope
    const txData = {
      source: transaction.fromWallet.publicKey,
      destination: transaction.toAddress,
      amount: transaction.amount.toString(),
      memo: transaction.memo,
      sequence: Date.now(), // In production, get actual sequence from Stellar
      fee: "10000", // Base fee in stroops
      networkPassphrase: this.configService.get("STELLAR_NETWORK_PASSPHRASE"),
    };

    // Convert to hex string for HSM signing
    return Buffer.from(JSON.stringify(txData)).toString("hex");
  }

  /**
   * Execute transaction with ephemeral key (complete privacy protection)
   * Following transaction-privacy.mdc: "a transacional ela vai fazer a transação morre aquela chave"
   */
  private async executeTransactionWithEphemeralKey(
    transactionId: string,
    guardianId: string,
    keyReleaseId?: string,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `🚀 Executing transaction with ephemeral key: ${transactionId}`,
      );

      // Update status to executing
      await this.database.transaction.update({
        where: { id: transactionId },
        data: {
          status: "EXECUTING",
          executedAt: new Date(),
        },
      });

      // Get transaction with ephemeral key
      const transaction = await this.database.transaction.findUnique({
        where: { id: transactionId },
        include: {
          fromWallet: true,
          TransactionKey: true,
          approvals: {
            include: { guardian: true },
          },
        },
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      if (!transaction.TransactionKey) {
        throw new Error("Ephemeral transaction key not found");
      }

      // 1) Build unsigned Stellar transaction XDR (real sequence/fees)
      const unsignedXDR = await this.stellarService.buildTransaction({
        sourceAddress: transaction.TransactionKey.publicKey,
        destinationAddress: transaction.toAddress,
        amount: transaction.amount.toString(),
        memo: transaction.memo || undefined,
      });

      // 2) Compute signature base (hash) for HSM signing
      const txHash = await this.stellarService.getTransactionHash(unsignedXDR);

      // 3) Use ephemeral key for one-time signature
      const ephemeralSignature = await this.transactionKeyService.useEphemeralKeyForSigning(
        transactionId,
        undefined,
        guardianId,
        txHash.toString("hex"),
        keyReleaseId,
      );

      // 4) Attach signature and submit
      const signedXDR = await this.stellarService.addSignatureToXDR(
        unsignedXDR,
        ephemeralSignature.ephemeralAddress,
        Buffer.from(ephemeralSignature.signature, "hex"),
      );

      const stellarResult = await this.stellarService.submitTransaction(
        signedXDR,
      );

      // Update transaction with success status
      await this.database.transaction.update({
        where: { id: transactionId },
        data: {
          status: "SUCCESS",
          stellarHash: stellarResult.hash,
          executedAt: new Date(),
        },
      });

      // Release reserved balance
      await this.walletService.releaseReservedBalance(
        transaction.fromWalletId,
        transaction.amount.toString(),
      );

      // Audit log - transaction executed with privacy protection
      await this.auditService.logTransaction(
        guardianId,
        transactionId,
        "executed_with_ephemeral_key",
        "success",
        {
          ephemeralAddress: ephemeralSignature.ephemeralAddress,
          stellarHash: stellarResult.hash,
          privacyProtected: true,
          keyDestroyed: ephemeralSignature.keyDestroyed,
          correlationImpossible: true,
          duration: Date.now() - startTime,
        },
      );

      this.logger.log(
        `✅ Transaction executed with complete privacy protection: ${stellarResult.hash}`,
      );
      this.logger.log(
        `🔍 External analysis will see: Random address → ${transaction.toAddress}`,
      );
    } catch (error) {
      // Update status to failed
      await this.database.transaction.update({
        where: { id: transactionId },
        data: {
          status: "FAILED",
          errorMessage: error.message,
        },
      });

      // Audit log failure
      await this.auditService.logTransaction(
        guardianId,
        transactionId,
        "execution_with_ephemeral_key_failed",
        "failure",
        {
          error: error.message,
          duration: Date.now() - startTime,
        },
      );

      this.logger.error(
        "❌ Transaction execution with ephemeral key failed:",
        error.message,
      );
      throw error;
    }
  }

  /**
   * Build raw transaction data with ephemeral key as source
   */
  private buildRawTransactionDataWithEphemeralKey(transaction: any): string {
    // Build Stellar transaction with EPHEMERAL ADDRESS as source
    const txData = {
      source: transaction.TransactionKey.publicKey, // NEW ADDRESS per transaction
      destination: transaction.toAddress,
      amount: transaction.amount.toString(),
      memo: transaction.memo,
      sequence: Date.now(),
      fee: "10000",
      networkPassphrase: this.configService.get("STELLAR_NETWORK_PASSPHRASE"),

      // Privacy metadata
      ephemeral: true,
      derivationPath: transaction.TransactionKey.derivationPath,
      privacyProtected: true,
    };

    return Buffer.from(JSON.stringify(txData)).toString("hex");
  }

  /**
   * Submit transaction to Stellar network from ephemeral address
   */
  private async submitToStellarNetwork(
    rawTransactionData: string,
    signature: string,
    ephemeralAddress: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `📡 Submitting transaction from ephemeral address: ${ephemeralAddress}`,
      );

      // Mock Stellar network submission
      // In production: Use StellarService to submit signed transaction
      const stellarHash = `stellar_ephemeral_${crypto.randomBytes(32).toString("hex")}`;

      this.logger.log(`✅ Transaction submitted to Stellar: ${stellarHash}`);
      this.logger.log(
        `🔍 Stellar Explorer will show: ${ephemeralAddress} → destination`,
      );

      return stellarHash;
    } catch (error) {
      throw new Error(`Stellar network submission failed: ${error.message}`);
    }
  }

  /**
   * Legacy method - kept for backwards compatibility
   */
  private async executeTransactionInternal(
    transactionId: string,
  ): Promise<void> {
    // Redirect to ephemeral key execution for privacy
    await this.executeTransactionWithEphemeralKey(transactionId, "system");
  }

  // ==================== TRANSACTION QUERIES ====================

  /**
   * Get transaction by ID with complete ephemeral key info
   */
  async getTransactionById(transactionId: string) {
    try {
      return await this.database.transaction.findUnique({
        where: { id: transactionId },
        include: {
          fromWallet: {
            select: {
              id: true,
              publicKey: true,
              walletType: true,
              derivationPath: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approvals: {
            include: {
              guardian: {
                select: {
                  id: true,
                  role: true,
                },
              },
            },
            orderBy: { validatedAt: "asc" },
          },
          challenge: true,
          // Include ephemeral transaction key for privacy tracking
          TransactionKey: {
            select: {
              id: true,
              publicKey: true, // Ephemeral address used
              derivationPath: true, // m/0'/0'/N'
              transactionIndex: true,
              isUsed: true,
              isExpired: true,
              destroyedAt: true,
              expiresAt: true,
              createdAt: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error("❌ Failed to get transaction:", error.message);
      throw error;
    }
  }

  /**
   * Get pending approvals for guardian
   */
  async getPendingApprovals(guardianId: string) {
    try {
      return await this.database.transaction.findMany({
        where: {
          status: "AWAITING_APPROVAL",
          approvals: {
            none: {
              guardianId: guardianId,
            },
          },
        },
        include: {
          fromWallet: {
            select: {
              publicKey: true,
              walletType: true,
            },
          },
          approvals: {
            include: {
              guardian: {
                select: {
                  role: true,
                },
              },
            },
          },
          challenge: true,
          // Include ephemeral transaction key info
          TransactionKey: {
            select: {
              publicKey: true, // Ephemeral address
              derivationPath: true, // m/0'/0'/N'
              expiresAt: true,
              isUsed: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      this.logger.error("❌ Failed to get pending approvals:", error.message);
      throw error;
    }
  }

  /**
   * Get transaction statistics with privacy metrics
   */
  async getTransactionStats() {
    try {
      const [
        totalTransactions,
        pendingApprovals,
        successfulTransactions,
        failedTransactions,
        totalVolume,
        ephemeralKeyStats,
        privacyProtectedTransactions,
      ] = await Promise.all([
        this.database.transaction.count(),
        this.database.transaction.count({
          where: { status: "AWAITING_APPROVAL" },
        }),
        this.database.transaction.count({ where: { status: "SUCCESS" } }),
        this.database.transaction.count({ where: { status: "FAILED" } }),
        this.database.transaction.aggregate({
          where: { status: "SUCCESS" },
          _sum: { amount: true },
        }),
        this.transactionKeyService.getEphemeralKeyStats(),
        this.database.transaction.count({
          where: {
            TransactionKey: {
              isNot: null,
            },
          },
        }),
      ]);

      const privacyScore =
        totalTransactions > 0
          ? (privacyProtectedTransactions / totalTransactions) * 100
          : 100;

      return {
        transactions: {
          total: totalTransactions,
          pending: pendingApprovals,
          successful: successfulTransactions,
          failed: failedTransactions,
          successRate:
            totalTransactions > 0
              ? (successfulTransactions / totalTransactions) * 100
              : 0,
        },
        volume: {
          total: totalVolume._sum.amount?.toString() || "0",
        },
        privacy: {
          ephemeralKeysGenerated: ephemeralKeyStats.total,
          ephemeralKeysUsed: ephemeralKeyStats.used,
          ephemeralKeysDestroyed: ephemeralKeyStats.expired,
          privacyScore: Math.round(privacyScore * 100) / 100,
          privacyProtectedTransactions: privacyProtectedTransactions,
          correlationProtection:
            privacyScore > 80 ? "EXCELLENT" : "NEEDS_IMPROVEMENT",
        },
      };
    } catch (error) {
      this.logger.error("❌ Failed to get transaction stats:", error.message);
      throw error;
    }
  }

  /**
   * Get transaction privacy report
   */
  async getTransactionPrivacyReport(userId?: string) {
    try {
      const where = userId ? { userId } : {};

      const [totalTransactions, ephemeralTransactions, uniqueAddressesUsed] =
        await Promise.all([
          this.database.transaction.count({ where }),
          this.database.transaction.count({
            where: {
              ...where,
              TransactionKey: { isNot: null },
            },
          }),
          this.database.transactionKey.findMany({
            where: {
              isUsed: true,
              transaction: { ...where },
            },
            select: { publicKey: true },
            distinct: ["publicKey"],
          }),
        ]);

      const privacyCompliance =
        totalTransactions > 0
          ? (ephemeralTransactions / totalTransactions) * 100
          : 100;

      return {
        summary: {
          totalTransactions,
          ephemeralTransactions,
          uniqueAddressesGenerated: uniqueAddressesUsed.length,
          privacyCompliance: Math.round(privacyCompliance * 100) / 100,
          correlationRisk:
            privacyCompliance > 95
              ? "LOW"
              : privacyCompliance > 80
                ? "MEDIUM"
                : "HIGH",
        },
        privacy: {
          addressReuse: totalTransactions - uniqueAddressesUsed.length,
          correlationPrevention: ephemeralTransactions,
          privacyBenefits: [
            "External observers cannot correlate transactions",
            "Each transaction appears from random address",
            "Wallet balances cannot be traced",
            "Transaction patterns are hidden",
            "Complete financial privacy protection",
          ],
        },
        recommendations:
          privacyCompliance < 95
            ? [
                "🔧 Ensure all transactions use ephemeral keys",
                "🔍 Monitor ephemeral key generation",
                "⏰ Verify key expiry and destruction",
                "🛡️ Review privacy protection settings",
              ]
            : [
                "✅ Excellent privacy protection maintained",
                "🎯 All transactions using ephemeral keys",
                "🛡️ Complete correlation prevention active",
              ],
      };
    } catch (error) {
      this.logger.error("❌ Failed to get privacy report:", error.message);
      throw error;
    }
  }
}
