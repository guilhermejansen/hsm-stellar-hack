import { NextRequest, NextResponse } from 'next/server';

/**
 * Health Check API Route for Frontend
 * 
 * Provides health status for Docker healthcheck and monitoring
 */

export async function GET(request: NextRequest) {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'stellar-custody-frontend',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      },
      build: {
        nextVersion: process.env.__NEXT_VERSION || 'unknown',
        buildTime: process.env.BUILD_TIME || 'unknown',
      },
      features: {
        apiUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'not-configured',
        stellarNetwork: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet',
        whatsappEnabled: process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === 'true',
      },
    };

    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'stellar-custody-frontend',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

// Allow HEAD requests for health checks
export async function HEAD(request: NextRequest) {
  return GET(request);
}
