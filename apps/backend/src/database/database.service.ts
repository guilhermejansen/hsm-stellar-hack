import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * 🗄️ Database Service - Prisma Client Manager
 * 
 * Manages database connections and provides a global Prisma client
 * for all services in the Stellar Custody MVP system.
 * 
 * Features:
 * - Connection pooling
 * - Health monitoring
 * - Graceful shutdown
 * - Query logging in development
 */
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    super({
      // Connection configuration
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      
      // Logging configuration
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
      
      // Error formatting
      errorFormat: 'pretty'
    });
  }

  /**
   * Initialize database connection on module startup
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
      
      // Test database connectivity
      await this.$queryRaw`SELECT 1`;
      this.logger.log('✅ Database health check passed');
      
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Clean shutdown on module destroy
   */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('🔄 Database disconnected gracefully');
    } catch (error) {
      this.logger.error('❌ Database disconnect error:', error.message);
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{ status: string; latency: number }> {
    const startTime = Date.now();
    
    try {
      await this.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      this.logger.error('❌ Database health check failed:', error.message);
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Execute database operations within a transaction
   */
  async executeTransaction<T>(
    operations: (prisma: any) => Promise<T>
  ): Promise<T> {
    return this.$transaction(async (prisma) => {
      return operations(prisma);
    });
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const [
        userCount,
        guardianCount,
        walletCount,
        transactionCount,
        pendingTransactions
      ] = await Promise.all([
        this.user.count(),
        this.guardian.count({ where: { isActive: true } }),
        this.wallet.count(),
        this.transaction.count(),
        this.transaction.count({ where: { status: 'AWAITING_APPROVAL' } })
      ]);

      return {
        users: userCount,
        guardians: guardianCount,
        wallets: walletCount,
        transactions: transactionCount,
        pendingApprovals: pendingTransactions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('❌ Failed to get database stats:', error.message);
      throw error;
    }
  }
}
