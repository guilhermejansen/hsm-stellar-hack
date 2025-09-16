'use client';

import { useAuth } from '@/context/auth-context';
import { useQuery } from '@tanstack/react-query';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { SystemStatus } from '@/components/dashboard/system-status';
import { guardianAPI, walletAPI, transactionAPI, monitoringAPI } from '@/lib/api';
import { queryKeys } from '@/context/query-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner, CardLoading } from '@/components/common/loading-spinner';
import { cn } from '@/lib/utils';
import { Shield, TrendingUp, Users, Activity } from 'lucide-react';

/**
 * Dashboard Overview Page
 * 
 * Executive dashboard showing system overview, quick actions, and status
 */
export default function DashboardPage() {
  const { user } = useAuth();

  // Fetch overview data
  const { data: guardianStats, isLoading: guardiansLoading } = useQuery({
    queryKey: queryKeys.guardianStats,
    queryFn: () => guardianAPI.getGuardianStats(),
  });

  const { data: transactionStats, isLoading: transactionsLoading } = useQuery({
    queryKey: queryKeys.transactionStats,
    queryFn: () => transactionAPI.getTransactionStats(),
  });

  const { data: walletBalances, isLoading: walletsLoading } = useQuery({
    queryKey: queryKeys.walletBalances,
    queryFn: () => walletAPI.getWalletBalances(),
  });

  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: queryKeys.systemHealth,
    queryFn: () => monitoringAPI.getDetailedHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const isLoading = guardiansLoading || transactionsLoading || walletsLoading || healthLoading;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900 dark:text-corporate-100">
            Welcome back, {user?.name}
          </h1>
          <p className="text-corporate-600 dark:text-corporate-300 mt-1">
            {user?.isGuardian ? (
              <>
                Guardian Dashboard • {user.role} • 
                <Badge variant={user.hsmActivated ? 'success' : 'warning'} className="ml-2">
                  {user.hsmActivated ? 'HSM Dinamo Active' : 'HSM Dinamo Pending'}
                </Badge>
              </>
            ) : (
              'Multi-Signature Custody Management with HSM Dinamo Security'
            )}
          </p>
        </div>
        
        {/* System Status Indicator */}
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-stellar-600" />
          <span className="text-sm font-medium text-corporate-700 dark:text-corporate-300">
            {systemHealth?.data?.status === 'healthy' ? 'All Systems Operational' : 'System Status'}
          </span>
          <Badge 
            variant={
              systemHealth?.data?.status === 'healthy' ? 'success' : 
              systemHealth?.data?.status === 'degraded' ? 'warning' : 'error'
            }
          >
            {systemHealth?.data?.status || 'Checking...'}
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <CardLoading />
            <CardLoading />
            <CardLoading />
            <CardLoading />
          </>
        ) : (
          <OverviewCards
            guardianStats={guardianStats?.data}
            transactionStats={transactionStats?.data}
            walletBalances={walletBalances?.data}
            systemHealth={systemHealth?.data}
          />
        )}
      </div>

      {/* Quick Actions */}
      <QuickActions user={user} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>

        {/* System Status */}
        <div className="lg:col-span-1">
          <SystemStatus systemHealth={systemHealth?.data} />
        </div>
      </div>

      {/* Guardian-Specific Information */}
      {user?.isGuardian && (
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-stellar-600" />
              Guardian Status
            </CardTitle>
            <CardDescription>
              Your role and permissions in the multi-signature system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-stellar-50 dark:bg-stellar-900/20 rounded-lg">
                <div className="text-2xl font-bold text-stellar-700 dark:text-stellar-300">{user.role}</div>
                <div className="text-sm text-stellar-600 dark:text-stellar-400">Guardian Role</div>
              </div>
              <div className="text-center p-4 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
                <div className="text-2xl font-bold text-corporate-700 dark:text-corporate-300">Level {user.level || 1}</div>
                <div className="text-sm text-corporate-600 dark:text-corporate-400">Permission Level</div>
              </div>
              <div className="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
                <div className={cn(
                  'text-2xl font-bold',
                  user.hsmActivated ? 'text-success-700 dark:text-success-400' : 'text-warning-700 dark:text-warning-400'
                )}>
                  {user.hsmActivated ? 'Active' : 'Pending'}
                </div>
                <div className={cn(
                  'text-sm',
                  user.hsmActivated ? 'text-success-600 dark:text-success-500' : 'text-warning-600 dark:text-warning-500'
                )}>
                  HSM Dinamo Status
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}