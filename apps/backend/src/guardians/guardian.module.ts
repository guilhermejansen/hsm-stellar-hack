import { Module, forwardRef } from '@nestjs/common';
import { GuardianService } from './guardian.service';
import { GuardianController } from './guardian.controller';
import { HSMModule } from '../hsm/hsm.module';
import { KYCModule } from '../kyc/kyc.module';
import { WalletModule } from '../wallets/wallet.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

/**
 * 👥 Guardian Module - 3 Guardian Management System
 * 
 * Features:
 * - Guardian registration (CEO, CFO, CTO)
 * - TOTP setup and activation
 * - HSM partition management
 * - Approval tracking
 * - Role-based permissions
 */
@Module({
  imports: [
    HSMModule,
    KYCModule,
    WalletModule,
    WhatsAppModule
  ],
  controllers: [GuardianController],
  providers: [GuardianService],
  exports: [GuardianService]
})
export class GuardianModule {}
