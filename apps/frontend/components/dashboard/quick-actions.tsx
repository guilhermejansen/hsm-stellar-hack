'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  ArrowRightLeft, 
  UserPlus, 
  Scale,
  Shield,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { User } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Quick Actions Component
 * 
 * Role-based quick action buttons for efficient operations
 */

interface QuickActionsProps {
  user: User | null;
}

export function QuickActions({ user }: QuickActionsProps) {
  if (!user) return null;

  const canCreateTransactions = user.isGuardian && user.hsmActivated;
  const canRegisterGuardians = user.role === 'CEO' || (user.level && user.level >= 3);
  const canRebalanceWallets = user.isGuardian && user.hsmActivated;
  const canViewMonitoring = user.isGuardian || (user.level && user.level >= 2);

  return (
    <Card className="corporate-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="w-5 h-5 mr-2 text-stellar-600" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common operations based on your role and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Create Transaction */}
          <Link href="/dashboard/transactions/create">
            <Button
              variant={canCreateTransactions ? "corporate" : "outline"}
              size="lg"
              className={cn(
                "w-full h-auto p-4 flex flex-col items-center space-y-2",
                !canCreateTransactions && "opacity-50 cursor-not-allowed"
              )}
              disabled={!canCreateTransactions}
            >
              <Plus className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">New Transaction</div>
                <div className="text-xs opacity-80">Create payment</div>
              </div>
            </Button>
          </Link>

          {/* Register Guardian */}
          <Link href="/dashboard/guardians/register">
            <Button
              variant={canRegisterGuardians ? "corporate" : "outline"}
              size="lg"
              className={cn(
                "w-full h-auto p-4 flex flex-col items-center space-y-2",
                !canRegisterGuardians && "opacity-50 cursor-not-allowed"
              )}
              disabled={!canRegisterGuardians}
            >
              <UserPlus className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Add Guardian</div>
                <div className="text-xs opacity-80">Register new guardian</div>
              </div>
            </Button>
          </Link>

          {/* Rebalance Wallets */}
          <Link href="/dashboard/wallets">
            <Button
              variant={canRebalanceWallets ? "corporate" : "outline"}
              size="lg"
              className={cn(
                "w-full h-auto p-4 flex flex-col items-center space-y-2",
                !canRebalanceWallets && "opacity-50 cursor-not-allowed"
              )}
              disabled={!canRebalanceWallets}
            >
              <Scale className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Rebalance</div>
                <div className="text-xs opacity-80">95% / 5% ratio</div>
              </div>
            </Button>
          </Link>

          {/* System Monitoring */}
          <Link href="/dashboard/monitoring">
            <Button
              variant={canViewMonitoring ? "corporate" : "outline"}
              size="lg"
              className={cn(
                "w-full h-auto p-4 flex flex-col items-center space-y-2",
                !canViewMonitoring && "opacity-50 cursor-not-allowed"
              )}
              disabled={!canViewMonitoring}
            >
              <Activity className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Monitoring</div>
                <div className="text-xs opacity-80">System health</div>
              </div>
            </Button>
          </Link>
        </div>

        {/* Permission Notice */}
        {!user.isGuardian && (
          <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-warning-600" />
              <span className="text-sm font-medium text-warning-700">
                Limited Access
              </span>
            </div>
            <p className="text-xs text-warning-600 mt-1">
              Guardian privileges required for transaction operations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}