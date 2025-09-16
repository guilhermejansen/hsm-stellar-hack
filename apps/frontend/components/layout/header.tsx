'use client';

import { useAuth } from '@/context/auth-context';
import { useSidebar } from '@/context/sidebar-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { LanguageSelector } from '@/components/common/language-selector';
import { NotificationCenter } from '@/components/common/notification-center';
import { HeaderLogo } from '@/components/common/corporate-logo';
import { 
  Bell, 
  Shield, 
  Menu,
  Activity,
  AlertTriangle,
  CheckCircle,
  Settings,
  User,
  PanelLeft,
  PanelLeftClose
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Enhanced Dashboard Header Component
 * 
 * Features:
 * - Responsive mobile menu integration
 * - Page title detection
 * - System status monitoring
 * - User management dropdown
 * - Premium corporate design
 */

// Page title mapping based on routes
const pageTitleMap: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Overview', subtitle: 'System overview and metrics' },
  '/dashboard/guardians': { title: 'Guardians', subtitle: '3-Guardian management (CEO, CFO, CTO)' },
  '/dashboard/wallets': { title: 'Wallets', subtitle: 'Hot/Cold wallet management' },
  '/dashboard/transactions': { title: 'Transactions', subtitle: 'Multi-sig transaction processing' },
  '/dashboard/privacy': { title: 'Privacy', subtitle: 'Transaction keys & privacy protection' },
  '/dashboard/monitoring': { title: 'Monitoring', subtitle: 'System health & security events' },
  '/dashboard/audit-logs': { title: 'Audit Logs', subtitle: 'Complete audit trail & compliance' },
};

export function Header() {
  const { user } = useAuth();
  const { isCollapsed, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');
  const [notifications, setNotifications] = useState(0);

  // Get current page info
  const currentPageInfo = pageTitleMap[pathname] || {
    title: 'Stellar Custody Dashboard',
    subtitle: 'Multi-Signature Security Management'
  };

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
    <header className="bg-white/95 dark:bg-corporate-900/95 backdrop-blur-lg border-b border-corporate-200 dark:border-corporate-700 px-4 sm:px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left Side - Mobile Menu & Logo + Page Title */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleMobileSidebar}
              className="hover:bg-corporate-100 dark:hover:bg-corporate-800 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          {/* Mobile Logo */}
          <div className="md:hidden">
            <HeaderLogo />
          </div>

          {/* Desktop Sidebar Toggle */}
          <div className="hidden md:block">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleSidebar}
              className="hover:bg-corporate-100 dark:hover:bg-corporate-800 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              {isCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Page Title - Dynamic based on current route */}
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-semibold text-corporate-900 dark:text-corporate-100 truncate">
              {currentPageInfo.title}
            </h1>
            <p className="hidden sm:block text-sm text-corporate-600 dark:text-corporate-300 mt-0.5 truncate">
              {currentPageInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Side - Status & User Info */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* System Status - Hidden on mobile */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-corporate-50/80 dark:bg-corporate-800/80 backdrop-blur-sm rounded-lg border border-corporate-200/50 dark:border-corporate-700/50">
            {getStatusIcon()}
            <span className="text-sm text-corporate-700 dark:text-corporate-300">System:</span>
            {getStatusBadge()}
          </div>

          {/* Notifications Center */}
          <NotificationCenter notificationCount={notifications} />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Language Selector - Hidden on small screens */}
          <div className="hidden sm:block">
            <LanguageSelector />
          </div>

          {/* User Info */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-4 py-2 bg-corporate-50/80 dark:bg-corporate-800/80 backdrop-blur-sm rounded-lg hover:bg-corporate-100 dark:hover:bg-corporate-700 border border-corporate-200/50 dark:border-corporate-700/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100 truncate max-w-24">
                      {user.name}
                    </div>
                    <div className="text-xs text-corporate-600 dark:text-corporate-300 truncate">
                      {user.role || 'User'}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-stellar-100 dark:bg-stellar-900 rounded-full flex items-center justify-center border-2 border-stellar-200 dark:border-stellar-800">
                    <span className="text-xs font-bold text-stellar-600 dark:text-stellar-400">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 border-b border-corporate-200 dark:border-corporate-700">
                  <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100">
                    {user.name}
                  </div>
                  <div className="text-xs text-corporate-600 dark:text-corporate-300">
                    {user.role || 'User'} {user.isGuardian && '• Guardian'}
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/privacy" className="flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    Privacy & Security
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/audit-logs" className="flex items-center">
                    <Activity className="w-4 h-4 mr-2" />
                    Audit Logs
                  </Link>
                </DropdownMenuItem>
                <div className="sm:hidden border-t border-corporate-200 dark:border-corporate-700 pt-1">
                  <DropdownMenuItem asChild>
                    <div className="flex items-center px-2 py-1">
                      <Settings className="w-4 h-4 mr-2" />
                      <LanguageSelector />
                    </div>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Activity Indicator - Hidden on mobile */}
          <div className="hidden lg:flex items-center space-x-2">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-corporate-500 dark:text-corporate-400">
              Online
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}