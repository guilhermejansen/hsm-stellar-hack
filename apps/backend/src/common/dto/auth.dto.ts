import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";

/**
 * 🔐 Authentication DTOs - Login & TOTP Verification
 *
 * Following security-practices.mdc authentication layers:
 * - Email + Password login
 * - TOTP verification for guardians
 * - JWT token management
 */

// ==================== LOGIN ====================

export class LoginDto {
  @ApiProperty({
    description: "User email address",
    example: "ceo@stellarcustody.com",
    format: "email",
  })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: "User password",
    example: "ceo123456",
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(128, { message: "Password must not exceed 128 characters" })
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: "Session token for TOTP verification",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  sessionToken: string;

  @ApiProperty({
    description: "Whether TOTP verification is required",
    example: true,
  })
  requiresTOTP: boolean;

  @ApiProperty({
    description: "Unique challenge ID for TOTP session",
    example: "uuid-challenge-id-12345",
  })
  totpChallenge: string;

  @ApiProperty({
    description: "User information",
    type: "object",
    properties: {
      id: { type: "string", example: "clrx1234567890user01" },
      email: { type: "string", example: "ceo@stellarcustody.com" },
      name: { type: "string", example: "João Silva Santos" },
      role: { type: "string", example: "CEO" },
      isGuardian: { type: "boolean", example: true },
      hsmActivated: { type: "boolean", example: true },
    },
  })
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
    isGuardian: boolean;
    hsmActivated: boolean;
  };
}

// ==================== TOTP VERIFICATION ====================

export class TOTPVerificationDto {
  @ApiProperty({
    description: "TOTP code from authenticator app",
    example: "123456",
    pattern: "^[0-9]{6}$",
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  totpCode: string;

  @ApiProperty({
    description: "Action being performed (optional)",
    example: "access_token",
    required: false,
  })
  @IsOptional()
  @IsString()
  action?: string;
}

export class TOTPVerificationResponseDto {
  @ApiProperty({
    description: "Full access token for API operations",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiProperty({
    description: "Token expiry time",
    example: "24h",
  })
  expiresIn: string;

  @ApiProperty({
    description: "Token type",
    example: "Bearer",
  })
  tokenType: string;
}

// ==================== JWT PAYLOAD ====================

export class JWTPayloadDto {
  @ApiProperty({
    description: "User ID",
    example: "clrx1234567890user01",
  })
  sub: string;

  @ApiProperty({
    description: "User email",
    example: "ceo@stellarcustody.com",
  })
  email: string;

  @ApiProperty({
    description: "Guardian role",
    example: "CEO",
    enum: ["CEO", "CFO", "CTO"],
    required: false,
  })
  role?: string;

  @ApiProperty({
    description: "Guardian level (1-3)",
    example: 3,
    minimum: 1,
    maximum: 3,
    required: false,
  })
  level?: number;

  @ApiProperty({
    description: "Token type",
    example: "access",
    enum: ["session", "access"],
  })
  type: string;

  @ApiProperty({
    description: "HSM activation status",
    example: true,
  })
  hsmActivated: boolean;
}

// ==================== SESSION MANAGEMENT ====================

export class SessionInfoDto {
  @ApiProperty({
    description: "Session ID",
    example: "session_abc123def456",
  })
  sessionId: string;

  @ApiProperty({
    description: "User ID",
    example: "clrx1234567890user01",
  })
  userId: string;

  @ApiProperty({
    description: "Session creation time",
    example: "2024-12-14T10:20:00Z",
  })
  createdAt: string;

  @ApiProperty({
    description: "Last activity time",
    example: "2024-12-14T10:30:00Z",
  })
  lastActivity: string;

  @ApiProperty({
    description: "IP address",
    example: "192.168.1.100",
  })
  ipAddress: string;

  @ApiProperty({
    description: "User agent",
    example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  })
  userAgent: string;
}
