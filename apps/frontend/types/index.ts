/**
 * Type definitions for Stellar Custody MVP Frontend
 * 
 * Based on backend API responses and Prisma schema
 */

// ==================== AUTHENTICATION TYPES ====================

export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'CEO' | 'CFO' | 'CTO';
  isGuardian: boolean;
  hsmActivated: boolean;
  level?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TOTPVerification {
  totpCode: string;
  action?: string;
}

// ==================== GUARDIAN TYPES ====================

export interface Guardian {
  id: string;
  role: 'CEO' | 'CFO' | 'CTO';
  name: string;
  email: string;
  phone: string;
  level: number;
  isActive: boolean;
  totpVerified: boolean;
  hsmActivated: boolean;
  stellarPublicKey: string;
  dailyLimit: string;
  monthlyLimit: string;
  totalApprovals: number;
  lastApprovalAt?: string;
  createdAt: string;
}

export interface GuardianRegistration {
  name: string;
  email: string;
  phone: string;
  role: 'CEO' | 'CFO' | 'CTO';
  level: number;
  kycData: {
    fullName: string;
    documentId: string;
    address: string;
    dateOfBirth: string;
    nationality: string;
    occupation: string;
  };
}

export interface GuardianStats {
  guardians: {
    total: number;
    active: number;
    verified: number;
    hsmActivated: number;
    completionRate: number;
  };
  approvals: {
    total: number;
    avgPerGuardian: number;
  };
  systemHealth: {
    minGuardiansAvailable: boolean;
    activeCount: number;
    minimumRequired: number;
    roles: string[];
  };
}

// ==================== WALLET TYPES ====================

export interface Wallet {
  id: string;
  publicKey: string;
  derivationPath: string;
  walletType: 'HOT' | 'COLD';
  balance: string;
  reservedBalance: string;
  maxBalance?: string;
  hsmKeyName: string;
  hsmPartitionId: string;
  isHSMProtected: boolean;
  requiresTOTP: boolean;
  parentWallet?: {
    id: string;
    publicKey: string;
    walletType: string;
  };
  childWallets: Array<{
    id: string;
    publicKey: string;
    walletType: string;
  }>;
  stellarBalance?: string;
  createdAt: string;
}

export interface WalletBalances {
  total: string;
  cold: {
    balance: string;
    percentage: number;
    address: string;
    derivationPath: string;
  };
  hot: {
    balance: string;
    percentage: number;
    address: string;
    derivationPath: string;
    parentAddress: string;
  };
  needsRebalancing: boolean;
}

// ==================== TRANSACTION TYPES ====================

export interface Transaction {
  id: string;
  stellarHash?: string;
  fromWallet: {
    id: string;
    publicKey: string;
    walletType: 'HOT' | 'COLD';
    derivationPath: string;
  };
  toAddress: string;
  amount: string;
  memo?: string;
  status: 'PENDING' | 'AWAITING_APPROVAL' | 'APPROVED' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  txType: 'PAYMENT' | 'REBALANCE' | 'WITHDRAWAL' | 'DEPOSIT';
  requiresApproval: boolean;
  requiredApprovals: number;
  approvals: Array<{
    guardianId: string;
    guardianRole: string;
    approvedAt: string;
    authMethod: string;
  }>;
  thresholdScheme?: 'LOW_VALUE_2_OF_3' | 'HIGH_VALUE_2_OF_3' | 'CRITICAL_3_OF_3';
  challenge?: {
    challengeHash: string;
    expiresAt: string;
    isActive: boolean;
  };
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
  createdAt: string;
  executedAt?: string;
}

export interface CreateTransactionRequest {
  fromWalletId: string;
  toAddress: string;
  amount: string;
  memo?: string;
  txType: 'PAYMENT' | 'REBALANCE' | 'WITHDRAWAL' | 'DEPOSIT';
}

export interface ApproveTransactionRequest {
  transactionId: string;
  guardianId: string;
  challengeResponse?: string;
  totpCode?: string;
  authMethod: 'OCRA_LIKE' | 'TOTP_FALLBACK';
}

export interface TransactionStats {
  transactions: {
    total: number;
    pending: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  volume: {
    totalProcessed: string;
    last24Hours?: string;
  };
  privacy?: {
    ephemeralKeysGenerated: number;
    ephemeralKeysUsed: number;
    ephemeralKeysDestroyed: number;
    privacyScore: number;
    privacyProtectedTransactions: number;
    correlationProtection: string;
  };
}

// ==================== CHALLENGE TYPES ====================

export interface Challenge {
  challengeHash: string;
  expiresAt: string;
  transactionData: {
    amount: string;
    toAddress: string;
    txType: string;
  };
  instructions: string[];
}

export interface ChallengeValidation {
  challengeHash: string;
  responseCode: string;
  guardianId: string;
  transactionId: string;
}

// ==================== PRIVACY TYPES ====================

export interface EphemeralKeyStats {
  total: number;
  active: number;
  used: number;
  expired: number;
  recent24h: number;
  usageRate: number;
  privacyScore: number;
  privacyProtection: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT';
}

export interface TransactionPrivacyReport {
  summary: {
    totalTransactions: number;
    ephemeralTransactions: number;
    uniqueAddressesGenerated: number;
    privacyCompliance: number;
    correlationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  privacy: {
    addressReuse: number;
    correlationPrevention: number;
    privacyBenefits: string[];
  };
  recommendations: string[];
}

// ==================== MONITORING TYPES ====================

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  mtlsEnabled: boolean;
  components: {
    database: {
      status: string;
      latency: number;
    };
    hsm: {
      status: string;
      latency: number;
      partitions: number;
    };
    stellar: {
      status: string;
      network: string;
      latestLedger: number;
    };
    whatsapp: {
      status: string;
      latency: number;
    };
  };
}

export interface PerformanceMetrics {
  performance: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
    latency: {
      average: number;
      p95: number;
      p99: number;
    };
    hsm: {
      operationsPerMinute: number;
      averageLatency: number;
      errorRate: number;
    };
  };
  timestamp: string;
}

export interface SecurityMetrics {
  securityEvents: {
    totalEvents: number;
    criticalEvents: number;
    highPriorityEvents: number;
    mediumPriorityEvents: number;
    lowPriorityEvents: number;
  };
  authentication: {
    loginAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    totpVerifications: number;
    totpFailures: number;
  };
  hsm: {
    keyOperations: number;
    ephemeralKeysGenerated: number;
    ephemeralKeysDestroyed: number;
    keyExpirations: number;
  };
  timestamp: string;
}

// ==================== FORM TYPES ====================

export interface FormState {
  isSubmitting: boolean;
  errors: Record<string, string>;
  success: boolean;
  message?: string;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ==================== COMPONENT PROPS TYPES ====================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface FilterOption {
  label: string;
  value: string;
}

// ==================== NOTIFICATION TYPES ====================

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// ==================== THEME TYPES ====================

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  theme: Theme;
  primaryColor: string;
  accentColor: string;
  corporateMode: boolean;
}