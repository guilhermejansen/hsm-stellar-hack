/**
 * Stellar Utilities
 * 
 * Helper functions for Stellar network operations and explorer links
 */

export type StellarNetwork = 'testnet' | 'mainnet';

/**
 * Get current Stellar network based on environment
 */
export function getCurrentStellarNetwork(): StellarNetwork {
  // In development, always use testnet
  if (process.env.NODE_ENV === 'development') {
    return 'testnet';
  }
  
  // In production, check environment variable
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
  return network as StellarNetwork;
}

/**
 * Get Stellar Explorer URLs for different networks
 */
export function getStellarExplorerUrls(network: StellarNetwork) {
  return {
    stellarExpert: {
      testnet: 'https://stellar.expert/explorer/testnet',
      mainnet: 'https://stellar.expert/explorer/public',
    },
    stellarLab: {
      testnet: 'https://laboratory.stellar.org/#explorer?resource=transactions&endpoint=testnet',
      mainnet: 'https://laboratory.stellar.org/#explorer?resource=transactions&endpoint=public',
    },
    horizon: {
      testnet: 'https://horizon-testnet.stellar.org',
      mainnet: 'https://horizon.stellar.org',
    },
  };
}

/**
 * Get transaction explorer URL
 */
export function getTransactionExplorerUrl(
  stellarHash: string, 
  network: StellarNetwork = 'testnet',
  provider: 'stellarExpert' | 'stellarLab' | 'horizon' = 'stellarExpert'
): string {
  const urls = getStellarExplorerUrls(network);
  const baseUrl = urls[provider][network];
  
  switch (provider) {
    case 'stellarExpert':
      return `${baseUrl}/tx/${stellarHash}`;
    case 'stellarLab':
      return `${baseUrl}&values=${stellarHash}`;
    case 'horizon':
      return `${baseUrl}/transactions/${stellarHash}`;
    default:
      return `${baseUrl}/tx/${stellarHash}`;
  }
}

/**
 * Get account explorer URL
 */
export function getAccountExplorerUrl(
  address: string, 
  network: StellarNetwork = 'testnet',
  provider: 'stellarExpert' | 'stellarLab' | 'horizon' = 'stellarExpert'
): string {
  const urls = getStellarExplorerUrls(network);
  const baseUrl = urls[provider][network];
  
  switch (provider) {
    case 'stellarExpert':
      return `${baseUrl}/account/${address}`;
    case 'stellarLab':
      return `${baseUrl.replace('transactions', 'accounts')}&values=${address}`;
    case 'horizon':
      return `${baseUrl}/accounts/${address}`;
    default:
      return `${baseUrl}/account/${address}`;
  }
}

/**
 * Validate Stellar address format
 */
export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}

/**
 * Validate Stellar transaction hash format
 */
export function isValidStellarHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

/**
 * Format Stellar amount for display
 */
export function formatStellarAmount(amount: string | number, decimals: number = 7): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(decimals);
}

/**
 * Get network display name
 */
export function getNetworkDisplayName(network: StellarNetwork): string {
  return network === 'testnet' ? 'Testnet' : 'Mainnet';
}

/**
 * Get network badge variant
 */
export function getNetworkBadgeVariant(network: StellarNetwork): 'default' | 'secondary' | 'destructive' | 'outline' {
  return network === 'testnet' ? 'secondary' : 'default';
}

/**
 * Check if transaction is executed (has Stellar hash)
 */
export function isTransactionExecuted(stellarHash?: string | null): boolean {
  return !!stellarHash && isValidStellarHash(stellarHash);
}

/**
 * Get transaction status color
 */
export function getTransactionStatusColor(status: string): string {
  switch (status) {
    case 'SUCCESS':
      return 'text-success-600';
    case 'FAILED':
      return 'text-error-600';
    case 'EXECUTING':
      return 'text-warning-600';
    case 'AWAITING_APPROVAL':
      return 'text-warning-600';
    case 'PENDING':
      return 'text-corporate-600';
    default:
      return 'text-corporate-400';
  }
}

/**
 * Get transaction status icon
 */
export function getTransactionStatusIcon(status: string): string {
  switch (status) {
    case 'SUCCESS':
      return 'CheckCircle';
    case 'FAILED':
      return 'AlertCircle';
    case 'EXECUTING':
    case 'AWAITING_APPROVAL':
      return 'Clock';
    default:
      return 'Clock';
  }
}
