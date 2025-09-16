import { Module, forwardRef } from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { TransactionController } from "./transaction.controller";
import { HSMModule } from "../hsm/hsm.module";
import { StellarModule } from "../stellar/stellar.module";
import { ChallengeModule } from "../challenges/challenge.module";
import { GuardianModule } from "../guardians/guardian.module";
import { WalletModule } from "../wallets/wallet.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";

/**
 * 💰 Transaction Module - Multi-Sig Transaction Processing
 *
 * Features:
 * - Flexible threshold schemes (2-of-3, 3-of-3)
 * - OCRA-like challenge-response
 * - HSM signature integration
 * - Balance management
 * - Execution coordination
 */
@Module({
  imports: [
    HSMModule,
    StellarModule,
    ChallengeModule,
    GuardianModule,
    WalletModule,
    WhatsAppModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
