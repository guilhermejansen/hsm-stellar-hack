'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SystemHealthBadge } from '@/components/common/status-badge';
import { 
  Activity, 
  Database, 
  Server, 
  Smartphone,
  Shield,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap
} from 'lucide-react';
import Link from 'next/link';

/**
 * System Status Component
 * 
 * Real-time system health and component status monitoring
 */

interface SystemStatusProps {
  systemHealth?: any;
}

export function SystemStatus({ systemHealth }: SystemStatusProps) {
  const components = systemHealth?.components || {};
  
  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'database':
        return Database;
      case 'hsm':
        return Shield;
      case 'stellar':
        return Server;
      case 'whatsapp':
        return Smartphone;
      default:
        return Activity;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-success-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-warning-500" />;
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-error-500" />;
      default:
        return <Activity className="w-4 h-4 text-corporate-500" />;
    }
  };

  const formatLatency = (latency: number) => {
    return `${latency}ms`;
  };

  return (
    <Card className="corporate-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2 text-stellar-600" />
            System Status
          </CardTitle>
          <p className="text-sm text-corporate-600 mt-1">
            Real-time component health monitoring
          </p>
        </div>
        <Link href="/dashboard/monitoring">
          <Button variant="outline" size="sm">
            Details
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 bg-corporate-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Zap className="w-5 h-5 text-stellar-600" />
            <div>
              <div className="font-medium text-corporate-900">
                Overall Status
              </div>
              <div className="text-sm text-corporate-600">
                {systemHealth?.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString() : 'Unknown'}
              </div>
            </div>
          </div>
          <SystemHealthBadge status={systemHealth?.status || 'unknown'} />
        </div>

        {/* Component Status */}
        <div className="space-y-3">
          {Object.entries(components).map(([name, info]: [string, any]) => {
            const IconComponent = getComponentIcon(name);
            
            return (
              <div 
                key={name}
                className="flex items-center justify-between p-3 border border-corporate-200 rounded-lg hover:bg-corporate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className="w-4 h-4 text-corporate-600" />
                  <div>
                    <div className="font-medium text-corporate-900 capitalize">
                      {name === 'hsm' ? 'HSM DINAMO' : name}
                    </div>
                    <div className="text-xs text-corporate-600">
                      {info.latency ? formatLatency(info.latency) : 'No data'}
                      {info.partitions && ` • ${info.partitions} partitions`}
                      {info.network && ` • ${info.network}`}
                      {info.latestLedger && ` • Ledger ${info.latestLedger}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(info.status)}
                  <SystemHealthBadge status={info.status} />
                </div>
              </div>
            );
          })}
        </div>

        {/* mTLS Status */}
        <div className="border-t border-corporate-200 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-corporate-600" />
              <span className="text-sm font-medium text-corporate-700">
                mTLS Security
              </span>
            </div>
            <Badge 
              variant={systemHealth?.mtlsEnabled ? 'success' : 'warning'}
              className="text-xs"
            >
              {systemHealth?.mtlsEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <p className="text-xs text-corporate-500 mt-1">
            {systemHealth?.mtlsEnabled 
              ? 'Mutual TLS authentication active'
              : 'Development mode - mTLS disabled'
            }
          </p>
        </div>

        {/* Environment Info */}
        <div className="border-t border-corporate-200 pt-4">
          <div className="text-xs text-corporate-500 space-y-1">
            <div>Environment: {systemHealth?.environment || 'unknown'}</div>
            <div>Version: {systemHealth?.version || '1.0.0'}</div>
            <div>Service: {systemHealth?.service || 'stellar-custody-mvp-backend'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}