import { Global, Module } from "@nestjs/common";
import { DatabaseService } from "./database.service";

/**
 * 🗄️ Database Module - Global Prisma Client
 *
 * Features:
 * - Global Prisma client for all modules
 * - Connection pooling
 * - Database health monitoring
 * - Transaction management
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
