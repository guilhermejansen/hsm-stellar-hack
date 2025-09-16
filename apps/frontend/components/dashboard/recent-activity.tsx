'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { transactionAPI } from '@/lib/api';
import { queryKeys } from '@/context/query-provider';
import { TransactionStatusBadge } from '@/components/common/status-badge';
import { TableLoading } from '@/components/common/loading-spinner';
import { formatXLMWithSuffix, formatRelativeDate, truncateAddress } from '@/lib/utils';
import { 
  ArrowRightLeft, 
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

/**
 * Recent Activity Component
 * 
 * Shows recent transactions and system activity
 */

export function RecentActivity() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () => transactionAPI.getTransactions({ limit: 10 }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <Card className="corporate-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center">
            <ArrowRightLeft className="w-5 h-5 mr-2 text-stellar-600" />
            Recent Activity
          </CardTitle>
          <p className="text-sm text-corporate-600 mt-1">
            Latest transactions and system events
          </p>
        </div>
        <Link href="/dashboard/transactions">
          <Button variant="outline" size="sm">
            View All
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableLoading rows={5} />
        ) : transactions?.data && transactions.data.length > 0 ? (
          <div className="space-y-4">
            {transactions.data.slice(0, 5).map((tx: any) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-3 bg-corporate-50 rounded-lg hover:bg-corporate-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg">
                    {tx.status === 'SUCCESS' ? (
                      <CheckCircle className="w-4 h-4 text-success-500" />
                    ) : tx.status === 'FAILED' ? (
                      <AlertCircle className="w-4 h-4 text-error-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-warning-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-corporate-900">
                        {formatXLMWithSuffix(tx.amount)}
                      </span>
                      <TransactionStatusBadge status={tx.status} />
                    </div>
                    <div className="text-sm text-corporate-600">
                      To: {truncateAddress(tx.toAddress)}
                    </div>
                    {tx.privacyProtection?.isPrivacyProtected && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Shield className="w-3 h-3 text-stellar-500" />
                        <span className="text-xs text-stellar-600">
                          Privacy Protected: {truncateAddress(tx.privacyProtection.ephemeralAddress)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-corporate-600">
                    {formatRelativeDate(tx.createdAt)}
                  </div>
                  <div className="text-xs text-corporate-500">
                    {tx.approvals?.length || 0}/{tx.requiredApprovals || 0} approvals
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ArrowRightLeft className="w-12 h-12 text-corporate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-corporate-700 mb-2">
              No Recent Activity
            </h3>
            <p className="text-corporate-500 mb-4">
              No transactions have been created yet
            </p>
            <Link href="/dashboard/transactions/create">
              <Button variant="corporate">
                <Plus className="w-4 h-4 mr-2" />
                Create First Transaction
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}