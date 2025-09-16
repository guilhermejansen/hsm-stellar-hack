'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';

/**
 * TanStack Query Provider for Stellar Custody MVP
 * 
 * Provides:
 * - Global query client configuration
 * - Caching strategies for API data
 * - Background refetching
 * - Error handling
 * - Development tools
 */

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time - how long data is considered fresh
            staleTime: 5 * 60 * 1000, // 5 minutes
            
            // Cache time - how long data stays in cache
            gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
            
            // Retry configuration
            retry: (failureCount, error: any) => {
              // Don't retry on 401/403 errors
              if (error?.response?.status === 401 || error?.response?.status === 403) {
                return false;
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
            
            // Refetch configuration
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchOnMount: true,
            
            // Background refetch interval for critical data
            refetchInterval: (data, query) => {
              // Refetch guardian and transaction data more frequently
              if (query.queryKey[0] === 'guardians' || query.queryKey[0] === 'transactions') {
                return 30 * 1000; // 30 seconds
              }
              // Refetch monitoring data frequently
              if (query.queryKey[0] === 'monitoring') {
                return 15 * 1000; // 15 seconds
              }
              // Default: no background refetch
              return false;
            },
          },
          mutations: {
            // Retry mutations once
            retry: 1,
            
            // Global error handling for mutations
            onError: (error: any) => {
              console.error('Mutation error:', error);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

/**
 * Query keys for consistent caching
 */
export const queryKeys = {
  // Authentication
  auth: ['auth'] as const,
  sessionInfo: ['auth', 'session'] as const,
  
  // Guardians
  guardians: ['guardians'] as const,
  guardian: (id: string) => ['guardians', id] as const,
  guardianStats: ['guardians', 'stats'] as const,
  guardianApprovals: (id: string) => ['guardians', id, 'approvals'] as const,
  minimumGuardians: ['guardians', 'minimum'] as const,
  
  // Wallets
  wallets: ['wallets'] as const,
  hotWallet: ['wallets', 'hot'] as const,
  coldWallet: ['wallets', 'cold'] as const,
  walletBalances: ['wallets', 'balances'] as const,
  
  // Transactions
  transactions: ['transactions'] as const,
  transaction: (id: string) => ['transactions', id] as const,
  transactionStats: ['transactions', 'stats'] as const,
  transactionPrivacyReport: ['transactions', 'privacy'] as const,
  pendingApprovals: (guardianId: string) => ['transactions', 'pending', guardianId] as const,
  
  // Challenges
  challenges: ['challenges'] as const,
  challenge: (transactionId: string) => ['challenges', transactionId] as const,
  
  // Privacy
  privacy: ['privacy'] as const,
  ephemeralKeyStats: ['privacy', 'ephemeral-keys', 'stats'] as const,
  ephemeralKeyDetails: (transactionId: string) => ['privacy', 'ephemeral-keys', transactionId] as const,
  userPrivacyVerification: (userId: string) => ['privacy', 'verification', userId] as const,
  
  // Monitoring
  monitoring: ['monitoring'] as const,
  systemHealth: ['monitoring', 'health'] as const,
  performanceMetrics: ['monitoring', 'performance'] as const,
  securityEvents: ['monitoring', 'security'] as const,
} as const;