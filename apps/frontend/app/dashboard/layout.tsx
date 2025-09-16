'use client';

import { useAuth } from '@/context/auth-context';
import { SidebarProvider } from '@/context/sidebar-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PageLoading } from '@/components/common/loading-spinner';

/**
 * Enhanced Dashboard Layout
 * 
 * Features:
 * - Responsive sidebar with collapse functionality
 * - Mobile-first design with drawer navigation
 * - Context-based state management
 * - Premium corporate styling
 * - Protected route authentication
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <PageLoading text="Loading dashboard..." />;
  }

  // Redirect will be handled by middleware, but show loading as fallback
  if (!isAuthenticated) {
    return <PageLoading text="Redirecting to login..." />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-corporate-50/50 dark:bg-corporate-950/50">
        {/* Sidebar Navigation */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <Header />
          
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-corporate-50/30 via-stellar-50/10 to-corporate-100/30 dark:from-corporate-950/50 dark:via-stellar-950/20 dark:to-corporate-900/50">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
              <div className="animate-fade-in">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}