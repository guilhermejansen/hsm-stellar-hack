'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { privacyAPI, transactionAPI } from '@/lib/api';
import { queryKeys } from '@/context/query-provider';
import { PrivacyScoreBadge } from '@/components/common/status-badge';
import { CardLoading } from '@/components/common/loading-spinner';
import { useAuth } from '@/context/auth-context';
import { 
  Shield, 
  Eye, 
  RefreshCw, 
  TrendingUp, 
  Lock,
  Key,
  Activity,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

/**
 * Privacy Protection Page
 * 
 * Complete privacy monitoring and ephemeral key management
 */
export default function PrivacyPage() {
  const { user } = useAuth();

  // Fetch privacy data
  const { data: ephemeralStats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.ephemeralKeyStats,
    queryFn: () => privacyAPI.getEphemeralKeyStats(),
    refetchInterval: 30000,
  });

  const { data: privacyReport, isLoading: reportLoading } = useQuery({
    queryKey: queryKeys.transactionPrivacyReport,
    queryFn: () => privacyAPI.getTransactionPrivacyReport(),
    refetchInterval: 60000,
  });

  const { data: userVerification, isLoading: verificationLoading } = useQuery({
    queryKey: ['user-privacy-verification', user?.id],
    queryFn: () => privacyAPI.verifyUserPrivacy(user?.id || ''),
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const isLoading = statsLoading || reportLoading || verificationLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900">Privacy Protection</h1>
          <p className="text-corporate-600 mt-1">
            Ephemeral transaction keys and correlation prevention monitoring
          </p>
        </div>
      </div>

      {/* Privacy Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {isLoading ? (
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
                    <p className="metric-label">Privacy Score</p>
                    <p className="metric-value text-success-700">
                      {Math.round(ephemeralStats?.data?.privacyScore || 100)}%
                    </p>
                  </div>
                  <Eye className="w-8 h-8 text-success-600" />
                </div>
                <div className="mt-2">
                  <PrivacyScoreBadge score={ephemeralStats?.data?.privacyScore || 100} />
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="metric-label">Ephemeral Keys</p>
                    <p className="metric-value text-stellar-700">
                      {ephemeralStats?.data?.total || 0}
                    </p>
                  </div>
                  <Key className="w-8 h-8 text-stellar-600" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-corporate-600">
                    {ephemeralStats?.data?.used || 0} used, {ephemeralStats?.data?.expired || 0} destroyed
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="metric-label">Active Keys</p>
                    <p className="metric-value text-warning-700">
                      {ephemeralStats?.data?.active || 0}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-warning-600" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-corporate-600">
                    Awaiting transaction completion
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="metric-label">Recent 24h</p>
                    <p className="metric-value text-corporate-700">
                      {ephemeralStats?.data?.recent24h || 0}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-corporate-600" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-corporate-600">
                    Keys generated today
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Privacy Protection Status */}
      <Card className="corporate-card bg-gradient-to-br from-success-50 to-stellar-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="w-5 h-5 mr-2 text-success-600" />
            Privacy Protection Status
          </CardTitle>
          <CardDescription>
            Complete transaction privacy through ephemeral address generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <CardLoading />
          ) : privacyReport?.data ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-success-700">
                  {privacyReport.data.summary.ephemeralTransactions}
                </div>
                <div className="text-sm text-corporate-600">Privacy Protected Transactions</div>
                <div className="text-xs text-success-600 mt-1">
                  Out of {privacyReport.data.summary.totalTransactions} total
                </div>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-stellar-700">
                  {privacyReport.data.summary.uniqueAddressesGenerated}
                </div>
                <div className="text-sm text-corporate-600">Unique Addresses Generated</div>
                <div className="text-xs text-stellar-600 mt-1">
                  Each transaction from new address
                </div>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-corporate-700">
                  {Math.round(privacyReport.data.summary.privacyCompliance)}%
                </div>
                <div className="text-sm text-corporate-600">Privacy Compliance</div>
                <div className="mt-1">
                  <Badge variant={
                    privacyReport.data.summary.correlationRisk === 'LOW' ? 'success' :
                    privacyReport.data.summary.correlationRisk === 'MEDIUM' ? 'warning' : 'error'
                  }>
                    {privacyReport.data.summary.correlationRisk} Risk
                  </Badge>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Privacy Benefits */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-stellar-600" />
            Privacy Benefits & Protection
          </CardTitle>
          <CardDescription>
            How ephemeral transaction keys protect your financial privacy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-corporate-900">Privacy Protection Features</h4>
              <div className="space-y-3">
                {privacyReport?.data?.privacy?.privacyBenefits?.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-corporate-600">{benefit}</span>
                  </div>
                )) || (
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-success-500 mt-0.5" />
                      <span className="text-sm text-corporate-600">External observers cannot correlate transactions</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-success-500 mt-0.5" />
                      <span className="text-sm text-corporate-600">Each transaction appears from random address</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-success-500 mt-0.5" />
                      <span className="text-sm text-corporate-600">Wallet balances cannot be traced</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-success-500 mt-0.5" />
                      <span className="text-sm text-corporate-600">Complete financial privacy protection</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-corporate-900">Recommendations</h4>
              <div className="space-y-3">
                {privacyReport?.data?.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    {rec.startsWith('✅') ? (
                      <CheckCircle className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="text-sm text-corporate-600">{rec}</span>
                  </div>
                )) || (
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-success-500 mt-0.5" />
                    <span className="text-sm text-corporate-600">Privacy protection operating optimally</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="w-5 h-5 mr-2 text-corporate-600" />
            Ephemeral Key Technical Details
          </CardTitle>
          <CardDescription>
            BIP32 hierarchical key derivation and lifecycle management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Key Hierarchy Diagram */}
            <div className="bg-corporate-50 rounded-lg p-6">
              <h4 className="font-medium text-corporate-900 mb-4">Key Derivation Hierarchy</h4>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-stellar-100 rounded-lg">
                    <Shield className="w-4 h-4 mr-2 text-stellar-600" />
                    <span className="font-mono text-sm">Master Key (m)</span>
                  </div>
                  <div className="text-xs text-corporate-500 mt-1">Root in HSM partition</div>
                </div>

                <div className="flex justify-center">
                  <div className="w-px h-6 bg-corporate-300"></div>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-stellar-100 rounded-lg">
                    <span className="font-mono text-sm">Cold Wallet (m/0')</span>
                  </div>
                  <div className="text-xs text-corporate-500 mt-1">95% of funds - Static address</div>
                </div>

                <div className="flex justify-center">
                  <div className="w-px h-6 bg-corporate-300"></div>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-warning-100 rounded-lg">
                    <span className="font-mono text-sm">Hot Wallet (m/0'/0')</span>
                  </div>
                  <div className="text-xs text-corporate-500 mt-1">5% of funds - Static address</div>
                </div>

                <div className="flex justify-center">
                  <div className="w-px h-6 bg-corporate-300"></div>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-success-100 rounded-lg">
                    <RefreshCw className="w-4 h-4 mr-2 text-success-600" />
                    <span className="font-mono text-sm">Transaction Keys (m/0'/0'/N')</span>
                  </div>
                  <div className="text-xs text-corporate-500 mt-1">NEW ADDRESS per transaction</div>
                </div>
              </div>
            </div>

            {/* Privacy Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-corporate-900">Key Lifecycle Statistics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-corporate-50 rounded-lg">
                    <span className="text-sm text-corporate-600">Total Generated</span>
                    <span className="font-bold text-corporate-900">{ephemeralStats?.data?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-warning-50 rounded-lg">
                    <span className="text-sm text-warning-600">Currently Active</span>
                    <span className="font-bold text-warning-700">{ephemeralStats?.data?.active || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                    <span className="text-sm text-success-600">Used & Destroyed</span>
                    <span className="font-bold text-success-700">{ephemeralStats?.data?.expired || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-stellar-50 rounded-lg">
                    <span className="text-sm text-stellar-600">Usage Rate</span>
                    <span className="font-bold text-stellar-700">
                      {Math.round(ephemeralStats?.data?.usageRate || 0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-corporate-900">Privacy Compliance</h4>
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-success-50 to-stellar-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-success-700">Correlation Risk</span>
                      <Badge variant={
                        userVerification?.data?.correlationRisk === 'LOW' ? 'success' :
                        userVerification?.data?.correlationRisk === 'MEDIUM' ? 'warning' : 'error'
                      }>
                        {userVerification?.data?.correlationRisk || 'LOW'} Risk
                      </Badge>
                    </div>
                    <p className="text-xs text-success-600">
                      External transaction correlation prevention
                    </p>
                  </div>
                  
                  <div className="p-4 bg-stellar-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-stellar-700">Privacy Protection</span>
                      <Badge variant="success">
                        {ephemeralStats?.data?.privacyProtection || 'EXCELLENT'}
                      </Badge>
                    </div>
                    <p className="text-xs text-stellar-600">
                      Overall privacy protection level
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Report */}
      {privacyReport?.data && (
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-stellar-600" />
              Privacy Protection Report
            </CardTitle>
            <CardDescription>
              Detailed analysis of transaction privacy and correlation prevention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-stellar-50 to-corporate-50 rounded-lg">
                  <div className="text-2xl font-bold text-stellar-700">
                    {privacyReport.data.summary.totalTransactions}
                  </div>
                  <div className="text-sm text-corporate-600">Total Transactions</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-success-50 to-stellar-50 rounded-lg">
                  <div className="text-2xl font-bold text-success-700">
                    {privacyReport.data.summary.ephemeralTransactions}
                  </div>
                  <div className="text-sm text-corporate-600">Privacy Protected</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-warning-50 to-corporate-50 rounded-lg">
                  <div className="text-2xl font-bold text-warning-700">
                    {privacyReport.data.privacy.addressReuse}
                  </div>
                  <div className="text-sm text-corporate-600">Address Reuse</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-corporate-50 to-stellar-50 rounded-lg">
                  <div className="text-2xl font-bold text-corporate-700">
                    {Math.round(privacyReport.data.summary.privacyCompliance)}%
                  </div>
                  <div className="text-sm text-corporate-600">Compliance Score</div>
                </div>
              </div>

              {/* Technical Explanation */}
              <div className="bg-stellar-50 rounded-lg p-6">
                <h4 className="font-medium text-stellar-900 mb-3">How Privacy Protection Works</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-white rounded border">
                    <div className="flex items-center space-x-2 mb-2">
                      <Key className="w-4 h-4 text-stellar-600" />
                      <span className="font-medium text-stellar-700">Generation</span>
                    </div>
                    <p className="text-corporate-600">
                      Each transaction generates a unique ephemeral key at path m/0'/0'/N' 
                      where N increments for each transaction.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-white rounded border">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-4 h-4 text-warning-600" />
                      <span className="font-medium text-warning-700">Usage</span>
                    </div>
                    <p className="text-corporate-600">
                      The ephemeral key signs the transaction once, creating a 
                      completely new source address for external observers.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-white rounded border">
                    <div className="flex items-center space-x-2 mb-2">
                      <RefreshCw className="w-4 h-4 text-success-600" />
                      <span className="font-medium text-success-700">Destruction</span>
                    </div>
                    <p className="text-corporate-600">
                      After signing, the ephemeral key is permanently destroyed 
                      in the HSM, ensuring it can never be used again.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}