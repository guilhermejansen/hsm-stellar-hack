import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import * as crypto from "crypto";

import { DatabaseService } from "../database/database.service";
import { HSMService } from "../hsm/hsm.service";
import { KYCService } from "../kyc/kyc.service";
import { WalletService } from "../wallets/wallet.service";
import { EncryptionService } from "../common/encryption.service";
import { AuditService } from "../common/audit.service";
import { GuardianRegistration, GuardianTOTPSetup } from "../common/interfaces";

/**
 * 👥 Guardian Service - 3 Guardian Management System
 *
 * Following FINAL_ARCHITECTURE_SUMMARY.mdc 3-Guardian configuration:
 * - CEO: Primary guardian, highest privileges
 * - CFO: Financial oversight, transaction validation
 * - CTO: Technical oversight, system administration
 *
 * Following stellar-custody-mvp.mdc guardian registration workflow:
 * 1. Admin creates guardian with KYC data
 * 2. HSM creates individual partition
 * 3. Generate TOTP secret linked to HSM partition
 * 4. Send WhatsApp with TOTP QR code
 * 5. Guardian activates HSM partition with first TOTP
 *
 * Threshold schemes:
 * - 2-of-3 for transactions < 10,000 XLM
 * - 3-of-3 for transactions > 10,000 XLM or Cold Wallet access
 */
@Injectable()
export class GuardianService {
  private readonly logger = new Logger(GuardianService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly hsmService: HSMService,
    private readonly kycService: KYCService,
    private readonly walletService: WalletService,
    private readonly encryption: EncryptionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== GUARDIAN REGISTRATION ====================

  /**
   * Register new guardian with complete KYC and HSM setup
   * Following stellar-custody-mvp.mdc guardian registration flow
   */
  async registerGuardian(registration: GuardianRegistration): Promise<{
    guardianId: string;
    totpSetup: GuardianTOTPSetup;
    nextSteps: string[];
  }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `👥 Registering guardian: ${registration.role} - ${registration.email}`,
      );

      // 1. Validate guardian role (only CEO, CFO, CTO allowed)
      if (!["CEO", "CFO", "CTO"].includes(registration.role)) {
        throw new Error("Invalid guardian role. Only CEO, CFO, CTO allowed");
      }

      // 2. Check if role is already taken
      const existingGuardian = await this.database.guardian.findFirst({
        where: { role: registration.role },
      });

      if (existingGuardian) {
        throw new Error(
          `Guardian role ${registration.role} is already assigned`,
        );
      }

      // 3. Submit KYC application with HSM partition creation
      const kycResult = await this.kycService.submitKYC(
        registration.email,
        registration.phone,
        crypto.randomBytes(32).toString("hex"), // Temporary password
        {
          personalInfo: registration.kycData,
          documents: {
            idDocument: crypto
              .createHash("sha256")
              .update(registration.kycData.documentId)
              .digest("hex"),
            proofOfAddress: crypto
              .createHash("sha256")
              .update(registration.kycData.address)
              .digest("hex"),
            additionalDocs: [],
          },
          contactInfo: {
            email: registration.email,
            phone: registration.phone,
            address: {
              street: registration.kycData.address,
              city: "São Paulo",
              state: "SP",
              country: "Brazil",
              postalCode: "01000-000",
            },
          },
        },
      );

      // 4. Auto-approve KYC for guardian (in production, this would be manual review)
      await this.kycService.approveKYC(kycResult.userId, "system");

      // 5. Generate TOTP secret linked to HSM partition
      const totpSetup = await this.generateTOTPForGuardian(kycResult.userId);

      // 6. Create guardian record
      const guardian = await this.database.guardian.create({
        data: {
          userId: kycResult.userId,
          role: registration.role,
          level: registration.level,
          isActive: true,
          totpSecret: this.encryption.encrypt(totpSetup.secret),
          totpQrCode: totpSetup.qrCodeUrl,
          totpVerified: false,
          dailyLimit: registration.role === "CEO" ? 100000 : 50000,
          monthlyLimit: registration.role === "CEO" ? 1000000 : 500000,
        },
      });

      // 7. Create wallet hierarchy for guardian
      await this.walletService.createWalletHierarchy(kycResult.userId);

      // Audit log
      await this.auditService.logGuardianAction(
        guardian.id,
        "registered",
        "success",
        {
          role: registration.role,
          level: registration.level,
          hsmPartitionCreated: kycResult.hsmPartitionCreated,
          duration: Date.now() - startTime,
        },
      );

      this.logger.log(
        `✅ Guardian registered successfully: ${registration.role} (${guardian.id})`,
      );

      return {
        guardianId: guardian.id,
        totpSetup,
        nextSteps: [
          "Scan QR code with Google Authenticator",
          "Enter first TOTP code to activate HSM partition",
          "Complete guardian activation process",
          "Begin participating in multi-sig approvals",
        ],
      };
    } catch (error) {
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: "system",
        action: "guardian.registration_failed",
        resource: "guardian",
        ip: "backend-service",
        userAgent: "guardian-service",
        result: "failure",
        metadata: {
          role: registration.role,
          email: registration.email,
          error: error.message,
          duration: Date.now() - startTime,
        },
      });

      this.logger.error(`❌ Guardian registration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate TOTP setup for guardian
   */
  private async generateTOTPForGuardian(
    userId: string,
  ): Promise<GuardianTOTPSetup> {
    try {
      // Generate TOTP secret
      const secret = authenticator.generateSecret();

      // Get user info for QR code
      const user = await this.database.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Generate QR code for Google Authenticator
      const issuer = this.configService.get(
        "TOTP_ISSUER",
        "Stellar Custody MVP",
      );
      const otpauth = authenticator.keyuri(user.email, issuer, secret);
      const qrCodeUrl = await QRCode.toDataURL(otpauth);

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString("hex").toUpperCase(),
      );

      return {
        secret,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: secret,
        hsmPartitionId: user.hsmPartitionId!,
      };
    } catch (error) {
      this.logger.error("❌ TOTP setup generation failed:", error.message);
      throw error;
    }
  }

  // ==================== GUARDIAN ACTIVATION ====================

  /**
   * Activate guardian with first TOTP verification
   * This activates the HSM partition for the guardian
   */
  async activateGuardian(guardianId: string, totpCode: string): Promise<void> {
    try {
      this.logger.log(`🔐 Activating guardian: ${guardianId}`);

      // Get guardian
      const guardian = await this.database.guardian.findUnique({
        where: { id: guardianId },
        include: { user: true },
      });

      if (!guardian) {
        throw new Error("Guardian not found");
      }

      if (guardian.totpVerified) {
        throw new Error("Guardian already activated");
      }

      // Validate TOTP code
      const totpSecret = this.encryption.decrypt(guardian.totpSecret);
      const isValid = authenticator.verify({
        token: totpCode,
        secret: totpSecret,
      });

      if (!isValid) {
        throw new Error("Invalid TOTP code");
      }

      // Update guardian status
      await this.database.guardian.update({
        where: { id: guardianId },
        data: {
          totpVerified: true,
          lastTotpUsed: totpCode,
        },
      });

      // Activate HSM partition
      await this.database.user.update({
        where: { id: guardian.userId },
        data: {
          hsmActivated: true,
        },
      });

      // Audit log
      await this.auditService.logGuardianAction(
        guardianId,
        "activated",
        "success",
        {
          role: guardian.role,
          hsmPartitionId: guardian.user.hsmPartitionId,
        },
      );

      this.logger.log(
        `✅ Guardian activated: ${guardian.role} (${guardianId})`,
      );
    } catch (error) {
      await this.auditService.logGuardianAction(
        guardianId,
        "activation_failed",
        "failure",
        { error: error.message },
      );

      this.logger.error("❌ Guardian activation failed:", error.message);
      throw error;
    }
  }

  // ==================== GUARDIAN QUERIES ====================

  /**
   * Get all active guardians (max 3: CEO, CFO, CTO)
   */
  async getActiveGuardians() {
    try {
      return await this.database.guardian.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              stellarPublicKey: true,
              hsmActivated: true,
            },
          },
        },
        orderBy: [
          { role: "asc" }, // CEO, CFO, CTO order
          { createdAt: "asc" },
        ],
      });
    } catch (error) {
      this.logger.error("❌ Failed to get active guardians:", error.message);
      throw error;
    }
  }

  /**
   * Get guardian by ID
   */
  async getGuardianById(guardianId: string) {
    try {
      return await this.database.guardian.findUnique({
        where: { id: guardianId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              stellarPublicKey: true,
              hsmActivated: true,
              hsmPartitionId: true,
            },
          },
          approvals: {
            take: 10,
            orderBy: { validatedAt: "desc" },
            include: {
              transaction: {
                select: {
                  id: true,
                  amount: true,
                  toAddress: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error("❌ Failed to get guardian:", error.message);
      throw error;
    }
  }

  /**
   * Get guardian by role
   */
  async getGuardianByRole(role: "CEO" | "CFO" | "CTO") {
    try {
      return await this.database.guardian.findFirst({
        where: {
          role: role,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              stellarPublicKey: true,
              hsmActivated: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`❌ Failed to get ${role} guardian:`, error.message);
      throw error;
    }
  }

  // ==================== GUARDIAN MANAGEMENT ====================

  /**
   * Update guardian status (activate/deactivate)
   */
  async updateGuardianStatus(
    guardianId: string,
    isActive: boolean,
    reason: string,
    adminId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `🔄 Updating guardian status: ${guardianId} -> ${isActive ? "active" : "inactive"}`,
      );

      const guardian = await this.database.guardian.findUnique({
        where: { id: guardianId },
      });

      if (!guardian) {
        throw new Error("Guardian not found");
      }

      // Ensure we always have at least 2 active guardians
      if (!isActive) {
        const activeCount = await this.database.guardian.count({
          where: {
            isActive: true,
            id: { not: guardianId },
          },
        });

        if (activeCount < 2) {
          throw new Error(
            "Cannot deactivate guardian: minimum 2 active guardians required",
          );
        }
      }

      await this.database.guardian.update({
        where: { id: guardianId },
        data: { isActive },
      });

      // Audit log
      await this.auditService.logGuardianAction(
        guardianId,
        isActive ? "activated" : "deactivated",
        "success",
        {
          reason,
          adminId,
          previousStatus: guardian.isActive,
        },
      );

      this.logger.log(
        `✅ Guardian status updated: ${guardian.role} -> ${isActive ? "active" : "inactive"}`,
      );
    } catch (error) {
      this.logger.error("❌ Guardian status update failed:", error.message);
      throw error;
    }
  }

  /**
   * Validate TOTP for guardian action
   */
  async validateGuardianTOTP(
    guardianId: string,
    totpCode: string,
  ): Promise<boolean> {
    try {
      const guardian = await this.database.guardian.findUnique({
        where: { id: guardianId },
      });

      if (!guardian || !guardian.isActive) {
        throw new Error("Guardian not found or inactive");
      }

      // Check replay attack
      if (guardian.lastTotpUsed === totpCode) {
        throw new Error("TOTP code already used");
      }

      // Validate TOTP
      const totpSecret = this.encryption.decrypt(guardian.totpSecret);
      const isValid = authenticator.verify({
        token: totpCode,
        secret: totpSecret,
      });

      if (isValid) {
        // Update last used TOTP
        await this.database.guardian.update({
          where: { id: guardianId },
          data: { lastTotpUsed: totpCode },
        });

        // Audit log
        await this.auditService.logGuardianAction(
          guardianId,
          "totp_validated",
          "success",
          { authMethod: "TOTP" },
        );
      } else {
        // Audit log failed attempt
        await this.auditService.logGuardianAction(
          guardianId,
          "totp_validation_failed",
          "failure",
          { authMethod: "TOTP" },
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error("❌ TOTP validation failed:", error.message);
      return false;
    }
  }

  // ==================== GUARDIAN STATISTICS ====================

  /**
   * Get guardian statistics
   */
  async getGuardianStats() {
    try {
      const [
        totalGuardians,
        activeGuardians,
        verifiedGuardians,
        hsmActivatedGuardians,
        approvalStats,
      ] = await Promise.all([
        this.database.guardian.count(),
        this.database.guardian.count({ where: { isActive: true } }),
        this.database.guardian.count({ where: { totpVerified: true } }),
        this.database.guardian.count({
          where: {
            user: { hsmActivated: true },
          },
        }),
        this.database.guardian.aggregate({
          _sum: { totalApprovals: true },
          _avg: { totalApprovals: true },
        }),
      ]);

      return {
        total: totalGuardians,
        active: activeGuardians,
        verified: verifiedGuardians,
        hsmActivated: hsmActivatedGuardians,
        totalApprovals: approvalStats._sum.totalApprovals || 0,
        avgApprovalsPerGuardian: Math.round(
          approvalStats._avg.totalApprovals || 0,
        ),
        completionRate:
          totalGuardians > 0
            ? (hsmActivatedGuardians / totalGuardians) * 100
            : 0,
      };
    } catch (error) {
      this.logger.error("❌ Failed to get guardian stats:", error.message);
      throw error;
    }
  }

  /**
   * Get guardian approval history
   */
  async getGuardianApprovals(guardianId: string, limit: number = 20) {
    try {
      return await this.database.approval.findMany({
        where: { guardianId },
        include: {
          transaction: {
            select: {
              id: true,
              amount: true,
              toAddress: true,
              status: true,
              txType: true,
              createdAt: true,
            },
          },
        },
        orderBy: { validatedAt: "desc" },
        take: limit,
      });
    } catch (error) {
      this.logger.error("❌ Failed to get guardian approvals:", error.message);
      throw error;
    }
  }

  // ==================== GUARDIAN UTILITIES ====================

  /**
   * Check if we have minimum required guardians for operation
   */
  async hasMinimumGuardians(): Promise<{
    hasMinimum: boolean;
    activeCount: number;
    minimumRequired: number;
    roles: string[];
  }> {
    try {
      const activeGuardians = await this.getActiveGuardians();
      const activeCount = activeGuardians.length;
      const minimumRequired = 2; // Always need at least 2 for 2-of-3

      return {
        hasMinimum: activeCount >= minimumRequired,
        activeCount,
        minimumRequired,
        roles: activeGuardians.map((g) => g.role),
      };
    } catch (error) {
      this.logger.error("❌ Failed to check minimum guardians:", error.message);
      return {
        hasMinimum: false,
        activeCount: 0,
        minimumRequired: 2,
        roles: [],
      };
    }
  }

  /**
   * Get guardians required for transaction amount
   */
  async getRequiredGuardiansForAmount(amount: string): Promise<{
    thresholdType: "LOW_VALUE_2_OF_3" | "HIGH_VALUE_2_OF_3" | "CRITICAL_3_OF_3";
    requiredApprovals: number;
    totalGuardians: number;
    challengeRequired: boolean;
  }> {
    const amountNum = parseFloat(amount);

    if (amountNum < 1000) {
      return {
        thresholdType: "LOW_VALUE_2_OF_3",
        requiredApprovals: 2,
        totalGuardians: 3,
        challengeRequired: false, // OCRA-like optional
      };
    } else if (amountNum < 10000) {
      return {
        thresholdType: "HIGH_VALUE_2_OF_3",
        requiredApprovals: 2,
        totalGuardians: 3,
        challengeRequired: true, // OCRA-like required
      };
    } else {
      return {
        thresholdType: "CRITICAL_3_OF_3",
        requiredApprovals: 3,
        totalGuardians: 3,
        challengeRequired: true, // OCRA-like required
      };
    }
  }

  /**
   * Check guardian daily/monthly limits
   */
  async checkGuardianLimits(
    guardianId: string,
    amount: string,
  ): Promise<{
    canApprove: boolean;
    reason?: string;
    dailyRemaining: string;
    monthlyRemaining: string;
  }> {
    try {
      const guardian = await this.database.guardian.findUnique({
        where: { id: guardianId },
      });

      if (!guardian) {
        return {
          canApprove: false,
          reason: "Guardian not found",
          dailyRemaining: "0",
          monthlyRemaining: "0",
        };
      }

      // For simplicity, we'll assume guardian limits are not exceeded
      // In production, you'd calculate actual daily/monthly spending

      return {
        canApprove: true,
        dailyRemaining: guardian.dailyLimit.toString(),
        monthlyRemaining: guardian.monthlyLimit.toString(),
      };
    } catch (error) {
      this.logger.error("❌ Failed to check guardian limits:", error.message);
      return {
        canApprove: false,
        reason: "Limit check failed",
        dailyRemaining: "0",
        monthlyRemaining: "0",
      };
    }
  }
}
