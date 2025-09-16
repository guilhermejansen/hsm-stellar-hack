import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for Stellar Custody MVP
 * 
 * Handles:
 * - Route protection
 * - Authentication checks
 * - Security headers
 * - Request logging
 */

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/guardians',
  '/wallets', 
  '/transactions',
  '/privacy',
  '/monitoring',
  '/approve',
];

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/verify-totp',
  '/health',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Get authentication token from cookies or headers
  const accessToken = request.cookies.get('stellar_access_token')?.value ||
                     request.headers.get('authorization')?.replace('Bearer ', '');
  
  // Handle protected routes
  if (isProtectedRoute && !accessToken) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Handle public routes when authenticated
  if (isPublicRoute && accessToken && (pathname === '/login' || pathname === '/verify-totp')) {
    // Redirect to dashboard if already authenticated
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Create response
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Add CSP header for additional security
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' http://localhost:3001 ws://localhost:3001 https://api.qrserver.com; " +
    "frame-ancestors 'none';"
  );
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};