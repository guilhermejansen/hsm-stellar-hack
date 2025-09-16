'use client';

import { useAuth } from '@/context/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PageLoading } from '@/components/common/loading-spinner';

/**
 * Dashboard Layout
 * 
 * Corporate layout with sidebar navigation and header
 * Protected route that requires authentication
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
    <div className="flex min-h-screen bg-corporate-50 dark:bg-corporate-950">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-corporate-50 dark:bg-corporate-950">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}