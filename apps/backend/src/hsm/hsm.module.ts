import { Module } from "@nestjs/common";
import { HSMService } from "./hsm.service";

/**
 * 🔐 HSM Module - Hardware Security Module Integration
 *
 * Core module for HSM DINAMO operations:
 * - User partition creation
 * - BIP32 key derivation
 * - TOTP-authorized signing
 * - PII encryption with Svault
 */
@Module({
  providers: [HSMService],
  exports: [HSMService],
})
export class HSMModule {}
