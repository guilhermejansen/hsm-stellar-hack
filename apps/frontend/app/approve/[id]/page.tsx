'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { transactionAPI, challengeAPI } from '@/lib/api';
import { TransactionStatusBadge } from '@/components/common/status-badge';
import { PageLoading } from '@/components/common/loading-spinner';
import { formatXLMWithSuffix, formatDate, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Smartphone,
  Key,
  ArrowRightLeft,
  Users,
  Timer,
  RefreshCw
} from 'lucide-react';

/**
 * Transaction Approval Page (WhatsApp Deep Link)
 * 
 * Guardian approval interface accessed via WhatsApp notifications
 */
export default function ApproveTransactionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const transactionId = params.id as string;
  const guardianRole = searchParams.get('guardian');
  const challengeHash = searchParams.get('challenge');

  const [responseCode, setResponseCode] = useState('');
  const [totpFallback, setTotpFallback] = useState('');
  const [authMethod, setAuthMethod] = useState<'OCRA_LIKE' | 'TOTP_FALLBACK'>('OCRA_LIKE');
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [approved, setApproved] = useState(false);

  // Fetch transaction details
  const { data: transaction, isLoading } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionAPI.getTransactionById(transactionId),
    enabled: !!transactionId,
    refetchInterval: 5000,
  });

  // Approve transaction mutation
  const approveMutation = useMutation({
    mutationFn: (data: {
      transactionId: string;
      guardianId: string;
      challengeResponse?: string;
      totpCode?: string;
      authMethod: 'OCRA_LIKE' | 'TOTP_FALLBACK';
    }) => transactionAPI.approveTransaction(transactionId, data),
    onSuccess: (result) => {
      setApproved(true);
      if (result.data?.executionReady) {
        toast.success('Transaction approved and executed successfully! 🎉');
      } else {
        toast.success(`Transaction approved! ${result.data?.remainingApprovals || 0} more approval(s) needed.`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Approval failed');
    },
  });

  // Challenge timer countdown
  useEffect(() => {
    if (!transaction?.data?.challenge?.expiresAt) return;

    const expiresAt = new Date(transaction.data.challenge.expiresAt).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [transaction?.data?.challenge?.expiresAt]);

  const handleApproval = async () => {
    if (!transaction?.data || approved) return;

    // For demo purposes, we'll use a mock guardian ID
    const guardianId = 'demo-guardian-id';
    
    const approvalData = {
      transactionId,
      guardianId,
      authMethod,
      ...(authMethod === 'OCRA_LIKE' 
        ? { challengeResponse: responseCode }
        : { totpCode: totpFallback }
      ),
    };

    try {
      await approveMutation.mutateAsync(approvalData);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return <PageLoading text="Loading transaction for approval..." />;
  }

  if (!transaction?.data) {
    return (
      <div className="min-h-screen bg-corporate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertTriangle className="w-16 h-16 text-warning-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-corporate-900 mb-2">
              Transaction Not Found
            </h1>
            <p className="text-corporate-600">
              The transaction may have been processed or the link has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tx = transaction.data;

  return (
    <div className="min-h-screen bg-corporate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="p-3 bg-warning-100 rounded-full w-fit mx-auto">
            <Shield className="w-8 h-8 text-warning-600" />
          </div>
          <h1 className="text-2xl font-bold text-corporate-900">
            Guardian Approval Required
          </h1>
          <p className="text-corporate-600">
            {guardianRole} approval needed for this transaction
          </p>
        </div>

        {/* Transaction Summary */}
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowRightLeft className="w-5 h-5 mr-2 text-stellar-600" />
              Transaction Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-corporate-600">Amount</div>
                <div className="text-xl font-bold text-stellar-700">
                  {formatXLMWithSuffix(tx.amount)}
                </div>
              </div>
              <div>
                <div className="text-sm text-corporate-600">Status</div>
                <TransactionStatusBadge status={tx.status} />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-corporate-600">Destination:</span>
                <code className="text-sm bg-corporate-100 px-2 py-1 rounded">
                  {truncateAddress(tx.toAddress)}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-corporate-600">Type:</span>
                <Badge variant="outline">{tx.txType}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-corporate-600">Created:</span>
                <span className="text-sm">{formatDate(tx.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Challenge Timer */}
        {challengeHash && timeRemaining > 0 && (
          <Card className="corporate-card border-warning-200 bg-warning-50">
            <CardHeader>
              <CardTitle className="flex items-center text-warning-700">
                <Timer className="w-5 h-5 mr-2" />
                Challenge Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-warning-700">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-warning-600">Time remaining</div>
              </div>
              <Progress 
                value={(timeRemaining / 300) * 100} 
                className="h-2"
              />
              <div className="text-xs text-warning-600 text-center">
                Challenge expires in {Math.floor(timeRemaining / 60)} minutes
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval Form */}
        {!approved && timeRemaining > 0 ? (
          <Card className="corporate-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2 text-stellar-600" />
                Guardian Authentication
              </CardTitle>
              <CardDescription>
                Choose your authentication method to approve this transaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auth Method Selection */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={authMethod === 'OCRA_LIKE' ? 'corporate' : 'outline'}
                  onClick={() => setAuthMethod('OCRA_LIKE')}
                  className="h-auto p-4"
                >
                  <div className="text-center">
                    <Shield className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">OCRA-like</div>
                    <div className="text-xs opacity-80">Challenge Response</div>
                  </div>
                </Button>
                
                <Button
                  variant={authMethod === 'TOTP_FALLBACK' ? 'corporate' : 'outline'}
                  onClick={() => setAuthMethod('TOTP_FALLBACK')}
                  className="h-auto p-4"
                >
                  <div className="text-center">
                    <Smartphone className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">TOTP Fallback</div>
                    <div className="text-xs opacity-80">Standard TOTP</div>
                  </div>
                </Button>
              </div>

              {/* OCRA-like Challenge */}
              {authMethod === 'OCRA_LIKE' && challengeHash && (
                <div className="space-y-4">
                  <Alert variant="info">
                    <Shield className="w-4 h-4" />
                    <AlertDescription>
                      <strong>OCRA-like Authentication:</strong> Enter the challenge hash into your 
                      authenticator app as additional data, then enter the generated response code.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-4 bg-warning-50 rounded-lg">
                    <div className="text-sm font-medium text-warning-700 mb-2">
                      Challenge Hash:
                    </div>
                    <div className="text-2xl font-mono font-bold text-warning-800 text-center p-3 bg-white rounded border-2 border-dashed border-warning-300">
                      {challengeHash}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="challengeResponse">Response Code</Label>
                    <Input
                      id="challengeResponse"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={responseCode}
                      onChange={(e) => setResponseCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      className="text-center text-2xl font-mono"
                    />
                    <p className="text-sm text-corporate-600">
                      6-digit code generated by your authenticator app using the challenge
                    </p>
                  </div>
                </div>
              )}

              {/* TOTP Fallback */}
              {authMethod === 'TOTP_FALLBACK' && (
                <div className="space-y-4">
                  <Alert variant="warning">
                    <Smartphone className="w-4 h-4" />
                    <AlertDescription>
                      <strong>TOTP Fallback:</strong> Use your standard TOTP code from the 
                      authenticator app without any additional challenge data.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totpCode">TOTP Code</Label>
                    <Input
                      id="totpCode"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={totpFallback}
                      onChange={(e) => setTotpFallback(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      className="text-center text-2xl font-mono"
                    />
                    <p className="text-sm text-corporate-600">
                      Standard 6-digit TOTP code from your authenticator app
                    </p>
                  </div>
                </div>
              )}

              {/* Approval Button */}
              <Button
                onClick={handleApproval}
                disabled={
                  approveMutation.isPending ||
                  (authMethod === 'OCRA_LIKE' && responseCode.length !== 6) ||
                  (authMethod === 'TOTP_FALLBACK' && totpFallback.length !== 6) ||
                  timeRemaining <= 0
                }
                variant="corporate"
                size="lg"
                className="w-full"
              >
                {approveMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Approving Transaction...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Transaction
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : approved ? (
          <Card className="corporate-card border-success-200 bg-success-50">
            <CardContent className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-success-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-success-900 mb-2">
                Transaction Approved Successfully!
              </h2>
              <p className="text-success-700">
                Your approval has been recorded and the transaction is being processed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="corporate-card border-error-200 bg-error-50">
            <CardContent className="text-center py-8">
              <Clock className="w-16 h-16 text-error-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-error-900 mb-2">
                Challenge Expired
              </h2>
              <p className="text-error-700">
                The approval window has closed. Please contact the transaction initiator.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!approved && timeRemaining > 0 && (
          <Card className="corporate-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="w-5 h-5 mr-2 text-stellar-600" />
                Authentication Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {authMethod === 'OCRA_LIKE' ? (
                <div className="space-y-3">
                  <div className="text-sm text-corporate-700 font-medium">
                    OCRA-like Challenge-Response Steps:
                  </div>
                  <ol className="space-y-2 text-sm text-corporate-600">
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">1</span>
                      <span>Open your Google Authenticator app</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">2</span>
                      <span>Find "Stellar Custody MVP" entry</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">3</span>
                      <span>Enter challenge hash <strong>{challengeHash}</strong> as additional data</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">4</span>
                      <span>Generate and enter the 6-digit response code</span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-corporate-700 font-medium">
                    Standard TOTP Steps:
                  </div>
                  <ol className="space-y-2 text-sm text-corporate-600">
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">1</span>
                      <span>Open your Google Authenticator app</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">2</span>
                      <span>Find "Stellar Custody MVP" entry</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">3</span>
                      <span>Enter the current 6-digit TOTP code</span>
                    </li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}