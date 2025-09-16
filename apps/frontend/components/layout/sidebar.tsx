'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { HeaderLogo } from '@/components/common/corporate-logo';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  ArrowRightLeft, 
  Shield, 
  Activity,
  Settings,
  LogOut
} from 'lucide-react';

/**
 * Sidebar Navigation Component
 * 
 * Corporate navigation for the Stellar Custody MVP dashboard
 */

const navigationItems = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'System overview and metrics',
  },
  {
    name: 'Guardians',
    href: '/dashboard/guardians',
    icon: Users,
    description: '3-Guardian management (CEO, CFO, CTO)',
  },
  {
    name: 'Wallets',
    href: '/dashboard/wallets',
    icon: Wallet,
    description: 'Hot/Cold wallet management',
  },
  {
    name: 'Transactions',
    href: '/dashboard/transactions',
    icon: ArrowRightLeft,
    description: 'Multi-sig transaction processing',
  },
  {
    name: 'Privacy',
    href: '/dashboard/privacy',
    icon: Shield,
    description: 'Ephemeral keys & privacy protection',
  },
  {
    name: 'Monitoring',
    href: '/dashboard/monitoring',
    icon: Activity,
    description: 'System health & security events',
  },
  {
    name: 'Audit Logs',
    href: '/dashboard/audit-logs',
    icon: Eye,
    description: 'Complete audit trail & compliance',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow bg-white dark:bg-corporate-900 border-r border-corporate-200 dark:border-corporate-700 overflow-y-auto">
        {/* Logo Header */}
        <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-corporate-200 dark:border-corporate-700">
          <HeaderLogo />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'sidebar-nav-item group',
                  isActive
                    ? 'sidebar-nav-item-active'
                    : 'sidebar-nav-item-inactive'
                )}
              >
                <item.icon 
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-stellar-600' : 'text-corporate-400 group-hover:text-corporate-600'
                  )} 
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className={cn(
                    'text-xs mt-0.5',
                    isActive ? 'text-stellar-600' : 'text-corporate-500'
                  )}>
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="flex-shrink-0 border-t border-corporate-200 dark:border-corporate-700 p-4">
          {user && (
            <div className="mb-4 p-3 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
              <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100">
                {user.name}
              </div>
              <div className="text-xs text-corporate-600 dark:text-corporate-300">
                {user.role || 'User'} {user.isGuardian && '• Guardian'}
              </div>
              {user.hsmActivated && (
                <div className="flex items-center mt-2">
                  <Shield className="w-3 h-3 text-success-500 mr-1" />
                  <span className="text-xs text-success-600 font-medium">
                    HSM Activated
                  </span>
                </div>
              )}
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full text-corporate-600 hover:text-corporate-900 border-corporate-200 dark:text-corporate-300 dark:hover:text-corporate-100 dark:border-corporate-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}