/**
 * 📋 Common Interfaces - Stellar Custody MVP
 * 
 * Type definitions based on Prisma schema and business requirements
 */

// ==================== HSM DINAMO INTERFACES ====================

export interface HSMConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  partition: string;
  timeout: number;
}

export interface HSMPartitionInfo {
  partitionId: string;
  aesKeyId: string;
  masterKeyId: string;
  isActive: boolean;
}

export interface HSMKeyInfo {
  keyId: string;
  keyName: string;
  algorithm: string;
  derivationPath: string;
  publicKey: string;
  partition: string;
}

export interface HSMSignatureRequest {
  keyId: string;
  data: Buffer;
  algorithm: 'ED25519';
  releaseId?: string;
  challenge?: string;
}

export interface HSMKeyReleaseAuth {
  success: boolean;
  releaseId: string;
  partitionId: string;
  keyId: string;
  authorizedAt: Date;
  expiresAt: Date;
}

// ==================== WALLET INTERFACES ====================

export interface WalletCreationRequest {
  userId: string;
  walletType: 'HOT' | 'COLD';
  parentWalletId?: string;
  derivationPath: string;
}

export interface WalletHierarchy {
  coldWallet: {
    id: string;
    address: string;
    derivationPath: string; // m/0'
    balance: string;
    percentage: number; // 95
  };
  hotWallet: {
    id: string;
    address: string;
    derivationPath: string; // m/0'/0'
    balance: string;
    percentage: number; // 5
    parentWalletId: string;
  };
}

// ==================== GUARDIAN INTERFACES ====================

export interface GuardianRegistration {
  name: string;
  email: string;
  phone: string;
  role: 'CEO' | 'CFO' | 'CTO';
  level: 1 | 2 | 3;
  
  // KYC Information
  kycData: {
    fullName: string;
    documentId: string;
    address: string;
    dateOfBirth: string;
    nationality: string;
    occupation: string;
  };
}

export interface GuardianTOTPSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
  hsmPartitionId: string;
}

// ==================== CHALLENGE INTERFACES ====================

export interface ChallengeRequest {
  transactionId: string;
  amount: string;
  toAddress: string;
  fromWalletType: 'HOT' | 'COLD';
  guardianId: string;
}

export interface ChallengeData {
  challengeHash: string;        // Short hash for guardian (16 chars)
  fullChallenge: string;        // Complete challenge string
  challengeData: {
    transactionId: string;
    amount: string;
    toAddress: string;
    fromWallet: string;
    timestamp: number;
    nonce: string;
  };
  expiresAt: Date;
}

export interface ChallengeResponse {
  challengeHash: string;
  responseCode: string;
  authMethod: 'OCRA_LIKE' | 'TOTP_FALLBACK';
  guardianId: string;
}

// ==================== TRANSACTION INTERFACES ====================

export interface TransactionCreationRequest {
  fromWalletId: string;
  toAddress: string;
  amount: string;
  memo?: string;
  txType: 'PAYMENT' | 'REBALANCE' | 'WITHDRAWAL' | 'DEPOSIT';
}

export interface TransactionApprovalRequest {
  transactionId: string;
  guardianId: string;
  challengeResponse?: string;
  totpCode?: string;
  authMethod: 'OCRA_LIKE' | 'TOTP_FALLBACK';
}

export interface ThresholdConfiguration {
  type: 'LOW_VALUE_2_OF_3' | 'HIGH_VALUE_2_OF_3' | 'CRITICAL_3_OF_3';
  threshold: number;
  totalParties: number;
  challengeRequired: boolean;
  maxAmount?: number;
}

// ==================== WHATSAPP INTERFACES ====================

export interface WhatsAppMessage {
  phone: string;
  message: string;
  type: 'text' | 'button' | 'sticker' | 'image';
  metadata?: {
    transactionId?: string;
    challengeHash?: string;
    approvalUrl?: string;
    guardianRole?: string;
  };
}

export interface WhatsAppApprovalButton {
  guardianPhone: string;
  transactionId: string;
  amount: string;
  challengeHash: string;
  approvalUrl: string;
  guardianRole: string;
}

// ==================== STELLAR INTERFACES ====================

export interface StellarTransactionRequest {
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
  memo?: string;
  sequence?: string;
}

export interface StellarTransactionResult {
  hash: string;
  successful: boolean;
  ledger: number;
  createdAt: string;
  operationCount: number;
  envelope: string;
}

// ==================== KYC INTERFACES ====================

export interface KYCSubmission {
  personalInfo: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    occupation: string;
  };
  documents: {
    idDocument: string;        // Document hash
    proofOfAddress: string;    // Document hash
    additionalDocs: string[];  // Additional document hashes
  };
  contactInfo: {
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
}

export interface KYCVerificationResult {
  status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_UPDATE';
  reason?: string;
  requiredUpdates?: string[];
  hsmPartitionCreated: boolean;
  partitionId?: string;
  userId: string;
}

// ==================== AUDIT INTERFACES ====================

export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  result: 'success' | 'failure';
  metadata?: any;
  
  // Security specific
  authMethod?: string;
  hsmPartitionUsed?: string;
  challengeHash?: string;
  certificateUsed?: string;
}

// ==================== API RESPONSE INTERFACES ====================

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
    requestId: string;
    version: string;
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

// ==================== ERROR INTERFACES ====================

export interface SecurityError {
  type: 'HSM_ERROR' | 'TOTP_ERROR' | 'CHALLENGE_ERROR' | 'MTLS_ERROR';
  message: string;
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  additionalInfo?: any;
}

export interface HSMError extends SecurityError {
  type: 'HSM_ERROR';
  hsmOperation: string;
  partitionId?: string;
  keyId?: string;
}

export interface ChallengeError extends SecurityError {
  type: 'CHALLENGE_ERROR';
  challengeHash?: string;
  expiresAt?: Date;
  attemptsRemaining?: number;
}
