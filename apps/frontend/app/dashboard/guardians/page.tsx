'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { guardianAPI } from '@/lib/api';
import { queryKeys } from '@/context/query-provider';
import { GuardianRoleBadge, SystemHealthBadge } from '@/components/common/status-badge';
import { TableLoading, CardLoading } from '@/components/common/loading-spinner';
import { formatDate, formatXLMWithSuffix } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle,
  Clock,
  Activity,
  Settings,
  Eye,
  MoreHorizontal
} from 'lucide-react';

/**
 * Guardians Management Page
 * 
 * Complete guardian management interface for the 3-guardian system (CEO, CFO, CTO)
 */
export default function GuardiansPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGuardian, setSelectedGuardian] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // Fetch guardians data
  const { data: guardians, isLoading: guardiansLoading } = useQuery({
    queryKey: queryKeys.guardians,
    queryFn: () => guardianAPI.getActiveGuardians(),
    refetchInterval: 30000,
  });

  const { data: guardianStats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.guardianStats,
    queryFn: () => guardianAPI.getGuardianStats(),
    refetchInterval: 30000,
  });

  const { data: minimumCheck } = useQuery({
    queryKey: queryKeys.minimumGuardians,
    queryFn: () => guardianAPI.checkMinimumGuardians(),
    refetchInterval: 30000,
  });

  // Activate guardian mutation
  const activateGuardianMutation = useMutation({
    mutationFn: (data: { guardianId: string; totpCode: string }) =>
      guardianAPI.activateGuardian(data.guardianId, data.totpCode),
    onSuccess: () => {
      toast.success('Guardian activated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians });
      queryClient.invalidateQueries({ queryKey: queryKeys.guardianStats });
      setSelectedGuardian(null);
      setTotpCode('');
      setIsActivating(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Activation failed');
    },
  });

  const handleActivateGuardian = async () => {
    if (!selectedGuardian || !totpCode) return;
    
    setIsActivating(true);
    try {
      await activateGuardianMutation.mutateAsync({
        guardianId: selectedGuardian,
        totpCode,
      });
    } finally {
      setIsActivating(false);
    }
  };

  const canRegisterGuardians = user?.role === 'CEO' || (user?.level && user.level >= 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900 dark:text-corporate-100">Guardian Management</h1>
          <p className="text-corporate-600 dark:text-corporate-300 mt-1">
            Manage the 3-guardian system (CEO, CFO, CTO) with HSM Dinamo security
          </p>
        </div>
        
        {canRegisterGuardians && (
          <Link href="/dashboard/guardians/register">
            <Button variant="corporate" size="lg">
              <UserPlus className="w-4 h-4 mr-2" />
              Register Guardian
            </Button>
          </Link>
        )}
      </div>

      {/* Guardian Statistics */}
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
                    <p className="metric-label">Total Guardians</p>
                    <p className="metric-value text-stellar-700">
                      {guardianStats?.data?.guardians?.total || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-stellar-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="metric-label">Active Guardians</p>
                    <p className="metric-value text-success-700">
                      {guardianStats?.data?.guardians?.active || 0}
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
                    <p className="metric-label">HSM Activated</p>
                    <p className="metric-value text-warning-700">
                      {guardianStats?.data?.guardians?.hsmActivated || 0}
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-warning-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="metric-label">Total Approvals</p>
                    <p className="metric-value text-corporate-700">
                      {guardianStats?.data?.approvals?.total || 0}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-corporate-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* System Health Check */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-stellar-600" />
            Guardian System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-corporate-700 dark:text-corporate-300">Minimum Guardians</span>
                <SystemHealthBadge 
                  status={minimumCheck?.data?.hasMinimum ? 'healthy' : 'unhealthy'} 
                />
              </div>
              <p className="text-xs text-corporate-600 dark:text-corporate-300 mt-1">
                {minimumCheck?.data?.activeCount || 0}/{minimumCheck?.data?.minimumRequired || 2} required
              </p>
            </div>
            
            <div className="p-4 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-corporate-700 dark:text-corporate-300">System Operational</span>
                <SystemHealthBadge 
                  status={minimumCheck?.data?.systemOperational ? 'healthy' : 'degraded'} 
                />
              </div>
              <p className="text-xs text-corporate-600 dark:text-corporate-300 mt-1">
                Multi-sig capability: {minimumCheck?.data?.systemOperational ? 'Available' : 'Limited'}
              </p>
            </div>
            
            <div className="p-4 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-corporate-700 dark:text-corporate-300">Completion Rate</span>
                <Badge variant="success">
                  {Math.round(guardianStats?.data?.guardians?.completionRate || 0)}%
                </Badge>
              </div>
              <p className="text-xs text-corporate-600 dark:text-corporate-300 mt-1">
                Guardian setup completion
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guardians Table */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle>Active Guardians</CardTitle>
          <CardDescription>
            Manage the 3-guardian system with individual TOTP and HSM protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {guardiansLoading ? (
            <TableLoading rows={3} />
          ) : guardians?.data && guardians.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Role & Level</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guardians.data.map((guardian: any) => (
                  <TableRow key={guardian.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-stellar-100 rounded-lg">
                          <Users className="w-4 h-4 text-stellar-600" />
                        </div>
                        <div>
                          <div className="font-medium text-corporate-900 dark:text-corporate-100">
                            {guardian.name}
                          </div>
                          <div className="text-sm text-corporate-600 dark:text-corporate-300">
                            {guardian.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <GuardianRoleBadge role={guardian.role} />
                        <Badge variant="outline" className="text-xs">
                          Level {guardian.level}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-corporate-600 dark:text-corporate-300">
                          <Mail className="w-3 h-3 mr-1" />
                          {guardian.email}
                        </div>
                        <div className="flex items-center text-sm text-corporate-600 dark:text-corporate-300">
                          <Phone className="w-3 h-3 mr-1" />
                          {guardian.phone}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {guardian.isActive ? (
                            <CheckCircle className="w-4 h-4 text-success-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error-500" />
                          )}
                          <span className="text-sm font-medium">
                            {guardian.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Shield className={`w-4 h-4 ${guardian.hsmActivated ? 'text-success-500' : 'text-warning-500'}`} />
                          <span className="text-sm">
                            HSM: {guardian.hsmActivated ? 'Active' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className={`w-4 h-4 ${guardian.totpVerified ? 'text-success-500' : 'text-warning-500'}`} />
                          <span className="text-sm">
                            TOTP: {guardian.totpVerified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="text-corporate-700 dark:text-corporate-300">Daily: {formatXLMWithSuffix(guardian.dailyLimit)}</div>
                        <div className="text-corporate-700 dark:text-corporate-300">Monthly: {formatXLMWithSuffix(guardian.monthlyLimit)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="font-medium text-corporate-900 dark:text-corporate-100">{guardian.totalApprovals} approvals</div>
                        {guardian.lastApprovalAt && (
                          <div className="text-corporate-600 dark:text-corporate-300">
                            Last: {formatDate(guardian.lastApprovalAt)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link href={`/dashboard/guardians/${guardian.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        
                        {!guardian.totpVerified && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="corporate" 
                                size="sm"
                                onClick={() => setSelectedGuardian(guardian.id)}
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Activate
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Activate Guardian HSM</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-sm text-corporate-600">
                                  Enter the first TOTP code from {guardian.name}'s authenticator app to activate their HSM partition.
                                </p>
                                <div className="space-y-2">
                                  <Label htmlFor="totp">TOTP Code</Label>
                                  <Input
                                    id="totp"
                                    type="text"
                                    placeholder="123456"
                                    maxLength={6}
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                    className="text-center text-lg font-mono"
                                  />
                                </div>
                                <Button 
                                  onClick={handleActivateGuardian}
                                  disabled={totpCode.length !== 6 || isActivating}
                                  className="w-full"
                                  variant="corporate"
                                >
                                  {isActivating ? 'Activating...' : 'Activate HSM Partition'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-corporate-300 dark:text-corporate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-corporate-700 dark:text-corporate-300 mb-2">
                No Guardians Found
              </h3>
              <p className="text-corporate-500 dark:text-corporate-400 mb-6">
                The system requires 3 guardians (CEO, CFO, CTO) for multi-signature operations
              </p>
              {canRegisterGuardians && (
                <Link href="/dashboard/guardians/register">
                  <Button variant="corporate">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register First Guardian
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