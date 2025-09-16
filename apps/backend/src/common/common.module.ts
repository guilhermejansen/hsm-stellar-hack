import { Global, Module } from "@nestjs/common";
import { EncryptionService } from "./encryption.service";
import { ValidationService } from "./validation.service";
import { AuditService } from "./audit.service";
import { MonitoringController } from "./monitoring.controller";

/**
 * 🔧 Common Module - Shared utilities and services
 *
 * Contains:
 * - DTOs for all entities
 * - Shared interfaces
 * - Encryption utilities
 * - Validation helpers
 * - Audit logging
 * - System monitoring
 */
@Global()
@Module({
  controllers: [MonitoringController],
  providers: [EncryptionService, ValidationService, AuditService],
  exports: [EncryptionService, ValidationService, AuditService],
})
export class CommonModule {}
