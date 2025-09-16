import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsDecimal,
  IsEnum,
  IsOptional,
  IsBoolean,
  Matches,
  IsUUID,
} from "class-validator";
import { Transform } from "class-transformer";

/**
 * 💰 Transaction DTOs - Multi-Sig Transaction System
 *
 * Based on schema.mdc Transaction model and threshold schemes
 */

export enum TxStatus {
  PENDING = "PENDING",
  AWAITING_APPROVAL = "AWAITING_APPROVAL",
  APPROVED = "APPROVED",
  EXECUTING = "EXECUTING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum TxType {
  PAYMENT = "PAYMENT",
  REBALANCE = "REBALANCE",
  WITHDRAWAL = "WITHDRAWAL",
  DEPOSIT = "DEPOSIT",
}

export enum ThresholdSchemeType {
  LOW_VALUE_2_OF_3 = "LOW_VALUE_2_OF_3", // < 1,000 XLM
  HIGH_VALUE_2_OF_3 = "HIGH_VALUE_2_OF_3", // 1,000 - 10,000 XLM
  CRITICAL_3_OF_3 = "CRITICAL_3_OF_3", // > 10,000 XLM or Cold Wallet
}

// ==================== TRANSACTION CREATION ====================

export class CreateTransactionDto {
  @ApiProperty({
    description: "Source wallet ID (Hot or Cold)",
    example: "clrx1234567890wallet1",
  })
  @IsString()
  fromWalletId: string;

  @ApiProperty({
    description: "Destination Stellar address",
    example: "GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF",
    pattern: "^G[A-Z2-7]{55}$",
  })
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/, { message: "Invalid Stellar address format" })
  toAddress: string;

  @ApiProperty({
    description: "Transaction amount in XLM",
    example: "1000.5000000",
    pattern: "^\\d+(\\.\\d{1,7})?$",
  })
  @IsDecimal({ decimal_digits: "1,7" })
  @Transform(({ value }) => parseFloat(value).toFixed(7))
  amount: string;

  @ApiProperty({
    description: "Transaction memo (optional)",
    example: "Payment for services",
    maxLength: 28,
    required: false,
  })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiProperty({
    description: "Transaction type",
    enum: TxType,
    example: TxType.PAYMENT,
  })
  @IsEnum(TxType)
  txType: TxType;
}

// ==================== TRANSACTION APPROVAL ====================

export class ApproveTransactionDto {
  @ApiProperty({
    description: "Transaction ID to approve",
    example: "clrx1234567890trans1",
  })
  @IsString()
  transactionId: string;

  @ApiProperty({
    description: "Guardian ID making the approval",
    example: "clrx1234567890guard1",
  })
  @IsString()
  guardianId: string;

  @ApiProperty({
    description: "Challenge response code (OCRA-like)",
    example: "123456",
    pattern: "^[0-9]{6}$",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: "Challenge response must be 6 digits" })
  challengeResponse?: string;

  @ApiProperty({
    description: "TOTP code (fallback method)",
    example: "654321",
    pattern: "^[0-9]{6}$",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: "TOTP code must be 6 digits" })
  totpCode?: string;

  @ApiProperty({
    description: "Authentication method used",
    enum: ["OCRA_LIKE", "TOTP_FALLBACK"],
    example: "OCRA_LIKE",
  })
  @IsEnum(["OCRA_LIKE", "TOTP_FALLBACK"])
  authMethod: "OCRA_LIKE" | "TOTP_FALLBACK";
}

// ==================== TRANSACTION RESPONSE ====================

export class TransactionResponseDto {
  @ApiProperty({
    description: "Transaction ID",
    example: "clrx1234567890trans1",
  })
  id: string;

  @ApiProperty({
    description: "Stellar transaction hash (when executed)",
    example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    required: false,
  })
  stellarHash?: string;

  @ApiProperty({
    description: "Source wallet information",
    type: "object",
  })
  fromWallet: {
    id: string;
    publicKey: string;
    walletType: "HOT" | "COLD";
    derivationPath: string;
  };

  @ApiProperty({
    description: "Destination address",
    example: "GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF",
  })
  toAddress: string;

  @ApiProperty({
    description: "Transaction amount in XLM",
    example: "1000.5000000",
  })
  amount: string;

  @ApiProperty({
    description: "Transaction memo",
    example: "Payment for services",
    required: false,
  })
  memo?: string;

  @ApiProperty({
    description: "Transaction status",
    enum: TxStatus,
    example: TxStatus.AWAITING_APPROVAL,
  })
  status: TxStatus;

  @ApiProperty({
    description: "Transaction type",
    enum: TxType,
    example: TxType.PAYMENT,
  })
  txType: TxType;

  @ApiProperty({
    description: "Whether transaction requires guardian approval",
    example: true,
  })
  requiresApproval: boolean;

  @ApiProperty({
    description: "Number of required approvals",
    example: 2,
  })
  requiredApprovals: number;

  @ApiProperty({
    description: "Current approvals",
    type: "array",
    items: {
      type: "object",
      properties: {
        guardianId: { type: "string" },
        guardianRole: { type: "string" },
        approvedAt: { type: "string" },
        authMethod: { type: "string" },
      },
    },
  })
  approvals: Array<{
    guardianId: string;
    guardianRole: string;
    approvedAt: string;
    authMethod: string;
  }>;

  @ApiProperty({
    description: "Threshold scheme being used",
    enum: ThresholdSchemeType,
    example: ThresholdSchemeType.HIGH_VALUE_2_OF_3,
    required: false,
  })
  thresholdScheme?: ThresholdSchemeType;

  @ApiProperty({
    description: "Challenge information (OCRA-like)",
    type: "object",
    required: false,
    properties: {
      challengeHash: { type: "string", example: "A1B2C3D4E5F6G7H8" },
      expiresAt: { type: "string", example: "2025-09-14T10:35:00Z" },
      isActive: { type: "boolean", example: true },
    },
  })
  challenge?: {
    challengeHash: string;
    expiresAt: string;
    isActive: boolean;
  };

  @ApiProperty({
    description: "Creation timestamp",
    example: "2025-09-14T10:30:00Z",
  })
  createdAt: string;

  @ApiProperty({
    description: "Execution timestamp",
    example: "2025-09-14T10:35:00Z",
    required: false,
  })
  executedAt?: string;
}

// ==================== CHALLENGE DTOs ====================

export class GenerateChallengeDto {
  @ApiProperty({
    description: "Transaction ID to generate challenge for",
    example: "clrx1234567890trans1",
  })
  @IsString()
  transactionId: string;
}

export class ChallengeResponseDto {
  @ApiProperty({
    description: "Challenge hash (shown to guardian)",
    example: "A1B2C3D4E5F6G7H8",
  })
  challengeHash: string;

  @ApiProperty({
    description: "Challenge expiration time",
    example: "2025-09-14T10:35:00Z",
  })
  expiresAt: string;

  @ApiProperty({
    description: "Transaction context",
    type: "object",
  })
  transactionData: {
    amount: string;
    toAddress: string;
    txType: string;
  };
}

export class ValidateChallengeDto {
  @ApiProperty({
    description: "Challenge hash",
    example: "A1B2C3D4E5F6G7H8",
  })
  @IsString()
  challengeHash: string;

  @ApiProperty({
    description: "Guardian response code",
    example: "123456",
    pattern: "^[0-9]{6}$",
  })
  @IsString()
  @Matches(/^[0-9]{6}$/)
  responseCode: string;

  @ApiProperty({
    description: "Guardian ID",
    example: "clrx1234567890guard1",
  })
  @IsString()
  guardianId: string;
}

// ==================== TRANSACTION QUERIES ====================

export class ListTransactionsDto {
  @ApiProperty({
    description: "Transaction status filter",
    enum: TxStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(TxStatus)
  status?: TxStatus;

  @ApiProperty({
    description: "Transaction type filter",
    enum: TxType,
    required: false,
  })
  @IsOptional()
  @IsEnum(TxType)
  txType?: TxType;

  @ApiProperty({
    description: "Page number (1-based)",
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @ApiProperty({
    description: "Items per page",
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => Math.min(parseInt(value) || 20, 100))
  limit?: number = 20;
}
