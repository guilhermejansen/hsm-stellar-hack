'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { monitoringAPI } from '@/lib/api';
import { queryKeys } from '@/context/query-provider';
import { SystemHealthBadge } from '@/components/common/status-badge';
import { CardLoading } from '@/components/common/loading-spinner';
import { formatDate } from '@/lib/utils';
import { 
  Activity, 
  Server, 
  Database, 
  Shield, 
  Smartphone, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  BarChart3,
  Eye,
  RefreshCw
} from 'lucide-react';

/**
 * System Monitoring Page
 * 
 * Complete system health, performance, and security monitoring
 */
export default function MonitoringPage() {
  // Fetch monitoring data
  const { data: systemHealth, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: queryKeys.systemHealth,
    queryFn: () => monitoringAPI.getDetailedHealth(),
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: performance, isLoading: performanceLoading } = useQuery({
    queryKey: queryKeys.performanceMetrics,
    queryFn: () => monitoringAPI.getPerformanceMetrics(),
    refetchInterval: 30000,
  });

  const { data: securityEvents, isLoading: securityLoading } = useQuery({
    queryKey: queryKeys.securityEvents,
    queryFn: () => monitoringAPI.getSecurityEvents(),
    refetchInterval: 30000,
  });

  const isLoading = healthLoading || performanceLoading || securityLoading;

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'database': return Database;
      case 'hsm': return Shield;
      case 'stellar': return Server;
      case 'whatsapp': return Smartphone;
      default: return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success-500';
      case 'degraded': return 'text-warning-500';
      case 'unhealthy': return 'text-error-500';
      default: return 'text-corporate-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900">System Monitoring</h1>
          <p className="text-corporate-600 mt-1">
            Real-time system health, performance metrics, and security monitoring
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchHealth()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Overall System Status */}
      <Card className="corporate-card bg-gradient-to-br from-stellar-50 to-corporate-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-stellar-600" />
            Overall System Status
          </CardTitle>
          <CardDescription>
            System-wide health and operational status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <CardLoading />
          ) : systemHealth?.data ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="flex justify-center mb-2">
                  {systemHealth.data.status === 'healthy' ? (
                    <CheckCircle className="w-8 h-8 text-success-500" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-warning-500" />
                  )}
                </div>
                <div className="font-bold text-lg text-corporate-900">
                  {systemHealth.data.status.toUpperCase()}
                </div>
                <SystemHealthBadge status={systemHealth.data.status} />
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-sm text-corporate-600">Environment</div>
                <div className="font-bold text-corporate-900">{systemHealth.data.environment}</div>
                <Badge variant="outline" className="mt-1">{systemHealth.data.version}</Badge>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-sm text-corporate-600">mTLS Security</div>
                <div className="font-bold text-corporate-900">
                  {systemHealth.data.mtlsEnabled ? 'Enabled' : 'Disabled'}
                </div>
                <Badge variant={systemHealth.data.mtlsEnabled ? 'success' : 'warning'} className="mt-1">
                  {systemHealth.data.mtlsEnabled ? 'Secure' : 'Dev Mode'}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-sm text-corporate-600">Last Check</div>
                <div className="font-bold text-corporate-900">
                  {formatDate(systemHealth.data.timestamp)}
                </div>
                <div className="text-xs text-corporate-500 mt-1">
                  Auto-refresh: 15s
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Component Health */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="w-5 h-5 mr-2 text-stellar-600" />
            Component Health Status
          </CardTitle>
          <CardDescription>
            Individual component health and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <CardLoading />
          ) : systemHealth?.data?.components ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(systemHealth.data.components).map(([name, info]: [string, any]) => {
                const IconComponent = getComponentIcon(name);
                
                return (
                  <div 
                    key={name}
                    className="p-4 border border-corporate-200 rounded-lg hover:bg-corporate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-5 h-5 text-corporate-600" />
                        <span className="font-medium text-corporate-900 capitalize">
                          {name === 'hsm' ? 'HSM DINAMO' : name}
                        </span>
                      </div>
                      <SystemHealthBadge status={info.status} />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-corporate-600">Latency:</span>
                        <span className="font-mono text-corporate-900">{info.latency}ms</span>
                      </div>
                      
                      {info.partitions && (
                        <div className="flex items-center justify-between">
                          <span className="text-corporate-600">Partitions:</span>
                          <span className="font-mono text-corporate-900">{info.partitions}</span>
                        </div>
                      )}
                      
                      {info.network && (
                        <div className="flex items-center justify-between">
                          <span className="text-corporate-600">Network:</span>
                          <Badge variant="outline">{info.network}</Badge>
                        </div>
                      )}
                      
                      {info.latestLedger && (
                        <div className="flex items-center justify-between">
                          <span className="text-corporate-600">Latest Ledger:</span>
                          <span className="font-mono text-corporate-900">{info.latestLedger}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-success-600" />
              Performance Metrics
            </CardTitle>
            <CardDescription>
              System performance and latency statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {performanceLoading ? (
              <CardLoading />
            ) : performance?.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-success-50 rounded-lg">
                    <div className="text-xl font-bold text-success-700">
                      {performance.data.performance.requests.total}
                    </div>
                    <div className="text-sm text-success-600">Total Requests</div>
                  </div>
                  <div className="text-center p-3 bg-corporate-50 rounded-lg">
                    <div className="text-xl font-bold text-corporate-700">
                      {Math.round(performance.data.performance.requests.successRate)}%
                    </div>
                    <div className="text-sm text-corporate-600">Success Rate</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">Average Latency</span>
                    <span className="font-mono text-corporate-900">{performance.data.performance.latency.average}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">95th Percentile</span>
                    <span className="font-mono text-corporate-900">{performance.data.performance.latency.p95}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">99th Percentile</span>
                    <span className="font-mono text-corporate-900">{performance.data.performance.latency.p99}ms</span>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="corporate-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-error-600" />
              Security Events
            </CardTitle>
            <CardDescription>
              Security monitoring and incident tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {securityLoading ? (
              <CardLoading />
            ) : securityEvents?.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-error-50 rounded-lg">
                    <div className="text-xl font-bold text-error-700">
                      {securityEvents.data.securityEvents.criticalEvents}
                    </div>
                    <div className="text-sm text-error-600">Critical Events</div>
                  </div>
                  <div className="text-center p-3 bg-warning-50 rounded-lg">
                    <div className="text-xl font-bold text-warning-700">
                      {securityEvents.data.securityEvents.highPriorityEvents}
                    </div>
                    <div className="text-sm text-warning-600">High Priority</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">Login Success Rate</span>
                    <span className="font-mono text-corporate-900">
                      {Math.round((securityEvents.data.authentication.successfulLogins / 
                        securityEvents.data.authentication.loginAttempts) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">TOTP Success Rate</span>
                    <span className="font-mono text-corporate-900">
                      {Math.round((securityEvents.data.authentication.totpVerifications / 
                        (securityEvents.data.authentication.totpVerifications + securityEvents.data.authentication.totpFailures)) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600">HSM Operations</span>
                    <span className="font-mono text-corporate-900">{securityEvents.data.hsm.keyOperations}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* HSM Operations */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-stellar-600" />
            HSM DINAMO Operations
          </CardTitle>
          <CardDescription>
            Hardware Security Module activity and key management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityLoading ? (
            <CardLoading />
          ) : securityEvents?.data ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-stellar-50 rounded-lg">
                <div className="text-2xl font-bold text-stellar-700">
                  {securityEvents.data.hsm.keyOperations}
                </div>
                <div className="text-sm text-corporate-600">Total Operations</div>
              </div>
              
              <div className="text-center p-4 bg-success-50 rounded-lg">
                <div className="text-2xl font-bold text-success-700">
                  {securityEvents.data.hsm.ephemeralKeysGenerated}
                </div>
                <div className="text-sm text-corporate-600">Keys Generated</div>
              </div>
              
              <div className="text-center p-4 bg-warning-50 rounded-lg">
                <div className="text-2xl font-bold text-warning-700">
                  {securityEvents.data.hsm.ephemeralKeysDestroyed}
                </div>
                <div className="text-sm text-corporate-600">Keys Destroyed</div>
              </div>
              
              <div className="text-center p-4 bg-corporate-50 rounded-lg">
                <div className="text-2xl font-bold text-corporate-700">
                  {securityEvents.data.hsm.keyExpirations}
                </div>
                <div className="text-sm text-corporate-600">Key Expirations</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Authentication Metrics */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2 text-corporate-600" />
            Authentication Security
          </CardTitle>
          <CardDescription>
            Login attempts, TOTP verification, and authentication security metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityLoading ? (
            <CardLoading />
          ) : securityEvents?.data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-corporate-900">Login Activity</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                      <span className="text-sm text-success-600">Successful Logins</span>
                      <span className="font-bold text-success-700">
                        {securityEvents.data.authentication.successfulLogins}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-error-50 rounded-lg">
                      <span className="text-sm text-error-600">Failed Attempts</span>
                      <span className="font-bold text-error-700">
                        {securityEvents.data.authentication.failedLogins}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-corporate-50 rounded-lg">
                      <span className="text-sm text-corporate-600">Success Rate</span>
                      <span className="font-bold text-corporate-700">
                        {Math.round((securityEvents.data.authentication.successfulLogins / 
                          securityEvents.data.authentication.loginAttempts) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-corporate-900">TOTP Verification</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                      <span className="text-sm text-success-600">TOTP Verifications</span>
                      <span className="font-bold text-success-700">
                        {securityEvents.data.authentication.totpVerifications}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-error-50 rounded-lg">
                      <span className="text-sm text-error-600">TOTP Failures</span>
                      <span className="font-bold text-error-700">
                        {securityEvents.data.authentication.totpFailures}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-corporate-50 rounded-lg">
                      <span className="text-sm text-corporate-600">TOTP Success Rate</span>
                      <span className="font-bold text-corporate-700">
                        {Math.round((securityEvents.data.authentication.totpVerifications / 
                          (securityEvents.data.authentication.totpVerifications + securityEvents.data.authentication.totpFailures)) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* System Alerts */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-warning-600" />
            System Alerts & Events
          </CardTitle>
          <CardDescription>
            Recent security events and system notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityLoading ? (
            <CardLoading />
          ) : securityEvents?.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-error-50 rounded-lg">
                  <div className="text-xl font-bold text-error-700">
                    {securityEvents.data.securityEvents.criticalEvents}
                  </div>
                  <div className="text-sm text-error-600">Critical</div>
                </div>
                
                <div className="text-center p-4 bg-warning-50 rounded-lg">
                  <div className="text-xl font-bold text-warning-700">
                    {securityEvents.data.securityEvents.highPriorityEvents}
                  </div>
                  <div className="text-sm text-warning-600">High Priority</div>
                </div>
                
                <div className="text-center p-4 bg-corporate-50 rounded-lg">
                  <div className="text-xl font-bold text-corporate-700">
                    {securityEvents.data.securityEvents.mediumPriorityEvents}
                  </div>
                  <div className="text-sm text-corporate-600">Medium Priority</div>
                </div>
                
                <div className="text-center p-4 bg-success-50 rounded-lg">
                  <div className="text-xl font-bold text-success-700">
                    {securityEvents.data.securityEvents.lowPriorityEvents}
                  </div>
                  <div className="text-sm text-success-600">Low Priority</div>
                </div>
              </div>

              {securityEvents.data.securityEvents.criticalEvents === 0 ? (
                <div className="text-center py-8 bg-success-50 rounded-lg">
                  <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-success-900 mb-2">
                    No Critical Security Events
                  </h3>
                  <p className="text-success-700">
                    System is operating within normal security parameters
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 bg-error-50 rounded-lg">
                  <AlertTriangle className="w-12 h-12 text-error-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-error-900 mb-2">
                    Security Attention Required
                  </h3>
                  <p className="text-error-700">
                    {securityEvents.data.securityEvents.criticalEvents} critical event(s) detected
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}