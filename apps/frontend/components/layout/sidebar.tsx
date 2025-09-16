'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useSidebar } from '@/context/sidebar-context';
import { HeaderLogo } from '@/components/common/corporate-logo';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  ArrowRightLeft, 
  Shield, 
  Activity,
  Settings,
  LogOut,
  Eye,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Enhanced Responsive Sidebar Navigation Component
 * 
 * Features:
 * - Fully responsive with mobile drawer
 * - Collapsible desktop version
 * - Smooth animations and transitions
 * - Premium corporate design
 * - Persistent state management
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
    description: 'Transaction keys & privacy protection',
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
  const { isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar } = useSidebar();

  const handleLogout = async () => {
    await logout();
  };

  const NavItem = ({ item, onClick }: { item: typeof navigationItems[0]; onClick?: () => void }) => {
    const isActive = pathname === item.href || 
      (item.href !== '/dashboard' && pathname.startsWith(item.href));

    const content = (
      <Link
        href={item.href as any}
        onClick={onClick}
        className={cn(
          'sidebar-nav-item group relative',
          'transition-all duration-200 ease-in-out',
          'hover:scale-[1.02] active:scale-[0.98]',
          isActive
            ? 'sidebar-nav-item-active shadow-lg shadow-stellar-600/20'
            : 'sidebar-nav-item-inactive hover:shadow-md'
        )}
      >
        <item.icon 
          className={cn(
            'flex-shrink-0 transition-all duration-200',
            isCollapsed ? 'h-6 w-6' : 'mr-3 h-5 w-5',
            isActive 
              ? 'text-stellar-600 dark:text-stellar-400' 
              : 'text-corporate-400 group-hover:text-corporate-600 dark:text-corporate-500 dark:group-hover:text-corporate-300'
          )} 
        />
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{item.name}</div>
            <div className={cn(
              'text-xs mt-0.5 truncate transition-colors duration-200',
              isActive 
                ? 'text-stellar-600/80 dark:text-stellar-400/80' 
                : 'text-corporate-500 dark:text-corporate-400'
            )}>
              {item.description}
            </div>
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-stellar-600/5 to-transparent rounded-md pointer-events-none" />
        )}
      </Link>
    );

    // Tooltip functionality temporarily disabled - will be restored after tooltip component is fixed
    if (isCollapsed) {
      return content;
    }

    return content;
  };

  const UserSection = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      "flex-shrink-0 border-t border-corporate-200 dark:border-corporate-700",
      isCollapsed && !isMobile ? "p-2" : "p-4"
    )}>
      {user && (
        <div className={cn(
          "mb-4 p-3 rounded-lg transition-all duration-200",
          "bg-corporate-50/80 dark:bg-corporate-800/80 backdrop-blur-sm",
          "border border-corporate-200/50 dark:border-corporate-700/50",
          isCollapsed && !isMobile && "p-2"
        )}>
          {!isCollapsed || isMobile ? (
            <>
              <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100 truncate">
                {user.name}
              </div>
              <div className="text-xs text-corporate-600 dark:text-corporate-300 truncate">
                {user.role || 'User'} {user.isGuardian && '• Guardian'}
              </div>
              {user.hsmActivated && (
                <div className="flex items-center mt-2">
                  <Shield className="w-3 h-3 text-success-500 mr-1 flex-shrink-0" />
                  <span className="text-xs text-success-600 font-medium">
                    HSM Activated
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-stellar-100 dark:bg-stellar-900 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-stellar-600 dark:text-stellar-400">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      <Button
        variant="outline"
        size={isCollapsed && !isMobile ? "icon" : "sm"}
        onClick={handleLogout}
        className={cn(
          "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
          "text-corporate-600 hover:text-corporate-900 border-corporate-200",
          "dark:text-corporate-300 dark:hover:text-corporate-100 dark:border-corporate-600",
          "shadow-md hover:shadow-lg",
          isCollapsed && !isMobile ? "" : "w-full"
        )}
      >
        <LogOut className={cn("w-4 h-4", !isCollapsed || isMobile ? "mr-2" : "")} />
        {(!isCollapsed || isMobile) && "Sign Out"}
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 md:hidden transition-transform duration-300 ease-in-out",
        isMobileOpen ? "transform translate-x-0" : "transform -translate-x-full"
      )}>
        <div className="flex flex-col h-full bg-white dark:bg-corporate-900 border-r border-corporate-200 dark:border-corporate-700 shadow-2xl">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-corporate-200 dark:border-corporate-700">
            <HeaderLogo />
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobileSidebar}
              className="hover:bg-corporate-100 dark:hover:bg-corporate-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => (
              <NavItem key={item.name} item={item} onClick={closeMobileSidebar} />
            ))}
          </nav>

          {/* Mobile User Section */}
          <UserSection isMobile={true} />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex md:flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "md:w-20" : "md:w-64"
      )}>
        <div className="flex flex-col flex-grow bg-white/95 dark:bg-corporate-900/95 backdrop-blur-lg border-r border-corporate-200 dark:border-corporate-700 overflow-hidden shadow-xl">
          {/* Desktop Header */}
          <div className={cn(
            "flex items-center flex-shrink-0 border-b border-corporate-200 dark:border-corporate-700",
            "transition-all duration-300",
            isCollapsed ? "justify-center px-4 py-6" : "justify-between px-6 py-6"
          )}>
            {!isCollapsed && <HeaderLogo />}
            {isCollapsed && (
              <div className="w-10 h-10 bg-stellar-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={cn(
                "hover:bg-corporate-100 dark:hover:bg-corporate-800 transition-all duration-200",
                "hover:scale-110 active:scale-95",
                isCollapsed && "ml-0"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Desktop Navigation */}
          <nav className={cn(
            "flex-1 py-6 space-y-2 overflow-y-auto",
            isCollapsed ? "px-2" : "px-4"
          )}>
            {navigationItems.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>

          {/* Desktop User Section */}
          <UserSection />
        </div>
      </div>
    </>
  );
}