import { cn } from "@/lib/utils";

/**
 * Loading Spinner Component
 * 
 * Corporate-styled loading indicator for async operations
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text 
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex flex-col items-center space-y-2">
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-corporate-200 border-t-stellar-600",
            sizeClasses[size]
          )}
        />
        {text && (
          <p className="text-sm text-corporate-600 font-medium">{text}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Full page loading component
 */
export function PageLoading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-corporate-50">
      <div className="text-center">
        <LoadingSpinner size="xl" />
        <h2 className="mt-4 text-lg font-semibold text-corporate-900">
          {text}
        </h2>
        <p className="mt-2 text-sm text-corporate-600">
          Please wait while we load your data
        </p>
      </div>
    </div>
  );
}

/**
 * Inline loading component for buttons
 */
export function ButtonLoading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <LoadingSpinner size="sm" />
      <span>{text}</span>
    </div>
  );
}

/**
 * Card loading skeleton
 */
export function CardLoading() {
  return (
    <div className="corporate-card p-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-corporate-200 rounded w-3/4"></div>
        <div className="h-4 bg-corporate-200 rounded w-1/2"></div>
        <div className="h-4 bg-corporate-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}

/**
 * Table loading skeleton
 */
export function TableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 animate-pulse">
          <div className="h-4 bg-corporate-200 rounded w-1/4"></div>
          <div className="h-4 bg-corporate-200 rounded w-1/3"></div>
          <div className="h-4 bg-corporate-200 rounded w-1/6"></div>
          <div className="h-4 bg-corporate-200 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  );
}