'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Wallet, 
  ArrowRightLeft, 
  Activity,
  TrendingUp,
  Shield,
  Eye,
  CheckCircle
} from 'lucide-react';
import { formatXLMWithSuffix, formatPercentage } from '@/lib/utils';

/**
 * Overview Cards Component
 * 
 * Executive summary cards for the dashboard
 */

interface OverviewCardsProps {
  guardianStats?: any;
  transactionStats?: any;
  walletBalances?: any;
  systemHealth?: any;
}

export function OverviewCards({ 
  guardianStats, 
  transactionStats, 
  walletBalances, 
  systemHealth 
}: OverviewCardsProps) {
  return (
    <>
      {/* Guardians Card */}
      <Card className="metric-card hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-corporate-600">
            Active Guardians
          </CardTitle>
          <Users className="h-4 w-4 text-stellar-600" />
        </CardHeader>
        <CardContent>
          <div className="metric-value text-stellar-700">
            {guardianStats?.guardians?.active || 0}
            <span className="text-lg text-corporate-500 ml-1">
              / {guardianStats?.guardians?.total || 3}
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Badge 
              variant={
                guardianStats?.systemHealth?.minGuardiansAvailable ? 'success' : 'warning'
              }
              className="text-xs"
            >
              {guardianStats?.systemHealth?.minGuardiansAvailable ? 'Operational' : 'Attention'}
            </Badge>
            <p className="metric-label">
              HSM: {guardianStats?.guardians?.hsmActivated || 0} activated
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Balance Card */}
      <Card className="metric-card hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-corporate-600">
            Total Balance
          </CardTitle>
          <Wallet className="h-4 w-4 text-success-600" />
        </CardHeader>
        <CardContent>
          <div className="metric-value text-success-700">
            {walletBalances ? formatXLMWithSuffix(walletBalances.total) : '0 XLM'}
          </div>
          <div className="flex items-center space-x-4 mt-2">
            <div className="text-xs text-corporate-600">
              <span className="font-medium">Cold:</span> {formatPercentage(walletBalances?.cold?.percentage || 0)}
            </div>
            <div className="text-xs text-corporate-600">
              <span className="font-medium">Hot:</span> {formatPercentage(walletBalances?.hot?.percentage || 0)}
            </div>
            <Badge 
              variant={walletBalances?.needsRebalancing ? 'warning' : 'success'}
              className="text-xs"
            >
              {walletBalances?.needsRebalancing ? 'Rebalance' : 'Balanced'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Card */}
      <Card className="metric-card hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-corporate-600">
            Transactions
          </CardTitle>
          <ArrowRightLeft className="h-4 w-4 text-warning-600" />
        </CardHeader>
        <CardContent>
          <div className="metric-value text-warning-700">
            {transactionStats?.transactions?.total || 0}
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Badge 
              variant={
                (transactionStats?.transactions?.pending || 0) > 0 ? 'warning' : 'success'
              }
              className="text-xs"
            >
              {transactionStats?.transactions?.pending || 0} Pending
            </Badge>
            <p className="metric-label">
              {formatPercentage(transactionStats?.transactions?.successRate || 0)}% success
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Protection Card */}
      <Card className="metric-card hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-corporate-600">
            Privacy Score
          </CardTitle>
          <Eye className="h-4 w-4 text-corporate-600" />
        </CardHeader>
        <CardContent>
          <div className="metric-value text-corporate-700">
            {Math.round(transactionStats?.privacy?.privacyScore || 100)}%
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Badge 
              variant={
                (transactionStats?.privacy?.privacyScore || 100) > 95 ? 'success' : 
                (transactionStats?.privacy?.privacyScore || 100) > 80 ? 'warning' : 'error'
              }
              className="text-xs"
            >
              {transactionStats?.privacy?.correlationProtection || 'Excellent'}
            </Badge>
            <p className="metric-label">
              {transactionStats?.privacy?.ephemeralKeysGenerated || 0} ephemeral keys
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}