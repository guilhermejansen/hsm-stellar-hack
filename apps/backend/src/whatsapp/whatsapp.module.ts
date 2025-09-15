import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppAssetsService } from './whatsapp-assets.service';

/**
 * 📱 WhatsApp Module - ZuckZapGo API Integration
 * 
 * Features:
 * - Text notifications
 * - Approval button messages
 * - Success confirmations with Stellar sticker
 * - QR code delivery
 * - Cold Wallet authentication with images
 * - Emergency alerts
 */
@Module({
  providers: [
    WhatsAppAssetsService,
    WhatsAppService
  ],
  exports: [
    WhatsAppService,
    WhatsAppAssetsService
  ]
})
export class WhatsAppModule {}
