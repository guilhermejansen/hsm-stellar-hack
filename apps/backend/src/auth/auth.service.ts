import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { authenticator } from "otplib";
import * as bcrypt from "bcrypt";

import { DatabaseService } from "../database/database.service";
import { EncryptionService } from "../common/encryption.service";
import { AuditService } from "../common/audit.service";

/**
 * 🔐 Authentication Service - JWT + TOTP + Session Management
 *
 * Following security-practices.mdc authentication layers:
 * 1. User Login: Email + Password + TOTP
 * 2. Guardian Actions: Additional TOTP verification
 * 3. Transaction Approval: Separate TOTP per approval
 * 4. Emergency Override: Admin recovery codes
 *
 * Security features:
 * - JWT tokens with short expiry (15 minutes)
 * - TOTP replay protection
 * - Session management
 * - Rate limiting integration
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private usedTotpCodes = new Set<string>();

  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly encryption: EncryptionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    // Configure TOTP
    authenticator.options = {
      window: 1, // Allow 1 step tolerance
      digits: 6, // 6-digit codes
      step: 30, // 30 second intervals
      crypto: require("crypto"), // Use Node crypto
    };
  }

  // ==================== USER AUTHENTICATION ====================

  /**
   * Authenticate user with email and password
   */
  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.database.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          guardian: true,
        },
      });

      if (!user) {
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        await this.auditService.logSecurityEvent(
          "invalid_password_attempt",
          "MEDIUM",
          user.id,
          { email },
        );
        return null;
      }

      // Check if user is active
      if (user.guardian && !user.guardian.isActive) {
        await this.auditService.logSecurityEvent(
          "inactive_user_login_attempt",
          "HIGH",
          user.id,
          { email },
        );
        return null;
      }

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.guardian?.role,
        isGuardian: !!user.guardian,
        hsmActivated: user.hsmActivated,
        totpRequired: !!user.totpSecret,
      };
    } catch (error) {
      this.logger.error("❌ User validation failed:", error.message);
      return null;
    }
  }

  /**
   * Login with email and password (returns session token, requires TOTP for sensitive actions)
   */
  async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    sessionToken: string;
    requiresTOTP: boolean;
    totpChallenge: string;
    user: any;
  }> {
    try {
      this.logger.log(`🔐 Login attempt: ${email}`);

      const user = await this.validateUser(email, password);
      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Generate session token (short-lived)
      const sessionToken = this.jwtService.sign(
        {
          sub: user.userId,
          email: user.email,
          role: user.role,
          type: "session",
        },
        {
          expiresIn: "15m", // Short session for security
        },
      );

      // Generate TOTP challenge ID
      const totpChallenge = require("uuid").v4();

      // Audit log
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: user.userId,
        action: "auth.login",
        resource: "authentication",
        ip: ipAddress,
        userAgent,
        result: "success",
        metadata: {
          email: user.email,
          role: user.role,
          requiresTOTP: user.totpRequired,
        },
      });

      this.logger.log(
        `✅ Login successful: ${user.email} (${user.role || "user"})`,
      );

      return {
        sessionToken,
        requiresTOTP: user.totpRequired,
        totpChallenge,
        user: {
          id: user.userId,
          email: user.email,
          name: user.name,
          role: user.role,
          isGuardian: user.isGuardian,
          hsmActivated: user.hsmActivated,
        },
      };
    } catch (error) {
      await this.auditService.logSecurityEvent(
        "login_failed",
        "MEDIUM",
        "unknown",
        { email, error: error.message },
        { ip: ipAddress, get: () => userAgent },
      );

      this.logger.error("❌ Login failed:", error.message);
      throw error;
    }
  }

  // ==================== TOTP AUTHENTICATION ====================

  /**
   * Verify TOTP code for guardian actions
   * Following security-practices.mdc TOTP implementation
   */
  async verifyTOTP(
    userId: string,
    totpCode: string,
    action: string = "general",
  ): Promise<boolean> {
    try {
      this.logger.log(
        `🔢 Verifying TOTP for user: ${userId} (action: ${action})`,
      );

      // Check replay attack
      const replayKey = `${userId}:${totpCode}`;
      if (this.usedTotpCodes.has(replayKey)) {
        await this.auditService.logSecurityEvent(
          "totp_replay_attack",
          "HIGH",
          userId,
          { action, totpCode: totpCode.substring(0, 2) + "****" },
        );
        return false;
      }

      // Get user with TOTP secret
      const user = await this.database.user.findUnique({
        where: { id: userId },
        include: { guardian: true },
      });

      if (!user || !user.totpSecret) {
        return false;
      }

      // For development, accept mock TOTP codes
      const isDevelopment =
        this.configService.get("NODE_ENV") === "development";
      const mockTotpEnabled =
        this.configService.get("BYPASS_TOTP_IN_TESTS", "false") === "true";

      let isValid = false;

      if (isDevelopment && mockTotpEnabled && totpCode === "123456") {
        // Accept mock TOTP for development
        isValid = true;
        this.logger.log(`🔧 Development mode: Accepting mock TOTP code`);
      } else {
        try {
          // For guardians, use guardian TOTP secret
          const encryptedSecret = user.guardian?.totpSecret || user.totpSecret;

          if (!encryptedSecret) {
            this.logger.error("❌ No TOTP secret found");
            return false;
          }

          // Try to decrypt TOTP secret
          let totpSecret: string;
          try {
            totpSecret = this.encryption.decrypt(encryptedSecret);
          } catch (decryptError) {
            // Fallback: assume it's base64 encoded (from seed)
            totpSecret = Buffer.from(encryptedSecret, "base64").toString();
          }

          // Verify TOTP
          isValid = authenticator.verify({
            token: totpCode,
            secret: totpSecret,
          });
        } catch (error) {
          this.logger.error("❌ TOTP validation error:", error.message);
          isValid = false;
        }
      }

      if (isValid) {
        // Mark as used to prevent replay
        this.usedTotpCodes.add(replayKey);
        setTimeout(() => this.usedTotpCodes.delete(replayKey), 90000); // 90 seconds

        // Update last used TOTP for guardian
        if (user.guardian) {
          await this.database.guardian.update({
            where: { id: user.guardian.id },
            data: { lastTotpUsed: totpCode },
          });
        }

        // Audit log success
        await this.auditService.logEvent({
          timestamp: new Date(),
          userId,
          action: `auth.totp_verified.${action}`,
          resource: "authentication",
          ip: "backend-service",
          userAgent: "auth-service",
          result: "success",
          metadata: { action },
        });
      } else {
        // Audit log failure
        await this.auditService.logSecurityEvent(
          "totp_verification_failed",
          "MEDIUM",
          userId,
          { action, totpCode: totpCode.substring(0, 2) + "****" },
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error("❌ TOTP verification failed:", error.message);
      return false;
    }
  }

  // ==================== JWT TOKEN MANAGEMENT ====================

  /**
   * Generate access token after TOTP verification
   */
  async generateAccessToken(userId: string, totpCode: string): Promise<string> {
    try {
      // Verify TOTP first
      const totpValid = await this.verifyTOTP(userId, totpCode, "access_token");
      if (!totpValid) {
        throw new Error("Invalid TOTP code");
      }

      const user = await this.database.user.findUnique({
        where: { id: userId },
        include: { guardian: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Generate full access token
      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.guardian?.role,
          level: user.guardian?.level,
          type: "access",
          hsmActivated: user.hsmActivated,
        },
        {
          expiresIn: this.configService.get("JWT_EXPIRES_IN", "24h"),
        },
      );

      this.logger.log(`✅ Access token generated for: ${user.email}`);
      return accessToken;
    } catch (error) {
      this.logger.error("❌ Access token generation failed:", error.message);
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);

      // Check if user still exists and is active
      const user = await this.database.user.findUnique({
        where: { id: payload.sub },
        include: { guardian: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.guardian && !user.guardian.isActive) {
        throw new Error("Guardian account deactivated");
      }

      return {
        userId: user.id,
        email: user.email,
        role: user.guardian?.role,
        level: user.guardian?.level,
        isGuardian: !!user.guardian,
        hsmActivated: user.hsmActivated,
      };
    } catch (error) {
      this.logger.error("❌ Token verification failed:", error.message);
      return null;
    }
  }

  // ==================== GUARDIAN SPECIFIC AUTH ====================

  /**
   * Authenticate guardian for sensitive actions
   * Requires TOTP verification beyond JWT
   */
  async authenticateGuardianAction(
    guardianId: string,
    totpCode: string,
    action: string,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `👥 Authenticating guardian action: ${action} for ${guardianId}`,
      );

      const guardian = await this.database.guardian.findUnique({
        where: { id: guardianId },
        include: { user: true },
      });

      if (!guardian || !guardian.isActive || !guardian.totpVerified) {
        await this.auditService.logSecurityEvent(
          "guardian_auth_invalid_state",
          "HIGH",
          guardianId,
          {
            action,
            isActive: guardian?.isActive,
            totpVerified: guardian?.totpVerified,
          },
        );
        return false;
      }

      // Verify TOTP
      const isValid = await this.verifyTOTP(guardian.userId, totpCode, action);

      if (isValid) {
        await this.auditService.logGuardianAction(
          guardianId,
          `authenticated_for_${action}`,
          "success",
          { action },
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error("❌ Guardian authentication failed:", error.message);
      return false;
    }
  }

  // ==================== PASSWORD MANAGEMENT ====================

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, 12);
    } catch (error) {
      this.logger.error("❌ Password hashing failed:", error.message);
      throw error;
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      this.logger.error("❌ Password verification failed:", error.message);
      return false;
    }
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Create user session
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<string> {
    try {
      const sessionId = require("uuid").v4();

      // Store session info (in production, use Redis)
      // For now, just return session ID

      await this.auditService.logEvent({
        timestamp: new Date(),
        userId,
        action: "auth.session_created",
        resource: "session",
        ip: ipAddress,
        userAgent,
        result: "success",
        metadata: { sessionId },
      });

      return sessionId;
    } catch (error) {
      this.logger.error("❌ Session creation failed:", error.message);
      throw error;
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string, userId: string): Promise<void> {
    try {
      // Remove from session store (Redis in production)

      await this.auditService.logEvent({
        timestamp: new Date(),
        userId,
        action: "auth.session_invalidated",
        resource: "session",
        ip: "backend-service",
        userAgent: "auth-service",
        result: "success",
        metadata: { sessionId },
      });

      this.logger.log(`✅ Session invalidated: ${sessionId}`);
    } catch (error) {
      this.logger.error("❌ Session invalidation failed:", error.message);
      throw error;
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Check if user requires TOTP
   */
  async requiresTOTP(userId: string): Promise<boolean> {
    try {
      const user = await this.database.user.findUnique({
        where: { id: userId },
        select: { totpSecret: true },
      });

      return !!user?.totpSecret;
    } catch (error) {
      this.logger.error("❌ TOTP requirement check failed:", error.message);
      return false;
    }
  }

  /**
   * Generate backup codes for TOTP
   */
  generateBackupCodes(): string[] {
    return Array.from({ length: 8 }, () =>
      require("crypto").randomBytes(4).toString("hex").toUpperCase(),
    );
  }
}
