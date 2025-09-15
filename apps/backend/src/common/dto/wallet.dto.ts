import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsDecimal, IsBoolean, IsOptional, IsUUID, Matches } from 'class-validator';

/**
 * 💰 Wallet DTOs - BIP32 HD Wallet System
 * 
 * Based on schema.mdc Wallet model and HSM DINAMO hierarchy
 * Cold Wallet (Master): m/0' - 95% of funds
 * Hot Wallet (Derived): m/0'/0' - 5% of funds
 */

export enum WalletType {
  HOT = 'HOT',
  COLD = 'COLD'
}

// ==================== WALLET CREATION ====================

export class CreateWalletDto {
  @ApiProperty({
    description: 'User ID who owns the wallet',
    example: 'clrx1234567890user01'
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Wallet type (Hot or Cold)',
    enum: WalletType,
    example: WalletType.COLD
  })
  @IsEnum(WalletType)
  walletType: WalletType;

  @ApiProperty({
    description: 'BIP32 derivation path',
    example: "m/0'",
    pattern: "^m(/\\d+'?)*$"
  })
  @IsString()
  derivationPath: string;

  @ApiProperty({
    description: 'Parent wallet ID (for Hot wallet derived from Cold)',
    example: 'clrx1234567890wallet1',
    required: false
  })
  @IsOptional()
  @IsUUID()
  parentWalletId?: string;
}

// ==================== WALLET RESPONSE ====================

export class WalletResponseDto {
  @ApiProperty({
    description: 'Wallet ID',
    example: 'clrx1234567890wallet1'
  })
  id: string;

  @ApiProperty({
    description: 'Stellar public key',
    example: 'GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM'
  })
  publicKey: string;

  @ApiProperty({
    description: 'BIP32 derivation path',
    example: "m/0'"
  })
  derivationPath: string;

  @ApiProperty({
    description: 'Wallet type',
    enum: WalletType,
    example: WalletType.COLD
  })
  walletType: WalletType;

  @ApiProperty({
    description: 'Current balance in XLM',
    example: '95000.0000000'
  })
  balance: string;

  @ApiProperty({
    description: 'Reserved balance for pending transactions',
    example: '500.0000000'
  })
  reservedBalance: string;

  @ApiProperty({
    description: 'Maximum balance limit (percentage based)',
    example: '95000.0000000',
    required: false
  })
  maxBalance?: string;

  @ApiProperty({
    description: 'HSM key name reference',
    example: 'stellar_custody_cold_m_0_hardened'
  })
  hsmKeyName: string;

  @ApiProperty({
    description: 'HSM partition ID',
    example: 'user_abc123def456'
  })
  hsmPartitionId: string;

  @ApiProperty({
    description: 'HSM protection status',
    example: true
  })
  isHSMProtected: boolean;

  @ApiProperty({
    description: 'Requires TOTP for transactions',
    example: true
  })
  requiresTOTP: boolean;

  @ApiProperty({
    description: 'Parent wallet (for Hot wallet)',
    type: 'object',
    required: false,
    properties: {
      id: { type: 'string' },
      publicKey: { type: 'string' },
      walletType: { type: 'string' }
    }
  })
  parentWallet?: {
    id: string;
    publicKey: string;
    walletType: WalletType;
  };

  @ApiProperty({
    description: 'Child wallets (for Cold wallet)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        publicKey: { type: 'string' },
        walletType: { type: 'string' }
      }
    }
  })
  childWallets: Array<{
    id: string;
    publicKey: string;
    walletType: WalletType;
  }>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-12-14T10:30:00Z'
  })
  createdAt: string;
}

// ==================== WALLET REBALANCING ====================

export class RebalanceWalletsDto {
  @ApiProperty({
    description: 'Guardian ID authorizing rebalance',
    example: 'clrx1234567890guard1'
  })
  @IsUUID()
  guardianId: string;

  @ApiProperty({
    description: 'TOTP code for authorization',
    example: '123456',
    pattern: '^[0-9]{6}$'
  })
  @IsString()
  @Matches(/^[0-9]{6}$/)
  totpCode: string;

  @ApiProperty({
    description: 'Force rebalance even if within acceptable range',
    example: false,
    default: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  forceRebalance?: boolean = false;
}

export class RebalanceResultDto {
  @ApiProperty({
    description: 'Rebalance operation success',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Amount moved from Hot to Cold',
    example: '1000.0000000'
  })
  amountRebalanced: string;

  @ApiProperty({
    description: 'Direction of rebalance',
    example: 'HOT_TO_COLD'
  })
  direction: 'HOT_TO_COLD' | 'COLD_TO_HOT';

  @ApiProperty({
    description: 'New wallet balances after rebalance'
  })
  newBalances: {
    hot: {
      balance: string;
      percentage: number;
    };
    cold: {
      balance: string;
      percentage: number;
    };
  };

  @ApiProperty({
    description: 'Stellar transaction hash',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0'
  })
  stellarHash: string;

  @ApiProperty({
    description: 'Timestamp of rebalance',
    example: '2024-12-14T10:35:00Z'
  })
  executedAt: string;
}

// ==================== WALLET QUERIES ====================

export class GetWalletBalanceDto {
  @ApiProperty({
    description: 'Wallet ID',
    example: 'clrx1234567890wallet1'
  })
  @IsUUID()
  walletId: string;
}

export class WalletBalanceResponseDto {
  @ApiProperty({
    description: 'Wallet ID',
    example: 'clrx1234567890wallet1'
  })
  id: string;

  @ApiProperty({
    description: 'Wallet type',
    enum: WalletType,
    example: WalletType.COLD
  })
  walletType: WalletType;

  @ApiProperty({
    description: 'Available balance in XLM',
    example: '94500.0000000'
  })
  availableBalance: string;

  @ApiProperty({
    description: 'Reserved balance in XLM',
    example: '500.0000000'
  })
  reservedBalance: string;

  @ApiProperty({
    description: 'Total balance in XLM',
    example: '95000.0000000'
  })
  totalBalance: string;

  @ApiProperty({
    description: 'Percentage of total funds',
    example: 95.0
  })
  percentage: number;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-12-14T10:30:00Z'
  })
  lastUpdated: string;
}
