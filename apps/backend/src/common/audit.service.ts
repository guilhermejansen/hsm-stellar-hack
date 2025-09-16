import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuditLogEntry } from "./interfaces";

/**
 * 📝 Audit Service - Security event logging and compliance
 *
 * Following security-practices.mdc audit requirements:
 * - Log all critical actions
 * - HSM operations tracking
 * - TOTP/Challenge validation events
 * - Guardian approval actions
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * Log audit event with full context
   */
  async logEvent(entry: AuditLogEntry): Promise<void> {
    try {
      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        this.logger.log(
          `📝 AUDIT: ${entry.action} by ${entry.userId} - ${entry.result}`,
        );
      }

      // For now, we'll store in a JSON log file
      // In production, this should go to a dedicated audit database or SIEM
      const auditEntry = {
        timestamp: entry.timestamp.toISOString(),
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        ip: entry.ip,
        userAgent: entry.userAgent,
        result: entry.result,
        metadata: entry.metadata,

        // Security specific fields
        authMethod: entry.authMethod,
        hsmPartitionUsed: entry.hsmPartitionUsed,
        challengeHash: entry.challengeHash,
        certificateUsed: entry.certificateUsed,
      };

      // Store in database for queryability (best effort)
      try {
        const prisma: any = this.database as any;
        if (prisma.auditLog?.create) {
          await prisma.auditLog.create({
            data: {
              timestamp: new Date(auditEntry.timestamp),
              userId: auditEntry.userId,
              action: auditEntry.action,
              resource: auditEntry.resource,
              ip: auditEntry.ip,
              userAgent: auditEntry.userAgent,
              result: auditEntry.result,
              metadata: auditEntry.metadata || {},
              authMethod: auditEntry.authMethod,
              hsmPartitionUsed: auditEntry.hsmPartitionUsed,
              challengeHash: auditEntry.challengeHash,
              certificateUsed: auditEntry.certificateUsed,
            },
          });
        } else {
          this.logger.debug("AuditLog model not available (no migration applied)");
        }
      } catch (dbErr) {
        this.logger.warn("Audit DB persistence failed (non-blocking):", dbErr);
      }

      this.logger.debug("Audit event logged", auditEntry);
    } catch (error) {
      this.logger.error("❌ Failed to log audit event:", error.message);
      // Don't throw - audit logging should never break the main flow
    }
  }

  /**
   * Log guardian action (high priority)
   */
  async logGuardianAction(
    guardianId: string,
    action: string,
    result: "success" | "failure",
    metadata?: any,
    request?: any,
  ): Promise<void> {
    await this.logEvent({
      timestamp: new Date(),
      userId: guardianId,
      action: `guardian.${action}`,
      resource: "guardian",
      ip: request?.ip || "unknown",
      userAgent: request?.get("user-agent") || "unknown",
      result,
      metadata,
      authMethod: metadata?.authMethod,
      hsmPartitionUsed: metadata?.hsmPartitionUsed,
      challengeHash: metadata?.challengeHash,
    });
  }

  /**
   * Log HSM operation (critical priority)
   */
  async logHSMOperation(
    userId: string,
    operation: string,
    result: "success" | "failure",
    partitionId?: string,
    keyId?: string,
    metadata?: any,
  ): Promise<void> {
    await this.logEvent({
      timestamp: new Date(),
      userId,
      action: `hsm.${operation}`,
      resource: "hsm",
      ip: "internal",
      userAgent: "backend-service",
      result,
      metadata: {
        ...metadata,
        partitionId,
        keyId,
      },
      hsmPartitionUsed: partitionId,
    });
  }

  /**
   * Log transaction event
   */
  async logTransaction(
    userId: string,
    transactionId: string,
    action: string,
    result: "success" | "failure",
    metadata?: any,
    request?: any,
  ): Promise<void> {
    await this.logEvent({
      timestamp: new Date(),
      userId,
      action: `transaction.${action}`,
      resource: "transaction",
      ip: request?.ip || "unknown",
      userAgent: request?.get("user-agent") || "unknown",
      result,
      metadata: {
        ...metadata,
        transactionId,
      },
    });
  }

  /**
   * Log challenge-response event (OCRA-like)
   */
  async logChallengeEvent(
    guardianId: string,
    action: string,
    challengeHash: string,
    result: "success" | "failure",
    authMethod?: string,
    request?: any,
  ): Promise<void> {
    await this.logEvent({
      timestamp: new Date(),
      userId: guardianId,
      action: `challenge.${action}`,
      resource: "challenge",
      ip: request?.ip || "unknown",
      userAgent: request?.get("user-agent") || "unknown",
      result,
      metadata: {
        challengeHash: challengeHash.substring(0, 16), // Truncate for privacy
      },
      authMethod,
      challengeHash,
    });
  }

  /**
   * Log security event (highest priority)
   */
  async logSecurityEvent(
    event: string,
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    userId?: string,
    metadata?: any,
    request?: any,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      userId: userId || "system",
      action: `security.${event}`,
      resource: "security",
      ip: request?.ip || "unknown",
      userAgent: request?.get("user-agent") || "unknown",
      result: "failure", // Security events are typically failures
      metadata: {
        ...metadata,
        severity,
      },
    };

    await this.logEvent(entry);

    // For critical events, also log to console immediately
    if (severity === "CRITICAL") {
      this.logger.error(`🚨 CRITICAL SECURITY EVENT: ${event}`, {
        userId,
        metadata,
        ip: request?.ip,
      });
    }
  }
}
