'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { guardianAPI } from '@/lib/api';
import { queryKeys } from '@/context/query-provider';
import { GuardianRoleBadge, TransactionStatusBadge } from '@/components/common/status-badge';
import { PageLoading } from '@/components/common/loading-spinner';
import { formatDate, formatXLMWithSuffix, truncateAddress } from '@/lib/utils';
import { 
  ArrowLeft, 
  Users, 
  Shield, 
  Phone, 
  Mail, 
  Activity, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp,
  Star
} from 'lucide-react';

/**
 * Guardian Details Page
 * 
 * Detailed view of individual guardian with approval history and statistics
 */
export default function GuardianDetailsPage() {
  const params = useParams();
  const guardianId = params.id as string;

  // Fetch guardian details
  const { data: guardian, isLoading } = useQuery({
    queryKey: queryKeys.guardian(guardianId),
    queryFn: () => guardianAPI.getGuardianById(guardianId),
    enabled: !!guardianId,
  });

  // Fetch guardian approvals
  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: queryKeys.guardianApprovals(guardianId),
    queryFn: () => guardianAPI.getGuardianApprovals(guardianId),
    enabled: !!guardianId,
  });

  if (isLoading) {
    return <PageLoading text="Loading guardian details..." />;
  }

  if (!guardian?.data) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-corporate-900 mb-4">Guardian Not Found</h1>
        <Link href="/dashboard/guardians">
          <Button variant="corporate">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Guardians
          </Button>
        </Link>
      </div>
    );
  }

  const guardianData = guardian.data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/guardians">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-corporate-900">
              {guardianData.name}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <GuardianRoleBadge role={guardianData.role} />
              <Badge variant="outline">Level {guardianData.level}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Guardian Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-stellar-600" />
              Guardian Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-corporate-500" />
                <span className="text-sm text-corporate-600">{guardianData.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-corporate-500" />
                <span className="text-sm text-corporate-600">{guardianData.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-corporate-500" />
                <span className="text-sm text-corporate-600">
                  {guardianData.stellarPublicKey ? 
                    truncateAddress(guardianData.stellarPublicKey) : 
                    'Address not available'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-warning-600" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-corporate-600">Active Status</span>
                <Badge variant={guardianData.isActive ? 'success' : 'error'}>
                  {guardianData.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-corporate-600">TOTP Verified</span>
                <Badge variant={guardianData.totpVerified ? 'success' : 'warning'}>
                  {guardianData.totpVerified ? 'Verified' : 'Pending'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-corporate-600">HSM Activated</span>
                <Badge variant={guardianData.hsmActivated ? 'success' : 'warning'}>
                  {guardianData.hsmActivated ? 'Active' : 'Pending'}
                </Badge>
              </div>
              <div className="pt-2 border-t border-corporate-200">
                <div className="text-xs text-corporate-500">
                  Created: {formatDate(guardianData.createdAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limits & Activity */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-success-600" />
              Limits & Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-corporate-700">Daily Limit</div>
                <div className="text-lg font-bold text-success-700">
                  {formatXLMWithSuffix(guardianData.dailyLimit)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-corporate-700">Monthly Limit</div>
                <div className="text-lg font-bold text-success-700">
                  {formatXLMWithSuffix(guardianData.monthlyLimit)}
                </div>
              </div>
              <div className="pt-2 border-t border-corporate-200">
                <div className="text-sm font-medium text-corporate-700">Total Approvals</div>
                <div className="text-2xl font-bold text-corporate-700">
                  {guardianData.totalApprovals}
                </div>
                {guardianData.lastApprovalAt && (
                  <div className="text-xs text-corporate-500">
                    Last: {formatDate(guardianData.lastApprovalAt)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Approvals */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2 text-stellar-600" />
            Recent Approvals
          </CardTitle>
          <CardDescription>
            Transaction approval history for this guardian
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvalsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex space-x-4 animate-pulse">
                  <div className="h-4 bg-corporate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-corporate-200 rounded w-1/3"></div>
                  <div className="h-4 bg-corporate-200 rounded w-1/6"></div>
                  <div className="h-4 bg-corporate-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : approvals?.data && approvals.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Auth Method</TableHead>
                  <TableHead>Approved At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.data.map((approval: any) => (
                  <TableRow key={approval.id}>
                    <TableCell>
                      <Link 
                        href={`/dashboard/transactions/${approval.transaction.id}`}
                        className="text-stellar-600 hover:text-stellar-700 font-medium"
                      >
                        {approval.transaction.id.slice(-8)}...
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatXLMWithSuffix(approval.transaction.amount)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {truncateAddress(approval.transaction.toAddress)}
                    </TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={approval.transaction.status} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={approval.authMethod === 'OCRA_LIKE' ? 'success' : 'warning'}>
                        {approval.authMethod || 'TOTP'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-corporate-600">
                      {formatDate(approval.approvedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-corporate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-corporate-700 mb-2">
                No Approvals Yet
              </h3>
              <p className="text-corporate-500">
                This guardian hasn't approved any transactions yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}