import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TransactionKeyService } from './transaction-key.service';
import { PrivacyController } from './privacy.controller';
import { HSMModule } from '../hsm/hsm.module';
import { StellarModule } from '../stellar/stellar.module';
import { TransactionModule } from '../transactions/transaction.module';

/**
 * 💰 Wallet Module - Complete BIP32 HD Wallet Management
 * 
 * Features:
 * - Cold/Hot wallet hierarchy (m/0', m/0'/0')
 * - Ephemeral transaction keys (m/0'/0'/N')
 * - Transaction privacy protection
 * - BIP32 key derivation with privacy protection
 * - Balance management
 * - Automatic rebalancing
 * - HSM protection with auto-expiry
 * - Privacy compliance reporting
 */
@Module({
  imports: [
    HSMModule,
    StellarModule
    // Note: TransactionModule import would create circular dependency
  ],
  controllers: [
    WalletController,
    PrivacyController
  ],
  providers: [
    WalletService,
    TransactionKeyService
  ],
  exports: [
    WalletService,
    TransactionKeyService
  ]
})
export class WalletModule {}
