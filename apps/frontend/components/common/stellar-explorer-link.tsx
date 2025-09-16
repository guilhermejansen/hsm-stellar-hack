'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Copy, 
  Globe, 
  TestTube, 
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  getCurrentStellarNetwork, 
  getTransactionExplorerUrl, 
  getAccountExplorerUrl,
  getNetworkDisplayName,
  getNetworkBadgeVariant,
  isTransactionExecuted,
  getTransactionStatusColor,
  getTransactionStatusIcon,
  type StellarNetwork 
} from '@/lib/stellar-utils';

/**
 * Stellar Explorer Link Component
 * 
 * Complete Stellar transaction explorer integration with multiple providers
 */

interface StellarExplorerLinkProps {
  stellarHash?: string | null;
  network?: StellarNetwork;
  transactionId?: string;
  status?: string;
  className?: string;
  showStatus?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function StellarExplorerLink({
  stellarHash,
  network = getCurrentStellarNetwork(),
  transactionId,
  status,
  className,
  showStatus = true,
  variant = 'default'
}: StellarExplorerLinkProps) {
  
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const getStatusIcon = () => {
    const iconName = getTransactionStatusIcon(status || '');
    const IconComponent = iconName === 'CheckCircle' ? CheckCircle : 
                         iconName === 'AlertCircle' ? AlertCircle : Clock;
    const colorClass = getTransactionStatusColor(status || '');
    
    return <IconComponent className={`w-4 h-4 ${colorClass}`} />;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="success" className="text-xs">Executed</Badge>;
      case 'FAILED':
        return <Badge variant="error" className="text-xs">Failed</Badge>;
      case 'EXECUTING':
        return <Badge variant="warning" className="text-xs">Executing</Badge>;
      case 'AWAITING_APPROVAL':
        return <Badge variant="warning" className="text-xs">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    }
  };

  // Get explorer URLs using utilities
  const currentUrls = {
    stellarExpert: getTransactionExplorerUrl(stellarHash!, network, 'stellarExpert'),
    stellarLab: getTransactionExplorerUrl(stellarHash!, network, 'stellarLab'),
    horizon: getTransactionExplorerUrl(stellarHash!, network, 'horizon'),
  };

  if (!stellarHash) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {showStatus && getStatusIcon()}
        <div className="text-sm text-corporate-500">
          {status === 'AWAITING_APPROVAL' 
            ? 'Transaction pending approval'
            : status === 'EXECUTING'
            ? 'Transaction executing...'
            : 'No Stellar hash available'
          }
        </div>
        {showStatus && getStatusBadge()}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {showStatus && getStatusIcon()}
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-8"
        >
          <a 
            href={currentUrls.stellarExpert} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View on Explorer
          </a>
        </Button>
        {showStatus && getStatusBadge()}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Status and Network Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm font-medium text-corporate-900">
              Stellar Transaction
            </span>
            {getStatusBadge()}
          </div>
          <Badge variant={getNetworkBadgeVariant(network)} className="text-xs">
            {network === 'testnet' ? (
              <>
                <TestTube className="w-3 h-3 mr-1" />
                {getNetworkDisplayName(network)}
              </>
            ) : (
              <>
                <Globe className="w-3 h-3 mr-1" />
                {getNetworkDisplayName(network)}
              </>
            )}
          </Badge>
        </div>

        {/* Hash Display */}
        <div className="space-y-2">
          <div className="text-sm text-corporate-600">Transaction Hash</div>
          <div className="flex items-center space-x-2">
            <code className="text-sm bg-corporate-100 dark:bg-corporate-800 px-2 py-1 rounded flex-1 font-mono">
              {stellarHash.slice(0, 16)}...{stellarHash.slice(-16)}
            </code>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => copyToClipboard(stellarHash, 'Stellar hash')}
              className="h-8 w-8 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Explorer Links */}
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="justify-start"
          >
            <a 
              href={currentUrls.stellarExpert} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              Stellar Expert
            </a>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            asChild
            className="justify-start"
          >
            <a 
              href={currentUrls.stellarLab} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              Stellar Laboratory
            </a>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            asChild
            className="justify-start"
          >
            <a 
              href={currentUrls.horizon} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              Horizon API
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("flex items-center space-x-3", className)}>
      {showStatus && getStatusIcon()}
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <a 
            href={currentUrls.stellarExpert} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Explorer
          </a>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(stellarHash, 'Stellar hash')}
          className="h-8 w-8 p-0"
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>
      
      {showStatus && getStatusBadge()}
    </div>
  );
}

/**
 * Stellar Address Link Component
 */
interface StellarAddressLinkProps {
  address: string;
  network?: StellarNetwork;
  label?: string;
  className?: string;
}

export function StellarAddressLink({
  address,
  network = getCurrentStellarNetwork(),
  label,
  className
}: StellarAddressLinkProps) {
  
  const currentUrls = {
    stellarExpert: getAccountExplorerUrl(address, network, 'stellarExpert'),
    stellarLab: getAccountExplorerUrl(address, network, 'stellarLab'),
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="outline"
        size="sm"
        asChild
      >
        <a 
          href={currentUrls.stellarExpert} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <ExternalLink className="w-3 h-3 mr-2" />
          {label || 'View Address'}
        </a>
      </Button>
    </div>
  );
}
