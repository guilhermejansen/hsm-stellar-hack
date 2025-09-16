import { ApiProperty } from "@nestjs/swagger";

/**
 * 📊 Monitoring DTOs - System Health & Performance Metrics
 *
 * Following FINAL_ARCHITECTURE_SUMMARY.mdc monitoring requirements:
 * - System health monitoring
 * - Performance metrics
 * - Security event tracking
 * - HSM status monitoring
 */

// ==================== SYSTEM HEALTH ====================

export class SystemHealthDto {
  @ApiProperty({
    description: "Overall system status",
    example: "healthy",
    enum: ["healthy", "degraded", "unhealthy"],
  })
  status: "healthy" | "degraded" | "unhealthy";

  @ApiProperty({
    description: "System timestamp",
    example: "2024-12-14T10:30:00Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "Service name",
    example: "stellar-custody-mvp-backend",
  })
  service: string;

  @ApiProperty({
    description: "Service version",
    example: "1.0.0",
  })
  version: string;

  @ApiProperty({
    description: "Environment",
    example: "development",
    enum: ["development", "staging", "production"],
  })
  environment: string;

  @ApiProperty({
    description: "mTLS enabled status",
    example: false,
  })
  mtlsEnabled: boolean;

  @ApiProperty({
    description: "Component health status",
    type: "object",
    properties: {
      database: {
        type: "object",
        properties: {
          status: { type: "string", example: "healthy" },
          latency: { type: "number", example: 15 },
        },
      },
      hsm: {
        type: "object",
        properties: {
          status: { type: "string", example: "healthy" },
          latency: { type: "number", example: 25 },
          partitions: { type: "number", example: 3 },
        },
      },
      stellar: {
        type: "object",
        properties: {
          status: { type: "string", example: "healthy" },
          network: { type: "string", example: "testnet" },
          latestLedger: { type: "number", example: 538942 },
        },
      },
      whatsapp: {
        type: "object",
        properties: {
          status: { type: "string", example: "healthy" },
          latency: { type: "number", example: 120 },
        },
      },
    },
  })
  components: {
    database: {
      status: string;
      latency: number;
    };
    hsm: {
      status: string;
      latency: number;
      partitions: number;
    };
    stellar: {
      status: string;
      network: string;
      latestLedger: number;
    };
    whatsapp: {
      status: string;
      latency: number;
    };
  };
}

// ==================== PERFORMANCE METRICS ====================

export class PerformanceMetricsDto {
  @ApiProperty({
    description: "System performance metrics",
    type: "object",
    properties: {
      requests: {
        type: "object",
        properties: {
          total: { type: "number", example: 1247 },
          successful: { type: "number", example: 1198 },
          failed: { type: "number", example: 49 },
          successRate: { type: "number", example: 96.1 },
        },
      },
      latency: {
        type: "object",
        properties: {
          average: { type: "number", example: 145 },
          p95: { type: "number", example: 250 },
          p99: { type: "number", example: 380 },
        },
      },
      hsm: {
        type: "object",
        properties: {
          operationsPerMinute: { type: "number", example: 12 },
          averageLatency: { type: "number", example: 85 },
          errorRate: { type: "number", example: 0.2 },
        },
      },
    },
  })
  performance: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
    latency: {
      average: number;
      p95: number;
      p99: number;
    };
    hsm: {
      operationsPerMinute: number;
      averageLatency: number;
      errorRate: number;
    };
  };

  @ApiProperty({
    description: "Timestamp of metrics collection",
    example: "2024-12-14T10:30:00Z",
  })
  timestamp: string;
}

// ==================== SECURITY METRICS ====================

export class SecurityMetricsDto {
  @ApiProperty({
    description: "Security events summary",
    type: "object",
    properties: {
      totalEvents: { type: "number", example: 89 },
      criticalEvents: { type: "number", example: 0 },
      highPriorityEvents: { type: "number", example: 2 },
      mediumPriorityEvents: { type: "number", example: 12 },
      lowPriorityEvents: { type: "number", example: 75 },
    },
  })
  securityEvents: {
    totalEvents: number;
    criticalEvents: number;
    highPriorityEvents: number;
    mediumPriorityEvents: number;
    lowPriorityEvents: number;
  };

  @ApiProperty({
    description: "Authentication metrics",
    type: "object",
    properties: {
      loginAttempts: { type: "number", example: 156 },
      successfulLogins: { type: "number", example: 142 },
      failedLogins: { type: "number", example: 14 },
      totpVerifications: { type: "number", example: 389 },
      totpFailures: { type: "number", example: 8 },
    },
  })
  authentication: {
    loginAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    totpVerifications: number;
    totpFailures: number;
  };

  @ApiProperty({
    description: "HSM security metrics",
    type: "object",
    properties: {
      keyOperations: { type: "number", example: 245 },
      ephemeralKeysGenerated: { type: "number", example: 156 },
      ephemeralKeysDestroyed: { type: "number", example: 142 },
      keyExpirations: { type: "number", example: 3 },
    },
  })
  hsm: {
    keyOperations: number;
    ephemeralKeysGenerated: number;
    ephemeralKeysDestroyed: number;
    keyExpirations: number;
  };

  @ApiProperty({
    description: "Timestamp of metrics collection",
    example: "2024-12-14T10:30:00Z",
  })
  timestamp: string;
}
