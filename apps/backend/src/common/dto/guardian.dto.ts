import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsPhoneNumber, IsEnum, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * 👥 Guardian DTOs - 3 Guardian System (CEO, CFO, CTO)
 * 
 * Based on schema.mdc Guardian model and HSM DINAMO integration
 */

export enum GuardianRole {
  CEO = 'CEO',
  CFO = 'CFO', 
  CTO = 'CTO'
}

// ==================== GUARDIAN REGISTRATION ====================

export class RegisterGuardianDto {
  @ApiProperty({
    description: 'Guardian full name',
    example: 'João Silva Santos',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'Guardian email address',
    example: 'ceo@stellarcustody.com',
    format: 'email'
  })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'Guardian phone number (international format)',
    example: '+5511999999001',
    pattern: '^\\+[1-9]\\d{1,14}$'
  })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    description: 'Guardian role in the organization',
    enum: GuardianRole,
    example: GuardianRole.CEO
  })
  @IsEnum(GuardianRole)
  role: GuardianRole;

  @ApiProperty({
    description: 'Guardian permission level (1-3)',
    example: 3,
    minimum: 1,
    maximum: 3
  })
  @IsInt()
  @Min(1)
  @Max(3)
  level: number;

  @ApiProperty({
    description: 'KYC information for HSM partition creation',
    type: 'object',
    properties: {
      fullName: { type: 'string', example: 'João Silva Santos' },
      documentId: { type: 'string', example: '12345678901' },
      address: { type: 'string', example: 'Rua das Flores, 123' },
      dateOfBirth: { type: 'string', example: '1980-01-15' },
      nationality: { type: 'string', example: 'Brazilian' }
    }
  })
  kycData: {
    fullName: string;
    documentId: string;
    address: string;
    dateOfBirth: string;
    nationality: string;
    occupation: string;
  };
}

// ==================== GUARDIAN ACTIVATION ====================

export class ActivateGuardianDto {
  @ApiProperty({
    description: 'Guardian ID',
    example: 'clrx1234567890abcdef'
  })
  @IsString()
  guardianId: string;

  @ApiProperty({
    description: 'First TOTP code to activate HSM partition',
    example: '123456',
    pattern: '^[0-9]{6}$'
  })
  @IsString()
  totpCode: string;
}

// ==================== GUARDIAN UPDATE ====================

export class UpdateGuardianStatusDto {
  @ApiProperty({
    description: 'Active status',
    example: true
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    description: 'Reason for status change',
    example: 'Guardian temporarily unavailable',
    required: false
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ==================== GUARDIAN RESPONSE ====================

export class GuardianResponseDto {
  @ApiProperty({
    description: 'Guardian ID',
    example: 'clrx1234567890abcdef'
  })
  id: string;

  @ApiProperty({
    description: 'Guardian role',
    enum: GuardianRole,
    example: GuardianRole.CEO
  })
  role: GuardianRole;

  @ApiProperty({
    description: 'Guardian name',
    example: 'João Silva Santos'
  })
  name: string;

  @ApiProperty({
    description: 'Guardian email',
    example: 'ceo@stellarcustody.com'
  })
  email: string;

  @ApiProperty({
    description: 'Guardian phone',
    example: '+5511999999001'
  })
  phone: string;

  @ApiProperty({
    description: 'Guardian level (1-3)',
    example: 3
  })
  level: number;

  @ApiProperty({
    description: 'Active status',
    example: true
  })
  isActive: boolean;

  @ApiProperty({
    description: 'TOTP verified status',
    example: true
  })
  totpVerified: boolean;

  @ApiProperty({
    description: 'HSM partition activated',
    example: true
  })
  hsmActivated: boolean;

  @ApiProperty({
    description: 'Stellar public key',
    example: 'GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT'
  })
  stellarPublicKey: string;

  @ApiProperty({
    description: 'Daily transaction limit (XLM)',
    example: '10000.0000000'
  })
  dailyLimit: string;

  @ApiProperty({
    description: 'Monthly transaction limit (XLM)',
    example: '100000.0000000'
  })
  monthlyLimit: string;

  @ApiProperty({
    description: 'Total approvals made',
    example: 42
  })
  totalApprovals: number;

  @ApiProperty({
    description: 'Last approval timestamp',
    example: '2024-12-14T10:30:00Z',
    required: false
  })
  lastApprovalAt?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-12-01T09:00:00Z'
  })
  createdAt: string;
}

// ==================== GUARDIAN TOTP SETUP ====================

export class GuardianTOTPSetupDto {
  @ApiProperty({
    description: 'TOTP secret (base32 encoded)',
    example: 'JBSWY3DPEHPK3PXP'
  })
  secret: string;

  @ApiProperty({
    description: 'QR code data URL for Google Authenticator',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
  })
  qrCodeUrl: string;

  @ApiProperty({
    description: 'Backup codes for emergency access',
    example: ['12345678', '87654321', '11223344'],
    type: [String]
  })
  backupCodes: string[];

  @ApiProperty({
    description: 'Manual entry key for authenticator apps',
    example: 'JBSWY3DPEHPK3PXP'
  })
  manualEntryKey: string;

  @ApiProperty({
    description: 'HSM partition ID',
    example: 'user_abc123def456'
  })
  hsmPartitionId: string;
}
