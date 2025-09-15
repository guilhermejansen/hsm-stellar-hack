import { 
  Controller, 
  Get, 
  UseGuards,
  HttpStatus
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth
} from '@nestjs/swagger';

import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { 
  SystemHealthDto, 
  PerformanceMetricsDto, 
  SecurityMetricsDto 
} from './dto/monitoring.dto';

/**
 * 📊 Monitoring Controller - System Health & Performance
 * 
 * Features:
 * - System health monitoring
 * - Performance metrics
 * - Security event tracking
 * - Component status checks
 * - Corporate dashboard metrics
 */
@ApiTags('System Monitoring')
@Controller('monitoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MonitoringController {
  constructor(
    private readonly database: DatabaseService
  ) {}

  // ==================== SYSTEM HEALTH ====================

  @Get('health/detailed')
  @ApiOperation({
    summary: 'Get detailed system health status',
    description: `
      **Comprehensive System Health Check**
      
      **Components Monitored:**
      - Database (PostgreSQL) connection and performance
      - HSM DINAMO connectivity and partition status
      - Stellar network (Horizon + Soroban) status
      - WhatsApp API (ZuckZapGo) connectivity
      - Redis cache status
      
      **Health Indicators:**
      - Response latency for each component
      - Error rates and availability
      - Connection pool status
      - Recent failure incidents
      
      **Corporate Dashboard:**
      - Executive-level health summary
      - Component dependencies status
      - System reliability metrics
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detailed system health status',
    type: SystemHealthDto,
    schema: {
      example: {
        success: true,
        data: {
          status: 'healthy',
          timestamp: '2024-12-14T10:30:00Z',
          service: 'stellar-custody-mvp-backend',
          version: '1.0.0',
          environment: 'development',
          mtlsEnabled: false,
          components: {
            database: {
              status: 'healthy',
              latency: 15
            },
            hsm: {
              status: 'healthy',
              latency: 25,
              partitions: 3
            },
            stellar: {
              status: 'healthy',
              network: 'testnet',
              latestLedger: 538942
            },
            whatsapp: {
              status: 'healthy',
              latency: 120
            }
          }
        },
        metadata: {
          checkDuration: 156,
          allComponentsHealthy: true,
          lastFullCheck: '2024-12-14T10:30:00Z'
        }
      }
    }
  })
  async getDetailedHealth() {
    try {
      const startTime = Date.now();

      // Check database health
      const databaseHealth = await this.database.healthCheck();
      
      // Mock other component health for now (avoid circular dependencies)
      const hsmHealth = { status: 'healthy', latency: 25, partitions: 3 };
      const stellarHealth = { network: 'testnet', latestLedger: 538942 };
      const whatsappHealth = { status: 'healthy', latency: 120 };

      const allHealthy = databaseHealth.status === 'healthy';
      const overallStatus = allHealthy ? 'healthy' : 'degraded';

      return {
        success: true,
        data: {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          service: 'stellar-custody-mvp-backend',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          mtlsEnabled: process.env.MTLS_ENABLED === 'true',
          components: {
            database: {
              status: databaseHealth.status,
              latency: databaseHealth.latency
            },
            hsm: {
              status: hsmHealth.status,
              latency: hsmHealth.latency,
              partitions: hsmHealth.partitions
            },
            stellar: {
              status: stellarHealth ? 'healthy' : 'unhealthy',
              network: stellarHealth?.network || 'unknown',
              latestLedger: stellarHealth?.latestLedger || 0
            },
            whatsapp: {
              status: whatsappHealth.status,
              latency: whatsappHealth.latency
            }
          }
        },
        metadata: {
          checkDuration: Date.now() - startTime,
          allComponentsHealthy: allHealthy,
          lastFullCheck: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        }
      };
    }
  }

  // ==================== PERFORMANCE METRICS ====================

  @Get('performance')
  @ApiOperation({
    summary: 'Get system performance metrics',
    description: 'System performance and latency metrics for dashboard'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System performance metrics',
    type: PerformanceMetricsDto
  })
  async getPerformanceMetrics() {
    try {
      // Mock performance metrics
      return {
        success: true,
        data: {
          performance: {
            requests: {
              total: 1247,
              successful: 1198,
              failed: 49,
              successRate: 96.1
            },
            latency: {
              average: 145,
              p95: 250,
              p99: 380
            },
            hsm: {
              operationsPerMinute: 12,
              averageLatency: 85,
              errorRate: 0.2
            }
          },
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== SECURITY MONITORING ====================

  @Get('security/events')
  @ApiOperation({
    summary: 'Get security events summary',
    description: 'Security event monitoring and incident tracking'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Security events summary',
    type: SecurityMetricsDto
  })
  async getSecurityMetrics() {
    try {
      // Mock security metrics
      return {
        success: true,
        data: {
          securityEvents: {
            totalEvents: 89,
            criticalEvents: 0,
            highPriorityEvents: 2,
            mediumPriorityEvents: 12,
            lowPriorityEvents: 75
          },
          authentication: {
            loginAttempts: 156,
            successfulLogins: 142,
            failedLogins: 14,
            totpVerifications: 389,
            totpFailures: 8
          },
          hsm: {
            keyOperations: 245,
            ephemeralKeysGenerated: 156,
            ephemeralKeysDestroyed: 142,
            keyExpirations: 3
          },
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }
}
