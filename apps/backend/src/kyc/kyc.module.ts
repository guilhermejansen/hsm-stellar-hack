import { Module } from "@nestjs/common";
import { KYCService } from "./kyc.service";
import { HSMModule } from "../hsm/hsm.module";

/**
 * 📋 KYC Module - Know Your Customer Processing
 *
 * Features:
 * - Complete KYC workflow
 * - HSM partition creation
 * - PII encryption with Svault
 * - Document verification
 * - Compliance tracking
 */
@Module({
  imports: [HSMModule],
  providers: [KYCService],
  exports: [KYCService],
})
export class KYCModule {}
