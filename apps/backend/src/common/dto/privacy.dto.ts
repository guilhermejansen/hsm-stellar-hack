import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum, IsNumber, Min, Max } from 'class-validator';

/**
 * 🛡️ Privacy DTOs - Ephemeral Transaction Keys & Privacy Protection
 * 
 * Following transaction-privacy.mdc implementation:
 * - Ephemeral transaction keys (m/0'/0'/N')
 * - Privacy protection reports
 * - Address correlation prevention
 * - HSM key lifecycle management
 */

// ==================== EPHEMERAL TRANSACTION KEY ====================

export class EphemeralKeyResponseDto {
  @ApiProperty({
    description: 'Ephemeral transaction key ID',
    example: 'clrx1234567890ephkey1'
  })
  transactionKeyId: string;

  @ApiProperty({
    description: 'NEW Stellar address generated for this transaction (privacy protection)',
    example: 'GXYZ9876543210ABCDEFGHIJKLMNOPQRSTUVWXYZ9876543210ABCDEF'
  })
  ephemeralAddress: string;

  @ApiProperty({
    description: 'BIP32 derivation path for ephemeral key',
    example: "m/0'/0'/42'",
    pattern: "^m/0'/0'/\\d+'$"
  })
  derivationPath: string;

  @ApiProperty({
    description: 'HSM key ID (temporary)',
    example: 'ephemeral_tx_42_abc123def456'
  })
  hsmKeyId: string;

  @ApiProperty({
    description: 'Key expiration time (1 hour)',
    example: '2024-12-14T11:30:00Z'
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Key is ephemeral (temporary)',
    example: true
  })
  isEphemeral: boolean;

  @ApiProperty({
    description: 'Transaction index for this wallet',
    example: 42
  })
  transactionIndex: number;

  @ApiProperty({
    description: 'Privacy protection benefits',
    type: 'object',
    properties: {
      correlationPrevented: { type: 'boolean', example: true },
      addressUnique: { type: 'boolean', example: true },
      traceabilityImpossible: { type: 'boolean', example: true }
    }
  })
  privacyBenefits: {
    correlationPrevented: boolean;
    addressUnique: boolean;
    traceabilityImpossible: boolean;
  };
}

// ==================== PRIVACY REPORT ====================

export class TransactionPrivacyReportDto {
  @ApiProperty({
    description: 'Privacy report summary',
    type: 'object',
    properties: {
      totalTransactions: { type: 'number', example: 247 },
      ephemeralTransactions: { type: 'number', example: 243 },
      uniqueAddressesGenerated: { type: 'number', example: 243 },
      privacyCompliance: { type: 'number', example: 98.38 },
      correlationRisk: { type: 'string', example: 'LOW', enum: ['LOW', 'MEDIUM', 'HIGH'] }
    }
  })
  summary: {
    totalTransactions: number;
    ephemeralTransactions: number;
    uniqueAddressesGenerated: number;
    privacyCompliance: number;
    correlationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  };

  @ApiProperty({
    description: 'Privacy protection details',
    type: 'object',
    properties: {
      addressReuse: { type: 'number', example: 4 },
      correlationPrevention: { type: 'number', example: 243 },
      privacyBenefits: { 
        type: 'array', 
        items: { type: 'string' },
        example: [
          'External observers cannot correlate transactions',
          'Each transaction appears from random address',
          'Wallet balances cannot be traced'
        ]
      }
    }
  })
  privacy: {
    addressReuse: number;
    correlationPrevention: number;
    privacyBenefits: string[];
  };

  @ApiProperty({
    description: 'Privacy recommendations',
    type: 'array',
    items: { type: 'string' },
    example: [
      '✅ Excellent privacy protection maintained',
      '🎯 All transactions using ephemeral keys',
      '🛡️ Complete correlation prevention active'
    ]
  })
  recommendations: string[];
}

// ==================== EPHEMERAL KEY STATISTICS ====================

export class EphemeralKeyStatsDto {
  @ApiProperty({
    description: 'Total ephemeral keys generated',
    example: 156
  })
  total: number;

  @ApiProperty({
    description: 'Currently active ephemeral keys',
    example: 3
  })
  active: number;

  @ApiProperty({
    description: 'Used ephemeral keys',
    example: 142
  })
  used: number;

  @ApiProperty({
    description: 'Expired/destroyed ephemeral keys',
    example: 139
  })
  expired: number;

  @ApiProperty({
    description: 'Keys generated in last 24 hours',
    example: 8
  })
  recent24h: number;

  @ApiProperty({
    description: 'Key usage rate percentage',
    example: 91.03
  })
  usageRate: number;

  @ApiProperty({
    description: 'Privacy protection score',
    example: 89.10
  })
  privacyScore: number;

  @ApiProperty({
    description: 'Privacy protection level',
    example: 'EXCELLENT',
    enum: ['EXCELLENT', 'GOOD', 'NEEDS_IMPROVEMENT']
  })
  privacyProtection: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT';
}

// ==================== TRANSACTION WITH PRIVACY ====================

export class TransactionWithPrivacyDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: 'clrx1234567890trans1'
  })
  id: string;

  @ApiProperty({
    description: 'Stellar transaction hash (when executed)',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
    required: false
  })
  stellarHash?: string;

  @ApiProperty({
    description: 'Source wallet information',
    type: 'object'
  })
  fromWallet: {
    id: string;
    publicKey: string;
    walletType: 'HOT' | 'COLD';
    derivationPath: string;
  };

  @ApiProperty({
    description: 'Destination address',
    example: 'GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF'
  })
  toAddress: string;

  @ApiProperty({
    description: 'Transaction amount in XLM',
    example: '5000.0000000'
  })
  amount: string;

  @ApiProperty({
    description: 'Transaction status',
    enum: ['PENDING', 'AWAITING_APPROVAL', 'SUCCESS', 'FAILED'],
    example: 'SUCCESS'
  })
  status: string;

  @ApiProperty({
    description: 'Privacy protection information (ephemeral key)',
    type: 'object',
    properties: {
      ephemeralAddress: { 
        type: 'string', 
        example: 'GXYZ9876543210ABCDEFGHIJKLMNOPQRSTUVWXYZ9876543210ABCD',
        description: 'NEW address generated for this transaction'
      },
      derivationPath: { 
        type: 'string', 
        example: "m/0'/0'/42'",
        description: 'BIP32 path for ephemeral key'
      },
      transactionIndex: { 
        type: 'number', 
        example: 42,
        description: 'Sequential index for this wallet'
      },
      isPrivacyProtected: { 
        type: 'boolean', 
        example: true,
        description: 'Transaction uses ephemeral key'
      },
      keyStatus: {
        type: 'object',
        properties: {
          isUsed: { type: 'boolean', example: true },
          isExpired: { type: 'boolean', example: true },
          destroyedAt: { type: 'string', example: '2024-12-14T10:35:00Z' },
          expiresAt: { type: 'string', example: '2024-12-14T10:35:00Z' }
        }
      },
      privacyBenefits: {
        type: 'object',
        properties: {
          correlationPrevented: { type: 'boolean', example: true },
          addressUnique: { type: 'boolean', example: true },
          traceabilityImpossible: { type: 'boolean', example: true }
        }
      }
    },
    required: false
  })
  privacyProtection?: {
    ephemeralAddress: string;
    derivationPath: string;
    transactionIndex: number;
    isPrivacyProtected: boolean;
    keyStatus: {
      isUsed: boolean;
      isExpired: boolean;
      destroyedAt?: string;
      expiresAt: string;
    };
    privacyBenefits: {
      correlationPrevented: boolean;
      addressUnique: boolean;
      traceabilityImpossible: boolean;
    };
  };

  @ApiProperty({
    description: 'Guardian approvals',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        guardianRole: { type: 'string', example: 'CEO' },
        approvedAt: { type: 'string', example: '2024-12-14T10:25:00Z' },
        authMethod: { type: 'string', example: 'OCRA_LIKE' }
      }
    }
  })
  approvals: Array<{
    guardianRole: string;
    approvedAt: string;
    authMethod?: string;
  }>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-12-14T10:20:00Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Execution timestamp',
    example: '2024-12-14T10:30:00Z',
    required: false
  })
  executedAt?: string;
}

// ==================== SESSION MANAGEMENT ====================

export class SessionInfoDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'session_abc123def456'
  })
  sessionId: string;

  @ApiProperty({
    description: 'User ID',
    example: 'clrx1234567890user01'
  })
  userId: string;

  @ApiProperty({
    description: 'Session creation time',
    example: '2024-12-14T10:20:00Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last activity time',
    example: '2024-12-14T10:30:00Z'
  })
  lastActivity: string;

  @ApiProperty({
    description: 'IP address',
    example: '192.168.1.100'
  })
  ipAddress: string;

  @ApiProperty({
    description: 'User agent',
    example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...'
  })
  userAgent: string;
}
