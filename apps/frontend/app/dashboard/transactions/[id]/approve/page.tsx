'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { transactionAPI, guardianAPI } from '@/lib/api';
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
  RefreshCw,
  ArrowLeft,
  UserCheck,
  Crown,
  DollarSign,
  Settings,
  Eye,
  ArrowRight,
  PartyPopper
} from 'lucide-react';
import Link from 'next/link';

/**
 * Guardian Information Interface
 */
interface GuardianInfo {
  id: string;
  role: 'CEO' | 'CFO' | 'CTO';
  name: string;
  email: string;
  phone: string;
  isApproved: boolean;
  totpCode: string;
  approvedAt?: string;
  isActive: boolean;
  totpVerified: boolean;
  hsmActivated: boolean;
}

/**
 * Integrated Transaction Approval Page
 * 
 * Allows immediate approval by entering guardian TOTPs in one place
 */
export default function IntegratedApprovalPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;

  const [guardians, setGuardians] = useState<GuardianInfo[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes
  const [completedApprovals, setCompletedApprovals] = useState(0);
  const [executionCompleted, setExecutionCompleted] = useState(false);

  // Fetch transaction details
  const { data: transaction, isLoading, refetch } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionAPI.getTransactionById(transactionId),
    enabled: !!transactionId,
    refetchInterval: 5000,
  });

  // Fetch active guardians
  const { data: activeGuardians, isLoading: isLoadingGuardians } = useQuery({
    queryKey: ['guardians', 'active'],
    queryFn: () => guardianAPI.getActiveGuardians(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Individual guardian approval mutation
  const approveMutation = useMutation({
    mutationFn: async ({ guardianId, totpCode }: { guardianId: string; totpCode: string }) => {
      return transactionAPI.approveTransaction(transactionId, {
        transactionId,
        guardianId,
        totpCode,
        authMethod: 'TOTP_FALLBACK',
      });
    },
    onSuccess: (result, variables) => {
      const { guardianId } = variables;
      
      setGuardians(prev => 
        prev.map(g => 
          g.id === guardianId 
            ? { ...g, isApproved: true, approvedAt: new Date().toISOString() }
            : g
        )
      );

      setCompletedApprovals(prev => prev + 1);

      if (result.data?.executionReady) {
        setExecutionCompleted(true);
        toast.success('🎉 Transaction approved and executed successfully!');
        
        // Auto redirect after success
        setTimeout(() => {
          router.push('/dashboard/transactions');
        }, 3000);
      } else {
        toast.success(`Guardian approved! ${result.data?.remainingApprovals || 0} more needed.`);
      }
    },
    onError: (error: any, variables) => {
      toast.error(`${variables.guardianId} approval failed: ${error.response?.data?.error?.message || 'Unknown error'}`);
    },
  });

  // Initialize guardians from API data
  useEffect(() => {
    if (activeGuardians?.data && guardians.length === 0) {
      const initialGuardians = activeGuardians.data.map((guardian: any) => ({
        id: guardian.id,
        role: guardian.role,
        name: guardian.name,
        email: guardian.email,
        phone: guardian.phone,
        isApproved: false,
        totpCode: '',
        approvedAt: undefined,
        isActive: guardian.isActive,
        totpVerified: guardian.totpVerified,
        hsmActivated: guardian.hsmActivated,
      }));
      
      setGuardians(initialGuardians);
    }
  }, [activeGuardians, guardians.length]);

  // Update guardian approval status from transaction data
  useEffect(() => {
    if (transaction?.data?.approvals && guardians.length > 0) {
      const approvals = transaction.data.approvals;
      
      setGuardians(prev => 
        prev.map(guardian => {
          const approval = approvals.find((a: any) => 
            a.guardianRole === guardian.role
          );
          
          return approval 
            ? { 
                ...guardian, 
                isApproved: true, 
                approvedAt: approval.approvedAt 
              }
            : guardian;
        })
      );
      
      setCompletedApprovals(approvals.length);
    }
  }, [transaction?.data?.approvals, guardians.length]);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle TOTP input changes
  const handleTotpChange = (guardianId: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6);
    
    setGuardians(prev => 
      prev.map(g => 
        g.id === guardianId 
          ? { ...g, totpCode: numericValue }
          : g
      )
    );
  };

  // Approve individual guardian
  const handleGuardianApproval = async (guardian: GuardianInfo) => {
    if (guardian.totpCode.length !== 6 || guardian.isApproved) return;
    
    try {
      await approveMutation.mutateAsync({
        guardianId: guardian.id,
        totpCode: guardian.totpCode,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Approve all guardians with valid TOTPs
  const handleApproveAll = async () => {
    setIsProcessing(true);

    const validGuardians = guardians.filter(g => 
      g.totpCode.length === 6 && !g.isApproved
    );

    if (validGuardians.length === 0) {
      toast.error('Please enter valid TOTP codes');
      setIsProcessing(false);
      return;
    }

    try {
      // Process approvals sequentially to avoid conflicts
      for (const guardian of validGuardians) {
        if (!guardian.isApproved) {
          await approveMutation.mutateAsync({
            guardianId: guardian.id,
            totpCode: guardian.totpCode,
          });
          
          // Small delay between approvals
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      // Individual errors handled by mutation
    }

    setIsProcessing(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'CEO': return <Crown className="w-5 h-5 text-warning-600" />;
      case 'CFO': return <DollarSign className="w-5 h-5 text-stellar-600" />;
      case 'CTO': return <Settings className="w-5 h-5 text-corporate-600" />;
      default: return <Shield className="w-5 h-5 text-corporate-600" />;
    }
  };

  if (isLoading || isLoadingGuardians) {
    return <PageLoading text="Loading transaction and guardian data..." />;
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
              The transaction may have been processed or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeGuardians?.data || activeGuardians.data.length === 0) {
    return (
      <div className="min-h-screen bg-corporate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Shield className="w-16 h-16 text-warning-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-corporate-900 mb-2">
              No Active Guardians
            </h1>
            <p className="text-corporate-600">
              No active guardians available for transaction approval.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tx = transaction.data;
  const requiredApprovals = tx.requiredApprovals || 2;
  const currentApprovals = tx.approvals?.length || completedApprovals;
  const progress = Math.min((currentApprovals / requiredApprovals) * 100, 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900 dark:text-corporate-100">
            Transaction Approval
          </h1>
          <p className="text-corporate-600 dark:text-corporate-300 mt-1">
            Enter guardian TOTP codes to approve this transaction
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/transactions">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Transactions
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Transaction Details & Progress */}
        <div className="xl:col-span-1 space-y-6">
          {/* Transaction Summary */}
          <Card className="corporate-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2 text-stellar-600" />
                Transaction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-stellar-50 dark:bg-stellar-900/20 rounded-lg">
                <div className="text-sm text-corporate-600 dark:text-corporate-300">Amount</div>
                <div className="text-2xl font-bold text-stellar-700 dark:text-stellar-400">
                  {formatXLMWithSuffix(tx.amount)}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-corporate-600 dark:text-corporate-300">Status:</span>
                  <TransactionStatusBadge status={tx.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-corporate-600 dark:text-corporate-300">Type:</span>
                  <Badge variant="outline">{tx.txType}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-corporate-600 dark:text-corporate-300">Destination:</span>
                  <code className="text-xs bg-corporate-100 dark:bg-corporate-800 px-2 py-1 rounded">
                    {truncateAddress(tx.toAddress, 6)}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-corporate-600 dark:text-corporate-300">Created:</span>
                  <span className="text-sm">{formatDate(tx.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Card */}
          <Card className="corporate-card border-warning-200 bg-gradient-to-br from-warning-50 to-stellar-50 dark:from-warning-900/20 dark:to-stellar-900/20">
            <CardHeader>
              <CardTitle className="flex items-center text-warning-700 dark:text-warning-400">
                <Users className="w-5 h-5 mr-2" />
                Approval Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-warning-700 dark:text-warning-400">
                  {currentApprovals} / {requiredApprovals}
                </div>
                <div className="text-sm text-warning-600 dark:text-warning-500">Approvals Completed</div>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="text-xs text-warning-600 dark:text-warning-500 text-center">
                {requiredApprovals - currentApprovals > 0 
                  ? `${requiredApprovals - currentApprovals} more approval(s) needed`
                  : 'All required approvals completed!'
                }
              </div>
            </CardContent>
          </Card>

          {/* Timer */}
          <Card className="corporate-card border-corporate-200">
            <CardHeader>
              <CardTitle className="flex items-center text-corporate-700 dark:text-corporate-300">
                <Timer className="w-5 h-5 mr-2" />
                Time Remaining
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-corporate-700 dark:text-corporate-300">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-corporate-600 dark:text-corporate-400">
                  Session expires in {Math.floor(timeRemaining / 60)} minutes
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Guardian Approvals */}
        <div className="xl:col-span-2 space-y-6">
          {executionCompleted ? (
            // Success State
            <Card className="corporate-card border-success-200 bg-success-50 dark:bg-success-900/20">
              <CardContent className="text-center py-12">
                <PartyPopper className="w-24 h-24 text-success-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-success-900 dark:text-success-100 mb-4">
                  Transaction Executed Successfully!
                </h2>
                <p className="text-success-700 dark:text-success-300 mb-6 text-lg">
                  All required approvals have been collected and the transaction has been broadcast to the Stellar network.
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <Button onClick={() => router.push('/dashboard/transactions')} variant="corporate" size="lg">
                    <Eye className="w-4 h-4 mr-2" />
                    View Transaction History
                  </Button>
                  <Button onClick={() => refetch()} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Approval Interface
            <>
              {/* Guardian Approval Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-corporate-900 dark:text-corporate-100">
                    Guardian Approvals
                  </h2>
                  <Badge variant="outline">
                    {guardians.filter(g => g.isApproved).length} of {guardians.length} approved
                  </Badge>
                </div>

                {guardians.map((guardian) => (
                  <Card 
                    key={guardian.id} 
                    className={`corporate-card transition-all duration-300 ${
                      guardian.isApproved 
                        ? 'border-success-300 bg-success-50 dark:bg-success-900/20' 
                        : 'border-corporate-200 hover:border-stellar-300'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getRoleIcon(guardian.role)}
                          <div>
                            <CardTitle className="text-lg">{guardian.role} Guardian</CardTitle>
                            <CardDescription>
                              {guardian.name}
                              {guardian.hsmActivated && guardian.totpVerified ? (
                                <Badge variant="success" className="ml-2 text-xs">HSM Active</Badge>
                              ) : (
                                <Badge variant="warning" className="ml-2 text-xs">HSM Inactive</Badge>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        {guardian.isApproved ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-success-500" />
                            <Badge variant="success">Approved</Badge>
                          </div>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {guardian.isApproved ? (
                        <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-success-700 dark:text-success-300">
                              Approved at: {guardian.approvedAt ? formatDate(guardian.approvedAt) : 'Just now'}
                            </span>
                            <UserCheck className="w-4 h-4 text-success-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`totp-${guardian.id}`} className="text-sm font-medium">
                              TOTP Code
                            </Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <Input
                                id={`totp-${guardian.id}`}
                                type="text"
                                placeholder="123456"
                                maxLength={6}
                                value={guardian.totpCode}
                                onChange={(e) => handleTotpChange(guardian.id, e.target.value)}
                                className="text-center text-lg font-mono flex-1"
                                disabled={guardian.isApproved || isProcessing}
                              />
                              <Button
                                onClick={() => handleGuardianApproval(guardian)}
                                disabled={
                                  guardian.totpCode.length !== 6 || 
                                  guardian.isApproved || 
                                  approveMutation.isPending
                                }
                                variant="corporate"
                                size="sm"
                              >
                                {approveMutation.isPending && approveMutation.variables?.guardianId === guardian.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                ) : (
                                  <ArrowRight className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-corporate-600 dark:text-corporate-400 mt-1">
                              Enter the 6-digit code from the {guardian.role} authenticator app
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              {/* Batch Approval Actions */}
              <div className="space-y-4">
                <Alert variant="info">
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Multi-Guardian Approval:</strong> Enter TOTP codes from each guardian's authenticator app. 
                    You can approve guardians individually or all at once after entering valid codes.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-corporate-700 dark:text-corporate-300">
                      Ready to approve: {guardians.filter(g => g.totpCode.length === 6 && !g.isApproved).length} guardians
                    </p>
                    <p className="text-xs text-corporate-600 dark:text-corporate-400">
                      Required: {requiredApprovals} approvals for transaction execution
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleApproveAll}
                    disabled={
                      guardians.filter(g => g.totpCode.length === 6 && !g.isApproved).length === 0 ||
                      isProcessing ||
                      timeRemaining <= 0
                    }
                    variant="corporate"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing Approvals...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve All Ready Guardians
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Instructions */}
          {!executionCompleted && (
            <Card className="corporate-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="w-5 h-5 mr-2 text-stellar-600" />
                  Guardian Authentication Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-corporate-700 dark:text-corporate-300 font-medium">
                    How to complete guardian approval:
                  </div>
                  <ol className="space-y-2 text-sm text-corporate-600 dark:text-corporate-400">
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">1</span>
                      <span>Each guardian opens their Google Authenticator app</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">2</span>
                      <span>Find "Stellar Custody" entry for their role (CEO/CFO/CTO)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">3</span>
                      <span>Enter the current 6-digit TOTP code in the corresponding field above</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">4</span>
                      <span>Click individual "Approve" buttons or use "Approve All" for batch processing</span>
                    </li>
                  </ol>
                  
                  <Alert variant="warning" className="mt-4">
                    <Timer className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Time Sensitive:</strong> TOTP codes are valid for 30 seconds. If a code expires, 
                      wait for the next code cycle and enter the new code.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
