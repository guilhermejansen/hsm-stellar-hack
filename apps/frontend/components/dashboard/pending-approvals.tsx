'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { transactionAPI } from '@/lib/api';
import { TransactionStatusBadge, WalletTypeBadge } from '@/components/common/status-badge';
import { TableLoading } from '@/components/common/loading-spinner';
import { StellarExplorerLink } from '@/components/common/stellar-explorer-link';
import { formatXLMWithSuffix, formatRelativeDate, truncateAddress } from '@/lib/utils';
import { 
  Clock, 
  ExternalLink,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Snowflake,
  Flame,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

/**
 * Pending Approvals Component
 * 
 * Shows transactions awaiting guardian approval with quick action buttons
 */

export function PendingApprovals() {
  const { data: pendingTransactions, isLoading } = useQuery({
    queryKey: ['transactions', 'pending'],
    queryFn: () => transactionAPI.getPendingTransactions(),
    refetchInterval: 15000, // Refresh every 15 seconds for real-time updates
  });

  return (
    <Card className="corporate-card border-warning-200 bg-gradient-to-br from-warning-50 to-orange-50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center text-warning-800">
            <Clock className="w-5 h-5 mr-2" />
            Pending Approvals
          </CardTitle>
          <p className="text-sm text-warning-700 mt-1">
            Transactions awaiting guardian approval
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="warning" className="text-sm">
            {pendingTransactions?.data?.length || 0} Pending
          </Badge>
          <Link href="/dashboard/transactions?status=AWAITING_APPROVAL">
            <Button variant="outline" size="sm">
              View All
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableLoading rows={3} />
        ) : pendingTransactions?.data && pendingTransactions.data.length > 0 ? (
          <div className="space-y-3">
            {pendingTransactions.data.slice(0, 5).map((tx: any) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-warning-200 hover:border-warning-300 transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  {/* Wallet Type Icon */}
                  <div className="p-2 bg-warning-100 rounded-lg">
                    {tx.fromWallet.walletType === 'COLD' ? (
                      <Snowflake className="w-4 h-4 text-stellar-600" />
                    ) : (
                      <Flame className="w-4 h-4 text-warning-600" />
                    )}
                  </div>
                  
                  {/* Transaction Details */}
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-lg text-warning-800">
                        {formatXLMWithSuffix(tx.amount)}
                      </span>
                      <WalletTypeBadge type={tx.fromWallet.walletType} />
                      <Badge variant="outline" className="text-xs">
                        {tx.txType}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-corporate-600">
                      To: {truncateAddress(tx.toAddress)}
                    </div>
                    
                    {/* Privacy Protection Status */}
                    {tx.privacyProtection?.isPrivacyProtected ? (
                      <div className="flex items-center space-x-1 mt-1">
                        <Shield className="w-3 h-3 text-success-500" />
                        <span className="text-xs text-success-600">
                          Privacy Protected: {truncateAddress(tx.privacyProtection.ephemeralAddress)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-warning-500" />
                        <span className="text-xs text-warning-600">
                          No privacy protection
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Approval Status & Actions */}
                <div className="text-right space-y-2">
                  <div className="flex items-center justify-end space-x-2">
                    <Users className="w-4 h-4 text-corporate-500" />
                    <span className="text-sm font-medium text-corporate-700">
                      {tx.currentApprovals}/{tx.requiredApprovals}
                    </span>
                  </div>
                  
                  <div className="text-xs text-corporate-500">
                    Created {formatRelativeDate(tx.createdAt)}
                  </div>
                  
                  {/* Challenge Status */}
                  {tx.challenge && (
                    <Badge variant={tx.challenge.isActive ? 'warning' : 'error'} className="text-xs">
                      {tx.challenge.isActive ? 'Challenge Active' : 'Challenge Expired'}
                    </Badge>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/transactions/${tx.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/approve/${tx.id}`}>
                        <Button variant="warning" size="sm" className="text-xs">
                          Approve
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                    {tx.stellarHash && (
                      <StellarExplorerLink
                        stellarHash={tx.stellarHash}
                        status={tx.status}
                        variant="compact"
                        className="text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Show more indicator */}
            {pendingTransactions.data.length > 5 && (
              <div className="text-center pt-2">
                <Link href="/dashboard/transactions?status=AWAITING_APPROVAL">
                  <Button variant="outline" size="sm">
                    View {pendingTransactions.data.length - 5} more pending transactions
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-success-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-success-700 mb-2">
              No Pending Approvals
            </h3>
            <p className="text-success-600 mb-4">
              All transactions have been processed or approved
            </p>
            <Link href="/dashboard/transactions/create">
              <Button variant="corporate" size="sm">
                Create New Transaction
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
