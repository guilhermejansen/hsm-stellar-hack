import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsEmail, 
  IsPhoneNumber, 
  IsDateString, 
  IsOptional, 
  ValidateNested, 
  IsArray,
  MinLength,
  MaxLength,
  IsEnum
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * 📋 KYC DTOs - Know Your Customer Processing
 * 
 * Following api-integrations.mdc KYC workflow:
 * - Complete KYC submission with HSM partition creation
 * - Document verification
 * - PII encryption with HSM Svault Module
 * - Compliance tracking
 */

export enum KYCStatus {
  PENDING = 'PENDING',
  DOCUMENTS_SUBMITTED = 'DOCUMENTS_SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REQUIRES_UPDATE = 'REQUIRES_UPDATE'
}

// ==================== KYC SUBMISSION ====================

export class PersonalInfoDto {
  @ApiProperty({
    description: 'Full legal name',
    example: 'João Silva Santos',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @ApiProperty({
    description: 'Date of birth (ISO format)',
    example: '1980-01-15',
    format: 'date'
  })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({
    description: 'Nationality',
    example: 'Brazilian',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nationality: string;

  @ApiProperty({
    description: 'Occupation',
    example: 'Chief Executive Officer',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  occupation: string;
}

export class DocumentsDto {
  @ApiProperty({
    description: 'ID document hash (SHA256)',
    example: 'sha256_id_document_hash_abc123def456789...',
    minLength: 64,
    maxLength: 64
  })
  @IsString()
  @MinLength(64)
  @MaxLength(64)
  idDocument: string;

  @ApiProperty({
    description: 'Proof of address hash (SHA256)',
    example: 'sha256_address_proof_hash_def456ghi789abc...',
    minLength: 64,
    maxLength: 64
  })
  @IsString()
  @MinLength(64)
  @MaxLength(64)
  proofOfAddress: string;

  @ApiProperty({
    description: 'Additional document hashes',
    example: ['sha256_bank_statement_hash_...', 'sha256_utility_bill_hash_...'],
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalDocs?: string[];
}

export class AddressDto {
  @ApiProperty({
    description: 'Street address',
    example: 'Rua das Flores, 123, Apt 45',
    minLength: 5,
    maxLength: 200
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  street: string;

  @ApiProperty({
    description: 'City',
    example: 'São Paulo',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({
    description: 'State/Province',
    example: 'SP',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  state: string;

  @ApiProperty({
    description: 'Country',
    example: 'Brazil',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  country: string;

  @ApiProperty({
    description: 'Postal code',
    example: '01000-000',
    minLength: 5,
    maxLength: 20
  })
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  postalCode: string;
}

export class ContactInfoDto {
  @ApiProperty({
    description: 'Email address',
    example: 'ceo@stellarcustody.com',
    format: 'email'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Phone number (international format)',
    example: '+5511999999001',
    pattern: '^\\+[1-9]\\d{1,14}$'
  })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    description: 'Address information',
    type: AddressDto
  })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

export class KYCSubmissionDto {
  @ApiProperty({
    description: 'Personal information',
    type: PersonalInfoDto
  })
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInfo: PersonalInfoDto;

  @ApiProperty({
    description: 'Document verification',
    type: DocumentsDto
  })
  @ValidateNested()
  @Type(() => DocumentsDto)
  documents: DocumentsDto;

  @ApiProperty({
    description: 'Contact information',
    type: ContactInfoDto
  })
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo: ContactInfoDto;
}

// ==================== KYC RESPONSES ====================

export class KYCSubmissionResponseDto {
  @ApiProperty({
    description: 'User ID created',
    example: 'clrx1234567890user01'
  })
  userId: string;

  @ApiProperty({
    description: 'KYC status',
    enum: KYCStatus,
    example: KYCStatus.UNDER_REVIEW
  })
  kycStatus: KYCStatus;

  @ApiProperty({
    description: 'HSM partition created successfully',
    example: true
  })
  hsmPartitionCreated: boolean;

  @ApiProperty({
    description: 'HSM partition ID',
    example: 'user_abc123def456',
    required: false
  })
  hsmPartitionId?: string;

  @ApiProperty({
    description: 'Next steps for user',
    example: [
      'Wait for KYC approval (1-3 business days)',
      'Check email for approval notification',
      'Complete guardian registration if approved'
    ],
    type: [String]
  })
  nextSteps: string[];
}

export class KYCApprovalDto {
  @ApiProperty({
    description: 'User ID to approve',
    example: 'clrx1234567890user01'
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Admin ID performing approval',
    example: 'clrx1234567890admin1'
  })
  @IsString()
  adminId: string;

  @ApiProperty({
    description: 'Approval reason/notes',
    example: 'All documents verified, identity confirmed',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class KYCRejectionDto {
  @ApiProperty({
    description: 'User ID to reject',
    example: 'clrx1234567890user01'
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Admin ID performing rejection',
    example: 'clrx1234567890admin1'
  })
  @IsString()
  adminId: string;

  @ApiProperty({
    description: 'Rejection reason',
    example: 'Document quality insufficient, please resubmit with clear photos'
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;

  @ApiProperty({
    description: 'Required updates',
    example: ['ID document photo', 'Proof of address'],
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredUpdates?: string[];
}

// ==================== KYC STATISTICS ====================

export class KYCStatsDto {
  @ApiProperty({
    description: 'Pending KYC applications',
    example: 5
  })
  pending: number;

  @ApiProperty({
    description: 'Applications under review',
    example: 12
  })
  underReview: number;

  @ApiProperty({
    description: 'Approved applications',
    example: 234
  })
  approved: number;

  @ApiProperty({
    description: 'Rejected applications',
    example: 18
  })
  rejected: number;

  @ApiProperty({
    description: 'Total applications',
    example: 269
  })
  total: number;

  @ApiProperty({
    description: 'Approval rate percentage',
    example: 86.99
  })
  approvalRate: number;

  @ApiProperty({
    description: 'Average processing time (hours)',
    example: 24.5
  })
  avgProcessingTime: number;
}
