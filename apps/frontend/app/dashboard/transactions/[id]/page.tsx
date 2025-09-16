'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { transactionAPI, privacyAPI } from '@/lib/api';
import { TransactionStatusBadge, WalletTypeBadge, GuardianRoleBadge } from '@/components/common/status-badge';
import { PageLoading } from '@/components/common/loading-spinner';
import { StellarExplorerLink, StellarAddressLink } from '@/components/common/stellar-explorer-link';
import { formatXLMWithSuffix, formatDate, truncateAddress } from '@/lib/utils';
import { 
  ArrowLeft, 
  ArrowRightLeft, 
  Shield, 
  Eye, 
  ExternalLink,
  Copy,
  Clock,
  CheckCircle,
  Snowflake,
  Flame,
  RefreshCw,
  Users,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Transaction Details Page
 * 
 * Complete transaction information with privacy protection details
 */
export default function TransactionDetailsPage() {
  const params = useParams();
  const transactionId = params.id as string;

  // Fetch transaction details
  const { data: transaction, isLoading } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionAPI.getTransactionById(transactionId),
    enabled: !!transactionId,
    refetchInterval: 15000,
  });

  // Fetch ephemeral key details if privacy protected
  const { data: ephemeralKeyDetails } = useQuery({
    queryKey: ['ephemeral-key', transactionId],
    queryFn: () => privacyAPI.getEphemeralKeyDetails(transactionId),
    enabled: !!transactionId && !!transaction?.data?.privacyProtection,
    refetchInterval: 30000,
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  if (isLoading) {
    return <PageLoading text="Loading transaction details..." />;
  }

  if (!transaction?.data) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-corporate-900 dark:text-corporate-100 mb-4">Transaction Not Found</h1>
        <Link href="/dashboard/transactions">
          <Button variant="corporate">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Transactions
          </Button>
        </Link>
      </div>
    );
  }

  const tx = transaction.data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/transactions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-corporate-900 dark:text-corporate-100">
              Transaction Details
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <code className="text-sm bg-corporate-100 dark:bg-corporate-800 px-2 py-1 rounded">
                {tx.id.slice(-12)}...
              </code>
              <TransactionStatusBadge status={tx.status} />
            </div>
          </div>
        </div>
        
        <StellarExplorerLink
          stellarHash={tx.stellarHash}
          status={tx.status}
          variant="default"
        />
      </div>

      {/* Transaction Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowRightLeft className="w-5 h-5 mr-2 text-stellar-600" />
              Transaction Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm text-corporate-600">Amount</div>
                <div className="text-2xl font-bold text-stellar-700">
                  {formatXLMWithSuffix(tx.amount)}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-corporate-600 dark:text-corporate-300">Type</div>
                <Badge variant="outline">{tx.txType}</Badge>
              </div>
              
              {tx.memo && (
                <div>
                  <div className="text-sm text-corporate-600 dark:text-corporate-300">Memo</div>
                  <div className="text-sm text-corporate-900 dark:text-corporate-100 bg-corporate-50 dark:bg-corporate-800 p-2 rounded">
                    {tx.memo}
                  </div>
                </div>
              )}
              
              <div>
                <div className="text-sm text-corporate-600 dark:text-corporate-300">Created</div>
                <div className="text-sm text-corporate-900 dark:text-corporate-100">{formatDate(tx.createdAt)}</div>
              </div>
              
              {tx.executedAt && (
                <div>
                  <div className="text-sm text-corporate-600 dark:text-corporate-300">Executed</div>
                  <div className="text-sm text-corporate-900 dark:text-corporate-100">{formatDate(tx.executedAt)}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Wallet Information */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              {tx.fromWallet.walletType === 'COLD' ? (
                <Snowflake className="w-5 h-5 mr-2 text-stellar-600" />
              ) : (
                <Flame className="w-5 h-5 mr-2 text-warning-600" />
              )}
              Source Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <WalletTypeBadge type={tx.fromWallet.walletType} />
              </div>
              
              <div>
                <div className="text-sm text-corporate-600 dark:text-corporate-300">Address</div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-corporate-100 dark:bg-corporate-800 px-2 py-1 rounded flex-1">
                      {truncateAddress(tx.fromWallet.publicKey)}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(tx.fromWallet.publicKey, 'Source address')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <StellarAddressLink
                    address={tx.fromWallet.publicKey}
                    label="View Source Address"
                    className="text-xs"
                  />
                </div>
              </div>
              
              <div>
                <div className="text-sm text-corporate-600 dark:text-corporate-300">Derivation Path</div>
                <code className="text-sm bg-corporate-100 dark:bg-corporate-800 px-2 py-1 rounded">
                  {tx.fromWallet.derivationPath}
                </code>
              </div>
              
              <div>
                <div className="text-sm text-corporate-600 dark:text-corporate-300">Destination</div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-corporate-100 dark:bg-corporate-800 px-2 py-1 rounded flex-1">
                      {truncateAddress(tx.toAddress)}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(tx.toAddress, 'Destination address')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <StellarAddressLink
                    address={tx.toAddress}
                    label="View Destination Address"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Protection */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-corporate-600" />
              Privacy Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tx.privacyProtection?.isPrivacyProtected ? (
              <div className="space-y-3">
                <Badge variant="success" className="w-full justify-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Privacy Protected
                </Badge>
                
                <div>
                  <div className="text-sm text-corporate-600 dark:text-corporate-300">Transaction Address</div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-success-100 dark:bg-success-900/30 px-2 py-1 rounded flex-1">
                        {truncateAddress(tx.privacyProtection?.ephemeralAddress)}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(tx.privacyProtection?.ephemeralAddress || '', 'Ephemeral address')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <StellarAddressLink
                      address={tx.privacyProtection?.ephemeralAddress}
                      label="View Ephemeral Address"
                      className="text-xs"
                    />
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-corporate-600 dark:text-corporate-300">Derivation Path</div>
                  <code className="text-sm bg-corporate-100 dark:bg-corporate-800 px-2 py-1 rounded">
                    {tx.privacyProtection?.derivationPath}
                  </code>
                </div>
                
                <div>
                  <div className="text-sm text-corporate-600 dark:text-corporate-300">Transaction Index</div>
                  <div className="text-sm text-corporate-900 dark:text-corporate-100">
                    #{tx.privacyProtection?.transactionIndex}
                  </div>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-corporate-200 dark:border-corporate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600 dark:text-corporate-300">Key Used</span>
                    <Badge variant={tx.privacyProtection.keyStatus.isUsed ? 'success' : 'warning'}>
                      {tx.privacyProtection.keyStatus.isUsed ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600 dark:text-corporate-300">Key Destroyed</span>
                    <Badge variant={tx.privacyProtection.keyStatus.destroyedAt ? 'success' : 'warning'}>
                      {tx.privacyProtection.keyStatus.destroyedAt ? 'Yes' : 'Pending'}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-xs text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20 p-2 rounded">
                  ✅ External observers cannot correlate this transaction to your wallets
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Badge variant="warning">
                  No Privacy Protection
                </Badge>
                <p className="text-sm text-corporate-600 dark:text-corporate-300 mt-2">
                  This transaction does not use ephemeral keys
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Guardian Approvals */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-stellar-600" />
            Guardian Approvals
          </CardTitle>
          <CardDescription>
            Multi-signature approval progress ({tx.approvals?.length || 0}/{tx.requiredApprovals || 0} required)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tx.approvals && tx.approvals.length > 0 ? (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full bg-corporate-200 rounded-full h-2">
                <div 
                  className="bg-stellar-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${((tx.approvals.length) / (tx.requiredApprovals || 1)) * 100}%` 
                  }}
                ></div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Auth Method</TableHead>
                    <TableHead>Approved At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tx.approvals.map((approval: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <GuardianRoleBadge role={approval.guardianRole} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={approval.authMethod === 'OCRA_LIKE' ? 'success' : 'warning'}>
                          {approval.authMethod || 'TOTP'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-corporate-600">
                        {formatDate(approval.approvedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-corporate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-corporate-700 mb-2">
                No Approvals Yet
              </h3>
              <p className="text-corporate-500">
                {tx.requiresApproval 
                  ? 'Waiting for guardian approvals via WhatsApp notifications'
                  : 'This transaction was executed automatically'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Challenge Information */}
      {tx.challenge && (
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-warning-600" />
              Challenge Information
            </CardTitle>
            <CardDescription>
              OCRA-like challenge-response authentication details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-warning-50 rounded-lg">
                <div className="text-sm text-warning-600">Challenge Hash</div>
                <div className="text-lg font-mono font-bold text-warning-700">
                  {tx.challenge.challengeHash}
                </div>
              </div>
              
              <div className="text-center p-4 bg-corporate-50 rounded-lg">
                <div className="text-sm text-corporate-600">Status</div>
                <Badge variant={tx.challenge.isActive ? 'success' : 'error'}>
                  {tx.challenge.isActive ? 'Active' : 'Expired'}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-corporate-50 rounded-lg">
                <div className="text-sm text-corporate-600">Expires At</div>
                <div className="text-sm text-corporate-700">
                  {formatDate(tx.challenge.expiresAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2 text-corporate-600" />
            Technical Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-corporate-900">Blockchain Information</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-corporate-600">Transaction ID</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(tx.id, 'Transaction ID')}
                    className="h-auto p-1 text-xs"
                  >
                    {tx.id.slice(-16)}...
                    <Copy className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                
                {tx.stellarHash && (
                  <div className="space-y-2">
                    <span className="text-sm text-corporate-600">Stellar Hash</span>
                    <StellarExplorerLink
                      stellarHash={tx.stellarHash}
                      status={tx.status}
                      variant="detailed"
                      className="text-sm"
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-corporate-600">Network</span>
                  <Badge variant="outline">Testnet</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-corporate-900">Security Details</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-corporate-600">Requires Approval</span>
                  <Badge variant={tx.requiresApproval ? 'warning' : 'success'}>
                    {tx.requiresApproval ? 'Yes' : 'No'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-corporate-600">Threshold Scheme</span>
                  <Badge variant="outline">
                    {tx.thresholdScheme || 'AUTO'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-corporate-600">Required Approvals</span>
                  <span className="text-sm font-medium text-corporate-900">
                    {tx.requiredApprovals || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}