import { Module } from "@nestjs/common";
import { StellarService } from "./stellar.service";

/**
 * 🌟 Stellar Module - Blockchain Integration
 *
 * Features:
 * - Horizon API integration
 * - Soroban smart contract calls
 * - Transaction building and submission
 * - Account management
 * - Network monitoring
 */
@Module({
  providers: [StellarService],
  exports: [StellarService],
})
export class StellarModule {}
