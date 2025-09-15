import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  HttpStatus
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiSecurity,
  ApiParam,
  ApiBody
} from '@nestjs/swagger';

import { GuardianService } from './guardian.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TOTPAuthGuard } from '../auth/totp-auth.guard';
import { AuditService } from '../common/audit.service';
import { 
  RegisterGuardianDto, 
  ActivateGuardianDto, 
  UpdateGuardianStatusDto,
  GuardianResponseDto,
  GuardianTOTPSetupDto
} from '../common/dto/guardian.dto';

/**
 * 👥 Guardian Controller - 3 Guardian Management API
 * 
 * Manages the 3-guardian system (CEO, CFO, CTO) following FINAL_ARCHITECTURE_SUMMARY.mdc:
 * - Guardian registration with KYC and HSM partition creation
 * - TOTP setup and activation
 * - Guardian status management
 * - Approval tracking and statistics
 * 
 * Security:
 * - JWT authentication required
 * - TOTP required for sensitive operations
 * - Complete audit logging
 * - Rate limiting applied
 */
@ApiTags('Guardians')
@Controller('guardians')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GuardianController {
  constructor(
    private readonly guardianService: GuardianService,
    private readonly whatsappService: WhatsAppService,
    private readonly auditService: AuditService
  ) {}

  // ==================== GUARDIAN REGISTRATION ====================

  @Post('register')
  @ApiOperation({
    summary: 'Register new guardian (Admin only)',
    description: `
      **Register a new guardian in the 3-guardian system (CEO, CFO, CTO)**
      
      This endpoint creates a complete guardian with:
      - KYC process completion
      - HSM partition creation  
      - TOTP secret generation
      - WhatsApp QR code delivery
      
      **Process Flow:**
      1. Validate guardian role (only CEO, CFO, CTO allowed)
      2. Submit KYC application with HSM partition creation
      3. Generate TOTP secret linked to HSM partition
      4. Send WhatsApp with TOTP QR code
      5. Return guardian ID and setup instructions
      
      **Security:**
      - Only one guardian per role allowed
      - Complete KYC validation required
      - HSM partition isolated per guardian
      - TOTP secret encrypted and stored securely
      
      **Post-Registration:**
      - Guardian receives WhatsApp with QR code
      - Guardian scans QR with Google Authenticator
      - Guardian activates HSM partition with first TOTP
    `
  })
  @ApiBody({ 
    type: RegisterGuardianDto,
    description: 'Guardian registration data with KYC information'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Guardian registered successfully',
    type: GuardianTOTPSetupDto,
    schema: {
      example: {
        guardianId: 'clrx1234567890guard1',
        totpSetup: {
          secret: 'JBSWY3DPEHPK3PXP',
          qrCodeUrl: 'data:image/png;base64,iVBORw0KGgo...',
          backupCodes: ['12345678', '87654321'],
          manualEntryKey: 'JBSWY3DPEHPK3PXP',
          hsmPartitionId: 'user_abc123def456'
        },
        nextSteps: [
          'Scan QR code with Google Authenticator',
          'Enter first TOTP code to activate HSM partition',
          'Complete guardian activation process'
        ]
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or role already taken',
    schema: {
      example: {
        error: 'Guardian role CEO is already assigned',
        message: 'Bad Request',
        statusCode: 400
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Admin authentication required'
  })
  @UseGuards(TOTPAuthGuard)
  @ApiSecurity('TOTP')
  async registerGuardian(
    @Body() registerDto: RegisterGuardianDto,
    @Request() req: any
  ) {
    try {
      // Register guardian with complete KYC and HSM setup
      const result = await this.guardianService.registerGuardian({
        name: registerDto.name,
        email: registerDto.email,
        phone: registerDto.phone,
        role: registerDto.role,
        level: registerDto.level as 1 | 2 | 3,
        kycData: {
          ...registerDto.kycData,
          occupation: 'Guardian Executive'
        }
      });

      // Send TOTP QR code via WhatsApp
      await this.whatsappService.sendTOTPSetup(
        registerDto.phone,
        result.totpSetup.qrCodeUrl,
        registerDto.role
      );

      return {
        success: true,
        data: result,
        message: `Guardian ${registerDto.role} registered successfully. TOTP QR code sent via WhatsApp.`
      };
    } catch (error) {
      await this.auditService.logGuardianAction(
        'unknown',
        'registration_failed',
        'failure',
        { error: error.message, role: registerDto.role },
        req
      );
      throw error;
    }
  }

  // ==================== GUARDIAN ACTIVATION ====================

  @Post(':id/activate')
  @ApiOperation({
    summary: 'Activate guardian HSM partition',
    description: `
      **Activate guardian's HSM partition with first TOTP verification**
      
      This endpoint completes the guardian setup process:
      - Validates first TOTP code from authenticator app
      - Activates HSM partition for the guardian
      - Enables guardian for multi-sig operations
      
      **Process:**
      1. Guardian scans QR code with Google Authenticator
      2. Guardian enters first 6-digit TOTP code
      3. System validates TOTP against guardian's secret
      4. HSM partition gets activated
      5. Guardian can now participate in approvals
      
      **Security:**
      - TOTP code must be valid and not previously used
      - HSM partition remains locked until activation
      - Complete audit trail maintained
    `
  })
  @ApiParam({
    name: 'id',
    description: 'Guardian ID',
    example: 'clrx1234567890guard1'
  })
  @ApiBody({ 
    type: ActivateGuardianDto,
    description: 'Guardian ID and first TOTP code'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Guardian activated successfully',
    schema: {
      example: {
        success: true,
        message: 'Guardian activated successfully. HSM partition is now active.',
        data: {
          guardianId: 'clrx1234567890guard1',
          role: 'CEO',
          hsmActivated: true,
          activatedAt: '2024-12-14T10:30:00Z'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid TOTP code or guardian already activated'
  })
  async activateGuardian(
    @Param('id') guardianId: string,
    @Body() activateDto: ActivateGuardianDto,
    @Request() req: any
  ) {
    try {
      await this.guardianService.activateGuardian(guardianId, activateDto.totpCode);

      const guardian = await this.guardianService.getGuardianById(guardianId);

      return {
        success: true,
        message: 'Guardian activated successfully. HSM partition is now active.',
        data: {
          guardianId: guardian.id,
          role: guardian.role,
          hsmActivated: guardian.user.hsmActivated,
          activatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== GUARDIAN QUERIES ====================

  @Get()
  @ApiOperation({
    summary: 'Get all active guardians',
    description: `
      **Retrieve all active guardians in the system**
      
      Returns the complete 3-guardian system status:
      - CEO, CFO, CTO information
      - TOTP verification status
      - HSM activation status
      - Approval statistics
      
      **Guardian Information Includes:**
      - Basic info (name, email, phone, role)
      - Security status (TOTP verified, HSM activated)
      - Limits (daily, monthly)
      - Statistics (total approvals, last approval)
      - Stellar wallet address
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active guardians',
    type: [GuardianResponseDto],
    schema: {
      example: [
        {
          id: 'clrx1234567890guard1',
          role: 'CEO',
          name: 'João Silva Santos',
          email: 'ceo@stellarcustody.com',
          phone: '+5511999999001',
          level: 3,
          isActive: true,
          totpVerified: true,
          hsmActivated: true,
          stellarPublicKey: 'GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT',
          dailyLimit: '100000.0000000',
          monthlyLimit: '1000000.0000000',
          totalApprovals: 42,
          lastApprovalAt: '2024-12-14T10:30:00Z',
          createdAt: '2024-12-01T09:00:00Z'
        }
      ]
    }
  })
  async getActiveGuardians() {
    try {
      const guardians = await this.guardianService.getActiveGuardians();
      
      return {
        success: true,
        data: guardians.map(guardian => ({
          id: guardian.id,
          role: guardian.role,
          name: guardian.user.name,
          email: guardian.user.email,
          phone: guardian.user.phone,
          level: guardian.level,
          isActive: guardian.isActive,
          totpVerified: guardian.totpVerified,
          hsmActivated: guardian.user.hsmActivated,
          stellarPublicKey: guardian.user.stellarPublicKey,
          dailyLimit: guardian.dailyLimit.toString(),
          monthlyLimit: guardian.monthlyLimit.toString(),
          totalApprovals: guardian.totalApprovals,
          lastApprovalAt: guardian.lastApprovalAt?.toISOString(),
          createdAt: guardian.createdAt.toISOString()
        })),
        metadata: {
          count: guardians.length,
          maxGuardians: 3,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get guardian by ID',
    description: 'Retrieve detailed information about a specific guardian'
  })
  @ApiParam({
    name: 'id',
    description: 'Guardian ID',
    example: 'clrx1234567890guard1'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Guardian details',
    type: GuardianResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Guardian not found'
  })
  async getGuardianById(@Param('id') guardianId: string) {
    try {
      const guardian = await this.guardianService.getGuardianById(guardianId);
      
      if (!guardian) {
        throw new Error('Guardian not found');
      }

      return {
        success: true,
        data: {
          id: guardian.id,
          role: guardian.role,
          name: guardian.user.name,
          email: guardian.user.email,
          phone: guardian.user.phone,
          level: guardian.level,
          isActive: guardian.isActive,
          totpVerified: guardian.totpVerified,
          hsmActivated: guardian.user.hsmActivated,
          stellarPublicKey: guardian.user.stellarPublicKey,
          dailyLimit: guardian.dailyLimit.toString(),
          monthlyLimit: guardian.monthlyLimit.toString(),
          totalApprovals: guardian.totalApprovals,
          lastApprovalAt: guardian.lastApprovalAt?.toISOString(),
          createdAt: guardian.createdAt.toISOString(),
          recentApprovals: guardian.approvals?.map(approval => ({
            transactionId: approval.transaction.id,
            amount: approval.transaction.amount.toString(),
            toAddress: approval.transaction.toAddress,
            status: approval.transaction.status,
            approvedAt: approval.validatedAt.toISOString()
          })) || []
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== GUARDIAN MANAGEMENT ====================

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update guardian status',
    description: `
      **Activate or deactivate a guardian (Admin only)**
      
      **Security Rules:**
      - Minimum 2 active guardians required at all times
      - Cannot deactivate if it would break minimum requirement
      - Complete audit trail maintained
      - TOTP required for this operation
      
      **Use Cases:**
      - Temporarily deactivate guardian (vacation, leave)
      - Reactivate guardian after absence
      - Emergency guardian management
    `
  })
  @ApiParam({
    name: 'id',
    description: 'Guardian ID to update',
    example: 'clrx1234567890guard1'
  })
  @ApiBody({ 
    type: UpdateGuardianStatusDto,
    description: 'New status and reason for change'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Guardian status updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Guardian status updated successfully',
        data: {
          guardianId: 'clrx1234567890guard1',
          role: 'CEO',
          previousStatus: true,
          newStatus: false,
          reason: 'Guardian temporarily unavailable',
          updatedAt: '2024-12-14T10:30:00Z'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot deactivate - minimum guardians required'
  })
  @UseGuards(TOTPAuthGuard)
  @ApiSecurity('TOTP')
  async updateGuardianStatus(
    @Param('id') guardianId: string,
    @Body() updateDto: UpdateGuardianStatusDto,
    @Request() req: any
  ) {
    try {
      const guardian = await this.guardianService.getGuardianById(guardianId);
      if (!guardian) {
        throw new Error('Guardian not found');
      }

      const previousStatus = guardian.isActive;

      await this.guardianService.updateGuardianStatus(
        guardianId,
        updateDto.isActive,
        updateDto.reason || 'Status updated by admin',
        req.user.userId
      );

      return {
        success: true,
        message: 'Guardian status updated successfully',
        data: {
          guardianId,
          role: guardian.role,
          previousStatus,
          newStatus: updateDto.isActive,
          reason: updateDto.reason,
          updatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== GUARDIAN STATISTICS ====================

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get guardian system statistics',
    description: `
      **System-wide guardian statistics and health metrics**
      
      **Includes:**
      - Total/Active/Verified guardian counts
      - HSM activation status
      - Approval statistics (total, average per guardian)
      - System completion rate
      - Health indicators
      
      **Use Cases:**
      - Admin dashboard overview
      - System health monitoring
      - Compliance reporting
      - Operational metrics
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Guardian system statistics',
    schema: {
      example: {
        success: true,
        data: {
          guardians: {
            total: 3,
            active: 3,
            verified: 3,
            hsmActivated: 3,
            completionRate: 100
          },
          approvals: {
            total: 126,
            avgPerGuardian: 42,
            last24Hours: 8
          },
          roles: {
            CEO: { active: true, approvals: 45 },
            CFO: { active: true, approvals: 42 },
            CTO: { active: true, approvals: 39 }
          },
          systemHealth: {
            minGuardiansAvailable: true,
            allHSMPartitionsActive: true,
            totpVerificationRate: 100
          }
        },
        metadata: {
          timestamp: '2024-12-14T10:30:00Z',
          calculatedAt: '2024-12-14T10:30:00Z'
        }
      }
    }
  })
  async getGuardianStats() {
    try {
      const [stats, minGuardians] = await Promise.all([
        this.guardianService.getGuardianStats(),
        this.guardianService.hasMinimumGuardians()
      ]);

      return {
        success: true,
        data: {
          guardians: {
            total: stats.total,
            active: stats.active,
            verified: stats.verified,
            hsmActivated: stats.hsmActivated,
            completionRate: stats.completionRate
          },
          approvals: {
            total: stats.totalApprovals,
            avgPerGuardian: stats.avgApprovalsPerGuardian
          },
          systemHealth: {
            minGuardiansAvailable: minGuardians.hasMinimum,
            activeCount: minGuardians.activeCount,
            minimumRequired: minGuardians.minimumRequired,
            roles: minGuardians.roles
          }
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':id/approvals')
  @ApiOperation({
    summary: 'Get guardian approval history',
    description: 'Retrieve recent approval history for a specific guardian'
  })
  @ApiParam({
    name: 'id',
    description: 'Guardian ID',
    example: 'clrx1234567890guard1'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Guardian approval history',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'clrx1234567890appr1',
            transactionId: 'clrx1234567890trans1',
            amount: '5000.0000000',
            toAddress: 'GABCD1234567890EFGH...',
            status: 'SUCCESS',
            txType: 'PAYMENT',
            authMethod: 'OCRA_LIKE',
            approvedAt: '2024-12-14T09:30:00Z'
          }
        ],
        metadata: {
          guardianId: 'clrx1234567890guard1',
          role: 'CEO',
          count: 20,
          timestamp: '2024-12-14T10:30:00Z'
        }
      }
    }
  })
  async getGuardianApprovals(@Param('id') guardianId: string) {
    try {
      const approvals = await this.guardianService.getGuardianApprovals(guardianId);
      const guardian = await this.guardianService.getGuardianById(guardianId);

      return {
        success: true,
        data: approvals.map(approval => ({
          id: approval.id,
          transactionId: approval.transaction.id,
          amount: approval.transaction.amount.toString(),
          toAddress: approval.transaction.toAddress,
          status: approval.transaction.status,
          txType: approval.transaction.txType,
          authMethod: approval.authMethod,
          approvedAt: approval.validatedAt.toISOString()
        })),
        metadata: {
          guardianId,
          role: guardian?.role,
          count: approvals.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== GUARDIAN UTILITIES ====================

  @Get('check/minimum')
  @ApiOperation({
    summary: 'Check minimum guardian requirements',
    description: 'Verify if system has minimum required guardians for operations'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Minimum guardian check result',
    schema: {
      example: {
        success: true,
        data: {
          hasMinimum: true,
          activeCount: 3,
          minimumRequired: 2,
          roles: ['CEO', 'CFO', 'CTO'],
          systemOperational: true
        }
      }
    }
  })
  async checkMinimumGuardians() {
    try {
      const result = await this.guardianService.hasMinimumGuardians();
      
      return {
        success: true,
        data: {
          ...result,
          systemOperational: result.hasMinimum
        }
      };
    } catch (error) {
      throw error;
    }
  }
}
