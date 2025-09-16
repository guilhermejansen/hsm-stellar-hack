import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

// Database
import { DatabaseModule } from "./database/database.module";

// Core Services
import { HSMModule } from "./hsm/hsm.module";
import { ChallengeModule } from "./challenges/challenge.module";
import { KYCModule } from "./kyc/kyc.module";
import { WalletModule } from "./wallets/wallet.module";

// Business Logic
import { GuardianModule } from "./guardians/guardian.module";
import { TransactionModule } from "./transactions/transaction.module";
import { StellarModule } from "./stellar/stellar.module";
import { WhatsAppModule } from "./whatsapp/whatsapp.module";

// Security & Authentication
import { AuthModule } from "./auth/auth.module";
import { MTLSModule } from "./mtls/mtls.module";

// Common utilities
import { CommonModule } from "./common/common.module";

/**
 * 🎯 Stellar Custody MVP - Main Application Module
 *
 * Architecture Overview:
 * - HSM DINAMO integration for hardware key protection
 * - 3 Guardian system (CEO, CFO, CTO) with flexible thresholds
 * - OCRA-like challenge-response authentication
 * - BIP32 hierarchical deterministic wallets
 * - mTLS for secure communications
 * - WhatsApp notifications via ZuckZapGo API
 *
 * Security Features:
 * - All private keys protected by HSM partitions
 * - TOTP + Challenge-response for transaction approvals
 * - Cold wallet (95%) as master, Hot wallet (5%) as derived
 * - Complete audit trail for compliance
 */
@Module({
  imports: [
    // Configuration - Load environment variables first
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [
        ".env.local", // Highest priority
        ".env", // Standard
        "_env.example", // Fallback for development
      ],
    }),

    // Scheduler for background tasks
    ScheduleModule.forRoot(),

    // Database connection
    DatabaseModule,

    // Common utilities (shared across modules)
    CommonModule,

    // Core Infrastructure Services
    HSMModule, // HSM DINAMO integration (core dependency)
    MTLSModule, // mTLS certificate management

    // Authentication & Security
    AuthModule, // JWT, TOTP, session management
    ChallengeModule, // OCRA-like challenge-response system

    // Business Logic Services
    KYCModule, // Know Your Customer onboarding
    WalletModule, // BIP32 HD Wallet management
    GuardianModule, // 3-Guardian management (CEO, CFO, CTO)
    TransactionModule, // Multi-sig transaction processing

    // External Integrations
    StellarModule, // Blockchain integration
    WhatsAppModule, // ZuckZapGo API notifications
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor() {
    console.log("🎯 Stellar Custody MVP Backend - Initialized");
    console.log(
      "🔐 Security Features: HSM + OCRA-like + mTLS + 3-Guardian Multi-Sig",
    );
  }
}
