'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';
import { walletAPI, transactionAPI } from '@/lib/api';
import { queryKeys } from '@/context/query-provider';
import { WalletTypeBadge } from '@/components/common/status-badge';
import { formatXLMWithSuffix, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Wallet, 
  ArrowRight, 
  Shield, 
  AlertTriangle,
  Info,
  Snowflake,
  Flame,
  Eye,
  ArrowRightLeft,
} from 'lucide-react';
import Link from 'next/link';

/**
 * Transaction Creation Schema
 */
const transactionSchema = z.object({
  fromWalletId: z.string().min(1, 'Please select a source wallet'),
  toAddress: z.string()
    .min(56, 'Stellar address must be at least 56 characters')
    .max(56, 'Stellar address must be exactly 56 characters')
    .regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar address format - must start with G and contain only valid characters'),
  amount: z.string()
    .min(1, 'Amount is required')
    .regex(/^\d+(\.\d{1,7})?$/, 'Invalid amount format - use numbers with up to 7 decimal places')
    .refine(val => parseFloat(val) > 0, 'Amount must be positive')
    .refine(val => parseFloat(val) <= 1000000, 'Amount exceeds maximum limit of 1,000,000 XLM'),
  memo: z.string().max(28, 'Memo must not exceed 28 characters').optional(),
  txType: z.enum(['PAYMENT', 'REBALANCE', 'WITHDRAWAL', 'DEPOSIT']),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

/**
 * Create Transaction Page
 * 
 * Complete transaction creation with automatic threshold determination
 */
export default function CreateTransactionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [thresholdInfo, setThresholdInfo] = useState<any>(null);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      fromWalletId: '',
      toAddress: 'GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM',
      amount: '10',
      memo: '',
      txType: 'PAYMENT',
    },
  });

  const watchAmount = form.watch('amount');
  const watchFromWalletId = form.watch('fromWalletId');
  const watchToAddress = form.watch('toAddress');
  const watchMemo = form.watch('memo');
  const watchTxType = form.watch('txType');

  // Debug form state
  console.log('🔍 Form Debug:', {
    isValid: form.formState.isValid,
    errors: form.formState.errors,
    values: form.getValues(),
    isDirty: form.formState.isDirty,
    isSubmitting: form.formState.isSubmitting,
  });

  // Fetch wallets
  const { data: hotWallet } = useQuery({
    queryKey: queryKeys.hotWallet,
    queryFn: () => walletAPI.getHotWallet(),
  });

  const { data: coldWallet } = useQuery({
    queryKey: queryKeys.coldWallet,
    queryFn: () => walletAPI.getColdWallet(),
  });

  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: (data: TransactionFormData) => transactionAPI.createTransaction(data),
    onSuccess: (result) => {
      if (result.data?.requiresApproval) {
        toast.success('Transaction created! Redirecting to approval interface...');
        // Redirect to integrated approval page
        router.push(`/dashboard/transactions/${result.data.transactionId}/approve` as any);
      } else {
        toast.success('Transaction created and executed automatically!');
        router.push('/dashboard/transactions');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Transaction creation failed');
    },
  });

  const availableWallets = [
    ...(hotWallet?.data ? [hotWallet.data] : []),
    ...(coldWallet?.data ? [coldWallet.data] : []),
  ];

  // Update threshold info when amount or wallet changes
  useEffect(() => {
    if (watchAmount && watchFromWalletId) {
      const amount = parseFloat(watchAmount);
      const isFromCold = selectedWallet?.walletType === 'COLD';
      
      let threshold;
      if (isFromCold || amount >= 10000) {
        threshold = {
          type: 'CRITICAL_3_OF_3',
          required: 3,
          total: 3,
          challengeRequired: true,
          description: 'High security - All 3 guardians required',
        };
      } else if (amount >= 1000) {
        threshold = {
          type: 'HIGH_VALUE_2_OF_3',
          required: 2,
          total: 3,
          challengeRequired: true,
          description: 'Medium security - 2 of 3 guardians required',
        };
      } else {
        threshold = {
          type: 'LOW_VALUE_2_OF_3',
          required: 2,
          total: 3,
          challengeRequired: false,
          description: 'Standard security - 2 of 3 guardians required',
        };
      }
      
      setThresholdInfo(threshold);
    }
  }, [watchAmount, watchFromWalletId, selectedWallet]);

  // Auto-select first wallet when wallets are loaded
  useEffect(() => {
    if (availableWallets.length > 0 && !watchFromWalletId) {
      form.setValue('fromWalletId', availableWallets[0].id);
    }
  }, [availableWallets, watchFromWalletId, form]);

  // Update selected wallet when fromWalletId changes
  useEffect(() => {
    if (watchFromWalletId) {
      if (hotWallet?.data?.id === watchFromWalletId) {
        setSelectedWallet(hotWallet.data);
      } else if (coldWallet?.data?.id === watchFromWalletId) {
        setSelectedWallet(coldWallet.data);
      }
    }
  }, [watchFromWalletId, hotWallet?.data, coldWallet?.data]);

  const onSubmit = async (data: TransactionFormData) => {
    try {
      await createMutation.mutateAsync(data);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900 dark:text-corporate-100">Create Transaction</h1>
          <p className="text-corporate-600 dark:text-corporate-300 mt-1">
            Multi-signature transaction with automatic threshold determination
          </p>
        </div>
        <Link href="/dashboard/transactions">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Transactions
          </Button>
        </Link>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Transaction Details */}
            <Card className="corporate-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowRightLeft className="w-5 h-5 mr-2 text-stellar-600" />
                  Transaction Details
                </CardTitle>
                <CardDescription>
                  Enter transaction information and select source wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="fromWalletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Wallet</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select wallet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableWallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              <div className="flex items-center space-x-2">
                                {wallet.walletType === 'COLD' ? (
                                  <Snowflake className="w-4 h-4 text-stellar-600" />
                                ) : (
                                  <Flame className="w-4 h-4 text-warning-600" />
                                )}
                                <span>
                                  {wallet.walletType} Wallet - {formatXLMWithSuffix(wallet.balance)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose between Hot (operational) or Cold (secure storage) wallet
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM" 
                          className="font-mono text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Stellar public key starting with 'G'
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (XLM)</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="1000.0000000" 
                          className="font-mono"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Amount in XLM (up to 7 decimal places)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="txType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PAYMENT">Payment</SelectItem>
                            <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                            <SelectItem value="DEPOSIT">Deposit</SelectItem>
                            <SelectItem value="REBALANCE">Rebalance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="memo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Memo (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Payment description" 
                            maxLength={28}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Max 28 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security & Threshold Information */}
            <Card className="corporate-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-warning-600" />
                  Security & Approval Requirements
                </CardTitle>
                <CardDescription>
                  Automatic threshold determination based on amount and wallet type
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Wallet Info */}
                {selectedWallet && (
                  <div className="p-4 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-corporate-700 dark:text-corporate-300">Source Wallet</span>
                      <WalletTypeBadge type={selectedWallet.walletType} />
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="text-corporate-600 dark:text-corporate-300">Balance: {formatXLMWithSuffix(selectedWallet.balance)}</div>
                      <div className="text-corporate-600 dark:text-corporate-300">Path: <code className="bg-corporate-100 dark:bg-corporate-700 px-1 rounded">{selectedWallet.derivationPath}</code></div>
                      <div className="text-corporate-600 dark:text-corporate-300">TOTP Required: {selectedWallet.requiresTOTP ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}

                {/* Threshold Information */}
                {thresholdInfo && (
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-stellar-50 to-warning-50 dark:from-stellar-900/20 dark:to-warning-900/20 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-corporate-700 dark:text-corporate-300">Approval Scheme</span>
                        <Badge variant={thresholdInfo.required === 3 ? 'destructive' : 'default'}>
                          {thresholdInfo.required}-of-{thresholdInfo.total}
                        </Badge>
                      </div>
                      <p className="text-sm text-corporate-600 dark:text-corporate-300">{thresholdInfo.description}</p>
                    </div>

                    {thresholdInfo.challengeRequired && (
                      <Alert variant="warning">
                        <Shield className="w-4 h-4" />
                        <AlertDescription>
                          <strong>OCRA-like Challenge Required:</strong> Guardians will receive transaction-specific 
                          challenges via WhatsApp and must use their authenticator apps to generate response codes.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white dark:bg-corporate-800 rounded border">
                        <div className="text-sm text-corporate-600 dark:text-corporate-300">Required Approvals</div>
                        <div className="text-lg font-bold text-warning-700 dark:text-warning-400">
                          {thresholdInfo.required} Guardians
                        </div>
                      </div>
                      <div className="p-3 bg-white dark:bg-corporate-800 rounded border">
                        <div className="text-sm text-corporate-600 dark:text-corporate-300">Challenge Type</div>
                        <div className="text-lg font-bold text-corporate-700 dark:text-corporate-300">
                          {thresholdInfo.challengeRequired ? 'OCRA-like' : 'TOTP'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy Protection Info */}
                <Alert variant="info">
                  <Eye className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Privacy Protection:</strong> This transaction will use an ephemeral key 
                    (m/0'/0'/N') generating a new address for complete privacy. External observers 
                    cannot correlate this transaction to your wallets.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Preview */}
          {form.formState.isValid && watchAmount && (
            <Card className="corporate-card bg-gradient-to-br from-stellar-50 to-corporate-50">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-stellar-600" />
                  Transaction Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white dark:bg-corporate-800 rounded-lg">
                    <div className="text-sm text-corporate-600 dark:text-corporate-300">Amount</div>
                    <div className="text-xl font-bold text-stellar-700 dark:text-stellar-400">
                      {formatXLMWithSuffix(watchAmount)}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-white dark:bg-corporate-800 rounded-lg">
                    <div className="text-sm text-corporate-600 dark:text-corporate-300">Approval Required</div>
                    <div className="text-xl font-bold text-warning-700 dark:text-warning-400">
                      {thresholdInfo ? `${thresholdInfo.required}-of-${thresholdInfo.total}` : 'Calculating...'}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-white dark:bg-corporate-800 rounded-lg">
                    <div className="text-sm text-corporate-600 dark:text-corporate-300">Estimated Fee</div>
                    <div className="text-xl font-bold text-corporate-700 dark:text-corporate-300">
                      0.0001000 XLM
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4">
            <Link href="/dashboard/transactions">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel 
              </Button>
            </Link>
            
            <Button
              type="submit"
              variant="corporate"
              size="lg"
              disabled={!form.formState.isValid || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Transaction...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Transaction
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}