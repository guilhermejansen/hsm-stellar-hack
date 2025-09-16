import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Status Badge Component
 * 
 * Corporate-styled status indicators for various system states
 */

interface StatusBadgeProps {
  status: string;
  type?: 'transaction' | 'guardian' | 'wallet' | 'system' | 'privacy';
  className?: string;
}

export function StatusBadge({ status, type = 'system', className }: StatusBadgeProps) {
  const getVariant = () => {
    const normalizedStatus = status.toUpperCase();
    
    switch (type) {
      case 'transaction':
        switch (normalizedStatus) {
          case 'SUCCESS':
          case 'EXECUTED':
            return 'success';
          case 'PENDING':
          case 'AWAITING_APPROVAL':
          case 'APPROVED':
            return 'warning';
          case 'FAILED':
          case 'CANCELLED':
            return 'error';
          default:
            return 'pending';
        }
        
      case 'guardian':
        switch (normalizedStatus) {
          case 'ACTIVE':
          case 'VERIFIED':
          case 'HSM_ACTIVATED':
            return 'success';
          case 'INACTIVE':
          case 'PENDING':
            return 'warning';
          case 'SUSPENDED':
          case 'FAILED':
            return 'error';
          case 'CEO':
            return 'ceo';
          case 'CFO':
            return 'cfo';
          case 'CTO':
            return 'cto';
          default:
            return 'pending';
        }
        
      case 'wallet':
        switch (normalizedStatus) {
          case 'HOT':
            return 'hot';
          case 'COLD':
            return 'cold';
          case 'ACTIVE':
            return 'success';
          case 'INACTIVE':
            return 'error';
          default:
            return 'pending';
        }
        
      case 'privacy':
        switch (normalizedStatus) {
          case 'EXCELLENT':
          case 'HIGH':
            return 'success';
          case 'GOOD':
          case 'MEDIUM':
            return 'warning';
          case 'NEEDS_IMPROVEMENT':
          case 'LOW':
            return 'error';
          default:
            return 'pending';
        }
        
      default:
        switch (normalizedStatus) {
          case 'HEALTHY':
          case 'ONLINE':
          case 'CONNECTED':
          case 'ACTIVE':
            return 'success';
          case 'DEGRADED':
          case 'WARNING':
          case 'PENDING':
            return 'warning';
          case 'UNHEALTHY':
          case 'OFFLINE':
          case 'ERROR':
          case 'FAILED':
            return 'error';
          default:
            return 'pending';
        }
    }
  };

  const getDisplayText = () => {
    // Format status for display
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={cn("font-medium", className)}
    >
      {getDisplayText()}
    </Badge>
  );
}

/**
 * Guardian Role Badge
 */
export function GuardianRoleBadge({ role }: { role: 'CEO' | 'CFO' | 'CTO' }) {
  return <StatusBadge status={role} type="guardian" />;
}

/**
 * Transaction Status Badge
 */
export function TransactionStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} type="transaction" />;
}

/**
 * Wallet Type Badge
 */
export function WalletTypeBadge({ type }: { type: 'HOT' | 'COLD' }) {
  return <StatusBadge status={type} type="wallet" />;
}

/**
 * Privacy Score Badge
 */
export function PrivacyScoreBadge({ score }: { score: number }) {
  let level: string;
  if (score >= 95) {
    level = 'EXCELLENT';
  } else if (score >= 80) {
    level = 'GOOD';
  } else {
    level = 'NEEDS_IMPROVEMENT';
  }
  
  return <StatusBadge status={level} type="privacy" />;
}

/**
 * System Health Badge
 */
export function SystemHealthBadge({ status }: { status: string }) {
  return <StatusBadge status={status} type="system" />;
}