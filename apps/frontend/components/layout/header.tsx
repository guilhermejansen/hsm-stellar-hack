'use client';

import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Shield, 
  Menu,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Dashboard Header Component
 * 
 * Corporate header with user info, notifications, and system status
 */

export function Header() {
  const { user } = useAuth();
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');
  const [notifications, setNotifications] = useState(0);

  // Mock system status check
  useEffect(() => {
    // In real implementation, this would poll the monitoring API
    const checkSystemHealth = () => {
      // Mock health check - would use /api/monitoring/health/detailed
      setSystemStatus('healthy');
      setNotifications(Math.floor(Math.random() * 5)); // Mock notifications
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-success-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-warning-500" />;
      case 'unhealthy':
        return <AlertTriangle className="w-4 h-4 text-error-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (systemStatus) {
      case 'healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="warning">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="error">Unhealthy</Badge>;
    }
  };

  return (
    <header className="bg-white border-b border-corporate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button variant="ghost" size="sm">
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Page Title - Dynamic based on current route */}
        <div className="flex-1 md:flex-none">
          <h1 className="text-xl font-semibold text-corporate-900">
            Stellar Custody Dashboard
          </h1>
          <p className="text-sm text-corporate-600 mt-0.5">
            Multi-Signature Security Management
          </p>
        </div>

        {/* Right Side - Status & User Info */}
        <div className="flex items-center space-x-4">
          {/* System Status */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-corporate-50 rounded-lg">
            {getStatusIcon()}
            <span className="text-sm text-corporate-700">System:</span>
            {getStatusBadge()}
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5 text-corporate-600" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-stellar-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="hidden sm:flex items-center space-x-3 px-4 py-2 bg-corporate-50 rounded-lg">
              <div className="text-right">
                <div className="text-sm font-medium text-corporate-900">
                  {user.name}
                </div>
                <div className="text-xs text-corporate-600">
                  {user.role || 'User'}
                </div>
              </div>
              
              {/* Guardian Status */}
              {user.isGuardian && (
                <div className="flex flex-col items-center space-y-1">
                  <Shield 
                    className={cn(
                      'w-4 h-4',
                      user.hsmActivated ? 'text-success-500' : 'text-warning-500'
                    )} 
                  />
                  <span className={cn(
                    'text-xs font-medium',
                    user.hsmActivated ? 'text-success-600' : 'text-warning-600'
                  )}>
                    {user.hsmActivated ? 'Active' : 'Pending'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Activity Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="hidden lg:inline text-xs text-corporate-500">
              Online
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}