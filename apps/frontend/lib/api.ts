import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'sonner';

/**
 * API Client Configuration for Stellar Custody MVP Backend
 * 
 * Handles:
 * - JWT token management
 * - Request/response interceptors
 * - Error handling
 * - TOTP header injection
 * - Corporate error messages
 */

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token management
let accessToken: string | null = null;
let sessionToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('stellar_access_token', token);
    } else {
      localStorage.removeItem('stellar_access_token');
    }
  }
};

export const setSessionToken = (token: string | null) => {
  sessionToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('stellar_session_token', token);
    } else {
      localStorage.removeItem('stellar_session_token');
    }
  }
};

export const getAccessToken = (): string | null => {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('stellar_access_token');
  }
  return null;
};

export const getSessionToken = (): string | null => {
  if (sessionToken) return sessionToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('stellar_session_token');
  }
  return null;
};

export const clearTokens = () => {
  setAccessToken(null);
  setSessionToken(null);
};

// Request interceptor - Add authentication headers
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken() || getSessionToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add TOTP header if available (for guardian actions)
    const totpCode = config.headers['X-TOTP-Code'];
    if (totpCode) {
      config.headers['X-TOTP-Code'] = totpCode;
    }
    
    // Add challenge response header if available (for OCRA-like)
    const challengeResponse = config.headers['X-Challenge-Response'];
    if (challengeResponse) {
      config.headers['X-Challenge-Response'] = challengeResponse;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // Unauthorized - clear tokens and redirect to login
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      toast.error('Session expired. Please login again.');
    } else if (response?.status === 403) {
      toast.error('Access denied. Insufficient permissions.');
    } else if (response?.status === 429) {
      toast.error('Too many requests. Please try again later.');
    } else if (response?.status >= 500) {
      toast.error('Server error. Please try again or contact support.');
    } else if (response?.data?.error?.message) {
      toast.error(response.data.error.message);
    } else if (error.message) {
      toast.error(error.message);
    }
    
    return Promise.reject(error);
  }
);

// ==================== API TYPES ====================

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

// ==================== AUTHENTICATION API ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  sessionToken: string;
  requiresTOTP: boolean;
  totpChallenge: string;
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
    isGuardian: boolean;
    hsmActivated: boolean;
  };
}

export interface TOTPVerificationRequest {
  totpCode: string;
  action?: string;
}

export interface TOTPVerificationResponse {
  accessToken: string;
  expiresIn: string;
  tokenType: string;
}

export const authAPI = {
  login: (data: LoginRequest): Promise<ApiResponse<LoginResponse>> =>
    apiClient.post('/auth/login', data).then(res => res.data),
    
  verifyTOTP: (data: TOTPVerificationRequest): Promise<ApiResponse<TOTPVerificationResponse>> =>
    apiClient.post('/auth/verify-totp', data).then(res => res.data),
    
  getSessionInfo: (): Promise<ApiResponse<any>> =>
    apiClient.get('/auth/session/info').then(res => res.data),
    
  logout: (): Promise<ApiResponse<any>> =>
    apiClient.post('/auth/logout').then(res => res.data),
};

// ==================== GUARDIAN API ====================

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

export interface RegisterGuardianRequest {
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

export const guardianAPI = {
  getActiveGuardians: (): Promise<ApiResponse<Guardian[]>> =>
    apiClient.get('/guardians').then(res => res.data),
    
  getGuardianById: (id: string): Promise<ApiResponse<Guardian>> =>
    apiClient.get(`/guardians/${id}`).then(res => res.data),
    
  registerGuardian: (data: RegisterGuardianRequest, totpCode: string): Promise<ApiResponse<any>> =>
    apiClient.post('/guardians/register', data, {
      headers: { 'X-TOTP-Code': totpCode }
    }).then(res => res.data),
    
  activateGuardian: (id: string, totpCode: string): Promise<ApiResponse<any>> =>
    apiClient.post(`/guardians/${id}/activate`, { guardianId: id, totpCode }).then(res => res.data),
    
  updateGuardianStatus: (id: string, isActive: boolean, reason?: string, totpCode?: string): Promise<ApiResponse<any>> =>
    apiClient.put(`/guardians/${id}/status`, { isActive, reason }, {
      headers: totpCode ? { 'X-TOTP-Code': totpCode } : {}
    }).then(res => res.data),
    
  getGuardianStats: (): Promise<ApiResponse<any>> =>
    apiClient.get('/guardians/stats/overview').then(res => res.data),
    
  checkMinimumGuardians: (): Promise<ApiResponse<any>> =>
    apiClient.get('/guardians/check/minimum').then(res => res.data),
    
  getGuardianApprovals: (id: string): Promise<ApiResponse<any[]>> =>
    apiClient.get(`/guardians/${id}/approvals`).then(res => res.data),
};

// ==================== WALLET API ====================

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
  createdAt: string;
}

export const walletAPI = {
  getHotWallet: (): Promise<ApiResponse<Wallet>> =>
    apiClient.get('/wallets/hot').then(res => res.data),
    
  getColdWallet: (): Promise<ApiResponse<Wallet>> =>
    apiClient.get('/wallets/cold').then(res => res.data),
    
  getWalletBalances: (): Promise<ApiResponse<any>> =>
    apiClient.get('/wallets/balances').then(res => res.data),
    
  rebalanceWallets: (guardianId: string, totpCode: string, forceRebalance?: boolean): Promise<ApiResponse<any>> =>
    apiClient.post('/wallets/rebalance', { guardianId, totpCode, forceRebalance }, {
      headers: { 'X-TOTP-Code': totpCode }
    }).then(res => res.data),
};

// ==================== TRANSACTION API ====================

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
  status: string;
  txType: string;
  requiresApproval: boolean;
  requiredApprovals: number;
  approvals: Array<{
    guardianId: string;
    guardianRole: string;
    approvedAt: string;
    authMethod: string;
  }>;
  thresholdScheme?: string;
  challenge?: {
    challengeHash: string;
    expiresAt: string;
    isActive: boolean;
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

export const transactionAPI = {
  createTransaction: (data: CreateTransactionRequest): Promise<ApiResponse<any>> =>
    apiClient.post('/transactions', data).then(res => res.data),
    
  approveTransaction: (id: string, data: ApproveTransactionRequest): Promise<ApiResponse<any>> => {
    const headers: any = {};
    if (data.challengeResponse) {
      headers['X-Challenge-Response'] = data.challengeResponse;
    }
    if (data.totpCode) {
      headers['X-TOTP-Code'] = data.totpCode;
    }
    return apiClient.post(`/transactions/${id}/approve`, data, { headers }).then(res => res.data);
  },
    
  getTransactions: (params?: {
    status?: string;
    txType?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Transaction>> =>
    apiClient.get('/transactions', { params }).then(res => res.data),
    
  getTransactionById: (id: string): Promise<ApiResponse<Transaction>> =>
    apiClient.get(`/transactions/${id}`).then(res => res.data),
    
  getTransactionStats: (): Promise<ApiResponse<any>> =>
    apiClient.get('/transactions/stats/overview').then(res => res.data),
    
  getTransactionPrivacyReport: (): Promise<ApiResponse<any>> =>
    apiClient.get('/transactions/privacy/report').then(res => res.data),
};

// ==================== CHALLENGE API ====================

export const challengeAPI = {
  generateChallenge: (transactionId: string): Promise<ApiResponse<any>> =>
    apiClient.post('/transactions/challenges/generate', { transactionId }).then(res => res.data),
    
  validateChallenge: (data: {
    challengeHash: string;
    responseCode: string;
    guardianId: string;
    transactionId: string;
  }): Promise<ApiResponse<any>> =>
    apiClient.post('/transactions/challenges/validate', data).then(res => res.data),
};

// ==================== PRIVACY API ====================

export const privacyAPI = {
  getEphemeralKeyStats: (): Promise<ApiResponse<any>> =>
    apiClient.get('/privacy/ephemeral-keys/stats').then(res => res.data),
    
  getTransactionPrivacyReport: (): Promise<ApiResponse<any>> =>
    apiClient.get('/privacy/transactions/report').then(res => res.data),
    
  getEphemeralKeyDetails: (transactionId: string): Promise<ApiResponse<any>> =>
    apiClient.get(`/privacy/ephemeral-keys/${transactionId}`).then(res => res.data),
    
  verifyUserPrivacy: (userId: string): Promise<ApiResponse<any>> =>
    apiClient.get(`/privacy/verification/${userId}`).then(res => res.data),
};

// ==================== MONITORING API ====================

export const monitoringAPI = {
  getDetailedHealth: (): Promise<ApiResponse<any>> =>
    apiClient.get('/monitoring/health/detailed').then(res => res.data),
    
  getPerformanceMetrics: (): Promise<ApiResponse<any>> =>
    apiClient.get('/monitoring/performance').then(res => res.data),
    
  getSecurityEvents: (): Promise<ApiResponse<any>> =>
    apiClient.get('/monitoring/security/events').then(res => res.data),
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Make authenticated request with TOTP
 */
export const makeAuthenticatedRequest = async <T>(
  requestFn: (totpCode: string) => Promise<T>,
  totpCode: string
): Promise<T> => {
  try {
    return await requestFn(totpCode);
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Invalid TOTP code or session expired');
    }
    throw error;
  }
};

/**
 * Check API health
 */
export const checkAPIHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/health`, {
      timeout: 5000
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

/**
 * Get API base URL
 */
export const getAPIBaseURL = (): string => {
  return API_BASE_URL;
};

export default apiClient;