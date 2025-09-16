'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { transactionAPI } from '@/lib/api';
import { queryKeys } from '@/context/query-provider';
import { TransactionStatusBadge, WalletTypeBadge } from '@/components/common/status-badge';
import { TableLoading, CardLoading } from '@/components/common/loading-spinner';
import { formatXLMWithSuffix, formatDate, truncateAddress } from '@/lib/utils';
import { 
  ArrowRightLeft, 
  Plus, 
  Eye, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  TrendingUp,
  Snowflake,
  Flame,
  MoreHorizontal
} from 'lucide-react';

/**
 * Transactions Management Page
 * 
 * Complete transaction management with privacy protection visualization
 */
export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', statusFilter, typeFilter, currentPage],
    queryFn: () => transactionAPI.getTransactions({
      status: statusFilter || undefined,
      txType: typeFilter || undefined,
      page: currentPage,
      limit: 20,
    }),
    refetchInterval: 15000, // Refresh every 15 seconds for real-time updates
  });

  // Fetch transaction stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.transactionStats,
    queryFn: () => transactionAPI.getTransactionStats(),
    refetchInterval: 30000,
  });

  // Fetch privacy report
  const { data: privacyReport, isLoading: privacyLoading } = useQuery({
    queryKey: queryKeys.transactionPrivacyReport,
    queryFn: () => transactionAPI.getTransactionPrivacyReport(),
    refetchInterval: 60000,
  });

  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900">Transaction Management</h1>
          <p className="text-corporate-600 mt-1">
            Multi-signature transactions with privacy protection and ephemeral keys
          </p>
        </div>
        <Link href="/dashboard/transactions/create">
          <Button variant="corporate" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Create Transaction
          </Button>
        </Link>
      </div>

      {/* Transaction Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsLoading ? (
          <>
            <CardLoading />
            <CardLoading />
            <CardLoading />
            <CardLoading />
          </>
        ) : (
          <>
            <Card className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="metric-label">Total Transactions</p>
                    <p className="metric-value text-stellar-700">
                      {stats?.data?.transactions?.total || 0}
                    </p>
                  </div>
                  <ArrowRightLeft className="w-8 h-8 text-stellar-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="metric-label">Pending Approvals</p>
                    <p className="metric-value text-warning-700">
                      {stats?.data?.transactions?.pending || 0}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-warning-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="metric-label">Success Rate</p>
                    <p className="metric-value text-success-700">
                      {Math.round(stats?.data?.transactions?.successRate || 0)}%
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-success-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="metric-label">Privacy Score</p>
                    <p className="metric-value text-corporate-700">
                      {Math.round(stats?.data?.privacy?.privacyScore || 100)}%
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-corporate-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Privacy Protection Overview */}
      {!privacyLoading && privacyReport?.data && (
        <Card className="corporate-card bg-gradient-to-br from-stellar-50 to-corporate-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-stellar-600" />
              Privacy Protection Status
            </CardTitle>
            <CardDescription>
              Ephemeral transaction keys ensure complete transaction privacy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-2xl font-bold text-stellar-700">
                  {privacyReport.data.summary.ephemeralTransactions}
                </div>
                <div className="text-sm text-corporate-600">Privacy Protected</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-2xl font-bold text-success-700">
                  {privacyReport.data.summary.uniqueAddressesGenerated}
                </div>
                <div className="text-sm text-corporate-600">Unique Addresses</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-2xl font-bold text-corporate-700">
                  {Math.round(privacyReport.data.summary.privacyCompliance)}%
                </div>
                <div className="text-sm text-corporate-600">Compliance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2 text-stellar-600" />
            Filter Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-corporate-700">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="AWAITING_APPROVAL">Awaiting Approval</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-corporate-700">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="REBALANCE">Rebalance</SelectItem>
                  <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                  <SelectItem value="DEPOSIT">Deposit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-corporate-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-corporate-400 w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            All transactions with approval status and privacy protection details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <TableLoading rows={10} />
          ) : transactions?.data && transactions.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>From Wallet</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Privacy</TableHead>
                    <TableHead>Approvals</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.data.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <code className="text-sm bg-corporate-100 px-2 py-1 rounded">
                            {tx.id.slice(-8)}...
                          </code>
                          {tx.stellarHash && (
                            <div className="text-xs text-corporate-500">
                              Stellar: {tx.stellarHash.slice(-8)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {tx.fromWallet.walletType === 'COLD' ? (
                            <Snowflake className="w-4 h-4 text-stellar-600" />
                          ) : (
                            <Flame className="w-4 h-4 text-warning-600" />
                          )}
                          <div>
                            <WalletTypeBadge type={tx.fromWallet.walletType} />
                            <div className="text-xs text-corporate-500 mt-1">
                              {truncateAddress(tx.fromWallet.publicKey)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="font-mono font-medium">
                        {formatXLMWithSuffix(tx.amount)}
                      </TableCell>
                      
                      <TableCell className="font-mono text-sm">
                        {truncateAddress(tx.toAddress)}
                      </TableCell>
                      
                      <TableCell>
                        <TransactionStatusBadge status={tx.status} />
                      </TableCell>
                      
                      <TableCell>
                        {tx.privacyProtection?.isPrivacyProtected ? (
                          <div className="space-y-1">
                            <Badge variant="success" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Protected
                            </Badge>
                            <div className="text-xs text-corporate-500">
                              {truncateAddress(tx.privacyProtection.ephemeralAddress)}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="warning" className="text-xs">
                            Not Protected
                          </Badge>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {tx.approvals?.length || 0}/{tx.requiredApprovals || 0}
                        </div>
                        {tx.approvals && tx.approvals.length > 0 && (
                          <div className="text-xs text-corporate-500">
                            {tx.approvals.map((approval: any) => approval.guardianRole).join(', ')}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-sm text-corporate-600">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      
                      <TableCell>
                        <Link href={`/dashboard/transactions/${tx.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {transactions.pagination && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-corporate-600">
                    Showing {transactions.data.length} of {transactions.pagination.total} transactions
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={!transactions.pagination.hasPrev}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-corporate-600">
                      Page {currentPage} of {transactions.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!transactions.pagination.hasNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <ArrowRightLeft className="w-16 h-16 text-corporate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-corporate-700 mb-2">
                No Transactions Found
              </h3>
              <p className="text-corporate-500 mb-6">
                {statusFilter || typeFilter 
                  ? 'No transactions match your current filters'
                  : 'Create your first multi-signature transaction'
                }
              </p>
              {!statusFilter && !typeFilter && (
                <Link href="/dashboard/transactions/create">
                  <Button variant="corporate">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Transaction
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}