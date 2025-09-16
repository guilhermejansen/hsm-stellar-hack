'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WalletDistributionChart } from '@/components/common/data-charts';
import { useAuth } from '@/context/auth-context';
import { walletAPI } from '@/lib/api';
import { queryKeys } from '@/context/query-provider';
import { WalletTypeBadge } from '@/components/common/status-badge';
import { CardLoading } from '@/components/common/loading-spinner';
import { formatXLMWithSuffix, formatPercentage, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Wallet, 
  Snowflake, 
  Flame, 
  Scale, 
  Shield, 
  TrendingUp,
  ArrowUpDown,
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  PieChart
} from 'lucide-react';

/**
 * Wallets Management Page
 * 
 * Complete Hot/Cold wallet management with BIP32 hierarchy visualization
 */
export default function WalletsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [totpCode, setTotpCode] = useState('');
  const [isRebalancing, setIsRebalancing] = useState(false);

  // Fetch wallet data
  const { data: hotWallet, isLoading: hotLoading } = useQuery({
    queryKey: queryKeys.hotWallet,
    queryFn: () => walletAPI.getHotWallet(),
    refetchInterval: 30000,
  });

  const { data: coldWallet, isLoading: coldLoading } = useQuery({
    queryKey: queryKeys.coldWallet,
    queryFn: () => walletAPI.getColdWallet(),
    refetchInterval: 30000,
  });

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: queryKeys.walletBalances,
    queryFn: () => walletAPI.getWalletBalances(),
    refetchInterval: 30000,
  });

  // Rebalance mutation
  const rebalanceMutation = useMutation({
    mutationFn: (data: { guardianId: string; totpCode: string; forceRebalance?: boolean }) =>
      walletAPI.rebalanceWallets(data.guardianId, data.totpCode, data.forceRebalance),
    onSuccess: () => {
      toast.success('Wallet rebalancing completed successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.walletBalances });
      queryClient.invalidateQueries({ queryKey: queryKeys.hotWallet });
      queryClient.invalidateQueries({ queryKey: queryKeys.coldWallet });
      setTotpCode('');
      setIsRebalancing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Rebalancing failed');
    },
  });

  const handleRebalance = async () => {
    if (!user?.id || !totpCode) return;
    
    setIsRebalancing(true);
    try {
      await rebalanceMutation.mutateAsync({
        guardianId: user.id,
        totpCode,
        forceRebalance: false,
      });
    } finally {
      setIsRebalancing(false);
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  const canRebalance = user?.isGuardian && user?.hsmActivated;
  const isLoading = hotLoading || coldLoading || balancesLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900 dark:text-corporate-100">Wallet Management</h1>
          <p className="text-corporate-600 dark:text-corporate-300 mt-1">
            BIP32 hierarchical wallets with 95%/5% Hot/Cold distribution
          </p>
        </div>
        
        {canRebalance && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="corporate" size="lg">
                <Scale className="w-4 h-4 mr-2" />
                Rebalance Wallets
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rebalance Wallets</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Alert variant="info">
                  <Scale className="w-4 h-4" />
                  <AlertDescription>
                    This will rebalance wallets to maintain the optimal 95% Cold / 5% Hot distribution.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="rebalanceTotp">TOTP Code</Label>
                  <Input
                    id="rebalanceTotp"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="text-center text-lg font-mono"
                  />
                </div>
                
                <Button 
                  onClick={handleRebalance}
                  disabled={totpCode.length !== 6 || isRebalancing}
                  className="w-full"
                  variant="corporate"
                >
                  {isRebalancing ? 'Rebalancing...' : 'Execute Rebalance'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Balance */}
        <Card className="corporate-card bg-gradient-to-br from-stellar-50 to-corporate-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-stellar-600" />
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-corporate-200 rounded w-32 mb-2"></div>
                <div className="h-4 bg-corporate-200 rounded w-24"></div>
              </div>
            ) : (
              <div>
                <div className="text-3xl font-bold text-stellar-700">
                  {formatXLMWithSuffix(balances?.data?.total || '0')}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  {balances?.data?.needsRebalancing ? (
                    <Badge variant="warning">Needs Rebalancing</Badge>
                  ) : (
                    <Badge variant="success">Balanced</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cold Wallet */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Snowflake className="w-5 h-5 mr-2 text-stellar-600" />
              Cold Wallet (95%)
            </CardTitle>
            <CardDescription>Master wallet - m/0'</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardLoading />
            ) : coldWallet?.data ? (
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-stellar-700">
                    {formatXLMWithSuffix(coldWallet.data.balance)}
                  </div>
                  <div className="text-sm text-corporate-600">
                    {formatPercentage(balances?.data?.cold?.percentage || 0)} of total
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-corporate-500">Address:</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyAddress(coldWallet.data?.publicKey || '')}
                      className="h-auto p-1 text-xs"
                    >
                      {truncateAddress(coldWallet.data.publicKey)}
                      <Copy className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-corporate-500">TOTP Required:</span>
                    <Badge variant={coldWallet.data.requiresTOTP ? 'success' : 'warning'}>
                      {coldWallet.data.requiresTOTP ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-corporate-500">Cold wallet not available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hot Wallet */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Flame className="w-5 h-5 mr-2 text-warning-600" />
              Hot Wallet (5%)
            </CardTitle>
            <CardDescription>Operational wallet - m/0'/0'</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardLoading />
            ) : hotWallet?.data ? (
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-warning-700">
                    {formatXLMWithSuffix(hotWallet.data.balance)}
                  </div>
                  <div className="text-sm text-corporate-600">
                    {formatPercentage(balances?.data?.hot?.percentage || 0)} of total
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-corporate-500">Address:</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyAddress(hotWallet.data?.publicKey || '')}
                      className="h-auto p-1 text-xs"
                    >
                      {truncateAddress(hotWallet.data.publicKey)}
                      <Copy className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-corporate-500">Max Balance:</span>
                    <span className="text-xs text-corporate-600">
                      {hotWallet.data.maxBalance ? formatXLMWithSuffix(hotWallet.data.maxBalance) : 'Dynamic'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-corporate-500">Hot wallet not available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Wallet Hierarchy Visualization */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowUpDown className="w-5 h-5 mr-2 text-stellar-600" />
            BIP32 Wallet Hierarchy
          </CardTitle>
          <CardDescription>
            Hierarchical deterministic wallet structure with HSM protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Hierarchy Diagram */}
            <div className="bg-corporate-50 rounded-lg p-6">
              <div className="space-y-4">
                {/* Master Key */}
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-stellar-100 rounded-lg border border-stellar-200">
                    <Shield className="w-4 h-4 mr-2 text-stellar-600" />
                    <span className="font-mono text-sm">Master Key (m)</span>
                  </div>
                  <p className="text-xs text-corporate-500 mt-1">Root key in HSM partition</p>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-corporate-300"></div>
                </div>

                {/* Cold Wallet */}
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-stellar-100 rounded-lg border border-stellar-200">
                    <Snowflake className="w-4 h-4 mr-2 text-stellar-600" />
                    <span className="font-mono text-sm">Cold Wallet (m/0')</span>
                  </div>
                  <p className="text-xs text-corporate-500 mt-1">95% of funds - Secure storage</p>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-corporate-300"></div>
                </div>

                {/* Hot Wallet */}
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-warning-100 rounded-lg border border-warning-200">
                    <Flame className="w-4 h-4 mr-2 text-warning-600" />
                    <span className="font-mono text-sm">Hot Wallet (m/0'/0')</span>
                  </div>
                  <p className="text-xs text-corporate-500 mt-1">5% of funds - Operations</p>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-corporate-300"></div>
                </div>

                {/* Ephemeral Keys */}
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-corporate-100 rounded-lg border border-corporate-200">
                    <RefreshCw className="w-4 h-4 mr-2 text-corporate-600" />
                    <span className="font-mono text-sm">Transaction Keys (m/0'/0'/N')</span>
                  </div>
                  <p className="text-xs text-corporate-500 mt-1">Privacy protection - New address per transaction</p>
                </div>
              </div>
            </div>

            {/* Balance Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-corporate-900 dark:text-corporate-100">Current Distribution</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-stellar-50 dark:bg-stellar-900/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Snowflake className="w-4 h-4 text-stellar-600" />
                      <span className="text-sm font-medium text-corporate-900 dark:text-corporate-100">Cold Wallet</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-corporate-900 dark:text-corporate-100">{formatPercentage(balances?.data?.cold?.percentage || 0)}</div>
                      <div className="text-xs text-corporate-500 dark:text-corporate-400">Target: 95%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-warning-50 dark:bg-warning-900/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Flame className="w-4 h-4 text-warning-600" />
                      <span className="text-sm font-medium text-corporate-900 dark:text-corporate-100">Hot Wallet</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-corporate-900 dark:text-corporate-100">{formatPercentage(balances?.data?.hot?.percentage || 0)}</div>
                      <div className="text-xs text-corporate-500 dark:text-corporate-400">Target: 5%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-corporate-900 dark:text-corporate-100">Rebalancing Status</h4>
                <div className="p-4 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
                  {balances?.data?.needsRebalancing ? (
                    <div className="flex items-center space-x-2 text-warning-700 dark:text-warning-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Rebalancing Recommended</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-success-700 dark:text-success-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Optimal Distribution</span>
                    </div>
                  )}
                  <p className="text-xs text-corporate-600 dark:text-corporate-300 mt-1">
                    {balances?.data?.needsRebalancing 
                      ? 'Wallet distribution is outside optimal range'
                      : 'Wallet distribution is within acceptable limits'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Wallet Distribution Visualization */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-stellar-600" />
            Wallet Distribution Analysis
          </CardTitle>
          <CardDescription>
            Visual representation of Hot/Cold wallet balance distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <WalletDistributionChart data={balances?.data} />
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-corporate-900 dark:text-corporate-100">Distribution Analysis</h4>
              <div className="space-y-3">
                <div className="p-3 bg-stellar-50 dark:bg-stellar-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stellar-700 dark:text-stellar-300">Target Distribution</span>
                    <Badge variant="outline">95% / 5%</Badge>
                  </div>
                  <p className="text-xs text-stellar-600 dark:text-stellar-400 mt-1">
                    Optimal security and operational balance
                  </p>
                </div>
                
                <div className="p-3 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-corporate-700 dark:text-corporate-300">Current Status</span>
                    {balances?.data?.needsRebalancing ? (
                      <Badge variant="warning">Needs Rebalancing</Badge>
                    ) : (
                      <Badge variant="success">Optimal</Badge>
                    )}
                  </div>
                  <p className="text-xs text-corporate-600 dark:text-corporate-300 mt-1">
                    {balances?.data?.needsRebalancing 
                      ? 'Distribution outside target range'
                      : 'Distribution within acceptable limits'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Detailed Wallet Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cold Wallet Details */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Snowflake className="w-5 h-5 mr-2 text-stellar-600" />
              Cold Wallet Details
            </CardTitle>
            <CardDescription>Secure storage wallet (95% of funds)</CardDescription>
          </CardHeader>
          <CardContent>
            {coldLoading ? (
              <CardLoading />
            ) : coldWallet?.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-corporate-600">Balance</div>
                    <div className="text-xl font-bold text-stellar-700">
                      {formatXLMWithSuffix(coldWallet.data.balance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-corporate-600">Reserved</div>
                    <div className="text-xl font-bold text-warning-700">
                      {formatXLMWithSuffix(coldWallet.data.reservedBalance)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-corporate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">Derivation Path</span>
                    <code className="text-sm bg-corporate-100 px-2 py-1 rounded">
                      {coldWallet.data.derivationPath}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">HSM Protected</span>
                    <Badge variant={coldWallet.data.isHSMProtected ? 'success' : 'error'}>
                      {coldWallet.data.isHSMProtected ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">TOTP Required</span>
                    <Badge variant={coldWallet.data.requiresTOTP ? 'success' : 'warning'}>
                      {coldWallet.data.requiresTOTP ? 'Required' : 'Not Required'}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-corporate-200">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyAddress(coldWallet.data?.publicKey || '')}
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-corporate-500 dark:text-corporate-400">Cold wallet not available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hot Wallet Details */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Flame className="w-5 h-5 mr-2 text-warning-600" />
              Hot Wallet Details
            </CardTitle>
            <CardDescription>Operational wallet (5% of funds)</CardDescription>
          </CardHeader>
          <CardContent>
            {hotLoading ? (
              <CardLoading />
            ) : hotWallet?.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-corporate-600">Balance</div>
                    <div className="text-xl font-bold text-warning-700">
                      {formatXLMWithSuffix(hotWallet.data.balance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-corporate-600">Reserved</div>
                    <div className="text-xl font-bold text-error-700">
                      {formatXLMWithSuffix(hotWallet.data.reservedBalance)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-corporate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">Derivation Path</span>
                    <code className="text-sm bg-corporate-100 px-2 py-1 rounded">
                      {hotWallet.data.derivationPath}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">Parent Wallet</span>
                    <span className="text-sm text-corporate-600">
                      {hotWallet.data.parentWallet ? truncateAddress(hotWallet.data.parentWallet.publicKey) : 'None'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">TOTP Required</span>
                    <Badge variant={hotWallet.data.requiresTOTP ? 'success' : 'warning'}>
                      {hotWallet.data.requiresTOTP ? 'Required' : 'Not Required'}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-corporate-200">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyAddress(hotWallet.data?.publicKey || '')}
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-corporate-500 dark:text-corporate-400">Hot wallet not available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}