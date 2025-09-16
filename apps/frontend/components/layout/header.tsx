'use client';

import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { LanguageSelector } from '@/components/common/language-selector';
import { NotificationCenter } from '@/components/common/notification-center';
import { 
  Bell, 
  Shield, 
  Menu,
  Activity,
  AlertTriangle,
  CheckCircle,
  Settings,
  User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

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
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
            {getStatusIcon()}
            <span className="text-sm text-corporate-700 dark:text-corporate-300">System:</span>
            {getStatusBadge()}
          </div>

          {/* Notifications Center */}
          <NotificationCenter notificationCount={notifications} />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Language Selector */}
          <LanguageSelector />

          {/* User Info */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 px-4 py-2 bg-corporate-50 dark:bg-corporate-800 rounded-lg hover:bg-corporate-100 dark:hover:bg-corporate-700">
                  <div className="text-right">
                    <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100">
                      {user.name}
                    </div>
                    <div className="text-xs text-corporate-600 dark:text-corporate-300">
                      {user.role || 'User'}
                    </div>
                  </div>
                  <User className="w-4 h-4 text-corporate-600 dark:text-corporate-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/security" className="flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    Security Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/audit-logs" className="flex items-center">
                    <Activity className="w-4 h-4 mr-2" />
                    Audit Logs
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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