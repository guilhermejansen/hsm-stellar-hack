import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { DatabaseService } from '../database/database.service';
import { HSMService } from '../hsm/hsm.service';
import { EncryptionService } from '../common/encryption.service';
import { AuditService } from '../common/audit.service';
import { KYCSubmission, KYCVerificationResult } from '../common/interfaces';

/**
 * 📋 KYC Service - Know Your Customer Onboarding
 * 
 * Following api-integrations.mdc KYC workflow:
 * 1. Collect PII data
 * 2. Generate user ID with SHA256
 * 3. Create HSM partition for user
 * 4. Generate AES256 key for PII encryption
 * 5. Create BIP32 Edwards XPRIV
 * 6. Encrypt PII with Svault Module
 * 7. Complete user registration
 */
@Injectable()
export class KYCService {
  private readonly logger = new Logger(KYCService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly hsmService: HSMService,
    private readonly encryption: EncryptionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService
  ) {}

  // ==================== KYC SUBMISSION ====================

  /**
   * Submit KYC application with complete HSM integration
   */
  async submitKYC(
    email: string,
    phone: string,
    password: string,
    kycData: KYCSubmission
  ): Promise<{
    userId: string;
    kycStatus: string;
    hsmPartitionCreated: boolean;
    nextSteps: string[];
  }> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`📋 Starting KYC process for: ${email}`);

      // 1. Validate KYC data
      this.validateKYCData(kycData);

      // 2. Check if user already exists
      const existingUser = await this.database.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase() },
            { phone: phone }
          ]
        }
      });

      if (existingUser) {
        throw new Error('User with this email or phone already exists');
      }

      // 3. Create KYC record with HSM partition
      const kycResult = await this.processKYCWithHSM(email, phone, password, kycData);

      // Audit log
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: kycResult.userId,
        action: 'kyc.submitted',
        resource: 'kyc',
        ip: 'backend-service',
        userAgent: 'kyc-service',
        result: 'success',
        metadata: {
          email,
          phone,
          kycStatus: kycResult.status,
          hsmPartitionCreated: kycResult.hsmPartitionCreated,
          duration: Date.now() - startTime
        }
      });

      this.logger.log(`✅ KYC submitted successfully for user: ${kycResult.userId}`);

      return {
        userId: kycResult.userId,
        kycStatus: kycResult.status,
        hsmPartitionCreated: kycResult.hsmPartitionCreated,
        nextSteps: [
          'Wait for KYC approval (1-3 business days)',
          'Check email for approval notification',
          'Complete guardian registration if approved'
        ]
      };

    } catch (error) {
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: 'unknown',
        action: 'kyc.submission_failed',
        resource: 'kyc',
        ip: 'backend-service',
        userAgent: 'kyc-service',
        result: 'failure',
        metadata: {
          email,
          error: error.message,
          duration: Date.now() - startTime
        }
      });
      
      this.logger.error('❌ KYC submission failed:', error.message);
      throw error;
    }
  }

  /**
   * Process KYC with HSM partition creation
   */
  private async processKYCWithHSM(
    email: string,
    phone: string,
    password: string,
    kycData: KYCSubmission
  ): Promise<KYCVerificationResult> {
    try {
      // 1. Create HSM partition with KYC data (following api-integrations.mdc)
      const hsmPartition = await this.hsmService.createUserWithKYC({
        name: kycData.personalInfo.fullName,
        docId: kycData.documents.idDocument,
        address: `${kycData.contactInfo.address.street}, ${kycData.contactInfo.address.city}`,
        phone: phone,
        email: email
      });

      // 2. Hash password
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(password, 12);

      // 3. Create user in database
      const user = await this.database.user.create({
        data: {
          email: email.toLowerCase(),
          name: kycData.personalInfo.fullName,
          phone: phone,
          passwordHash,
          
          // KYC Information
          encryptedPII: hsmPartition.partitionId, // PII encrypted by HSM
          kycStatus: 'UNDER_REVIEW',
          kycDocuments: [
            kycData.documents.idDocument,
            kycData.documents.proofOfAddress,
            ...kycData.documents.additionalDocs
          ],
          
          // HSM Integration
          hsmPartitionId: hsmPartition.partitionId,
          hsmAESKeyId: hsmPartition.aesKeyId,
          hsmKeyName: hsmPartition.masterKeyId,
          hsmActivated: false // Will be activated when TOTP is verified
        }
      });

      this.logger.log(`✅ User created with HSM partition: ${user.id}`);

      return {
        status: 'UNDER_REVIEW',
        hsmPartitionCreated: true,
        partitionId: hsmPartition.partitionId,
        userId: user.id
      };

    } catch (error) {
      this.logger.error('❌ KYC processing with HSM failed:', error.message);
      throw error;
    }
  }

  // ==================== KYC VALIDATION ====================

  /**
   * Validate KYC submission data
   */
  private validateKYCData(kycData: KYCSubmission): void {
    // Personal info validation
    if (!kycData.personalInfo.fullName || kycData.personalInfo.fullName.length < 2) {
      throw new Error('Full name is required and must be at least 2 characters');
    }

    if (!kycData.personalInfo.dateOfBirth) {
      throw new Error('Date of birth is required');
    }

    if (!kycData.personalInfo.nationality) {
      throw new Error('Nationality is required');
    }

    // Document validation
    if (!kycData.documents.idDocument) {
      throw new Error('ID document is required');
    }

    if (!kycData.documents.proofOfAddress) {
      throw new Error('Proof of address is required');
    }

    // Contact info validation
    if (!kycData.contactInfo.address.street || !kycData.contactInfo.address.city) {
      throw new Error('Complete address is required');
    }

    this.logger.log('✅ KYC data validation passed');
  }

  // ==================== KYC APPROVAL ====================

  /**
   * Approve KYC and activate user
   */
  async approveKYC(userId: string, adminId: string): Promise<void> {
    try {
      this.logger.log(`✅ Approving KYC for user: ${userId}`);

      await this.database.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'APPROVED',
          isEmailVerified: true
        }
      });

      // Audit log
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: adminId,
        action: 'kyc.approved',
        resource: 'kyc',
        ip: 'backend-service',
        userAgent: 'kyc-service',
        result: 'success',
        metadata: { approvedUserId: userId }
      });

      this.logger.log(`✅ KYC approved for user: ${userId}`);
    } catch (error) {
      this.logger.error('❌ KYC approval failed:', error.message);
      throw error;
    }
  }

  /**
   * Reject KYC with reason
   */
  async rejectKYC(userId: string, reason: string, adminId: string): Promise<void> {
    try {
      this.logger.log(`❌ Rejecting KYC for user: ${userId}`);

      await this.database.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'REJECTED'
        }
      });

      // Audit log
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: adminId,
        action: 'kyc.rejected',
        resource: 'kyc',
        ip: 'backend-service',
        userAgent: 'kyc-service',
        result: 'success',
        metadata: { rejectedUserId: userId, reason }
      });

      this.logger.log(`❌ KYC rejected for user: ${userId} - Reason: ${reason}`);
    } catch (error) {
      this.logger.error('❌ KYC rejection failed:', error.message);
      throw error;
    }
  }

  /**
   * Get KYC statistics
   */
  async getKYCStats(): Promise<{
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    try {
      const [pending, underReview, approved, rejected] = await Promise.all([
        this.database.user.count({ where: { kycStatus: 'PENDING' } }),
        this.database.user.count({ where: { kycStatus: 'UNDER_REVIEW' } }),
        this.database.user.count({ where: { kycStatus: 'APPROVED' } }),
        this.database.user.count({ where: { kycStatus: 'REJECTED' } })
      ]);

      const total = pending + underReview + approved + rejected;

      return { pending, underReview, approved, rejected, total };
    } catch (error) {
      this.logger.error('❌ Failed to get KYC stats:', error.message);
      throw error;
    }
  }
}
