import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency amounts for display
 */
export function formatXLM(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 7,
    maximumFractionDigits: 7,
  }).format(num);
}

/**
 * Format currency amounts with XLM suffix
 */
export function formatXLMWithSuffix(amount: string | number): string {
  return `${formatXLM(amount)} XLM`;
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format dates for corporate display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(d);
}

/**
 * Format dates for relative display (e.g., "2 hours ago")
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

/**
 * Truncate Stellar addresses for display
 */
export function truncateAddress(address: string, startChars: number = 8, endChars: number = 8): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Validate Stellar address format
 */
export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}

/**
 * Get guardian role color
 */
export function getGuardianRoleColor(role: string): string {
  switch (role) {
    case 'CEO':
      return 'text-stellar-700 bg-stellar-100 border-stellar-200';
    case 'CFO':
      return 'text-success-700 bg-success-100 border-success-200';
    case 'CTO':
      return 'text-warning-700 bg-warning-100 border-warning-200';
    default:
      return 'text-corporate-700 bg-corporate-100 border-corporate-200';
  }
}

/**
 * Get transaction status color
 */
export function getTransactionStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'SUCCESS':
      return 'status-success';
    case 'PENDING':
    case 'AWAITING_APPROVAL':
      return 'status-warning';
    case 'FAILED':
    case 'CANCELLED':
      return 'status-error';
    default:
      return 'status-pending';
  }
}

/**
 * Get wallet type color
 */
export function getWalletTypeColor(type: string): string {
  switch (type.toUpperCase()) {
    case 'HOT':
      return 'text-warning-700 bg-warning-100 border-warning-200';
    case 'COLD':
      return 'text-stellar-700 bg-stellar-100 border-stellar-200';
    default:
      return 'text-corporate-700 bg-corporate-100 border-corporate-200';
  }
}

/**
 * Calculate privacy score color
 */
export function getPrivacyScoreColor(score: number): string {
  if (score >= 95) {
    return 'text-success-700 bg-success-100 border-success-200';
  } else if (score >= 80) {
    return 'text-warning-700 bg-warning-100 border-warning-200';
  } else {
    return 'text-error-700 bg-error-100 border-error-200';
  }
}

/**
 * Sleep utility for development
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Generate QR code URL for display
 */
export function generateQRCodeURL(data: string, size: number = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate random ID for components
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}