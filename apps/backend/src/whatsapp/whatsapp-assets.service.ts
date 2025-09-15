import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 📱 WhatsApp Assets Service - Manage images and stickers for notifications
 * 
 * Manages:
 * - Stellar sticker for success messages
 * - TOTP instruction images
 * - Success celebration images
 * - QR codes for authentication
 */
@Injectable()
export class WhatsAppAssetsService {
  private readonly logger = new Logger(WhatsAppAssetsService.name);
  private readonly assetsPath = path.join(__dirname, '../../');

  /**
   * Get Stellar success sticker (base64)
   */
  async getStellarSticker(): Promise<string> {
    try {
      const stickerPath = path.join(this.assetsPath, 'avatar-stellar-sticker.txt');
      const stickerData = fs.readFileSync(stickerPath, 'utf8');
      
      // Validate it's a data URL
      if (!stickerData.startsWith('data:image/')) {
        throw new Error('Invalid sticker format');
      }
      
      return stickerData.trim();
    } catch (error) {
      this.logger.error('❌ Failed to load Stellar sticker:', error.message);
      // Return a minimal transparent WebP as fallback
      return 'data:image/webp;base64,UklGRiYAAABXRUJQVlA4IBoAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vuUAAA=';
    }
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    try {
      const successPath = path.join(this.assetsPath, 'success.txt');
      const successData = fs.readFileSync(successPath, 'utf8');
      
      // If it's base64, extract or use default message
      if (successData.startsWith('data:image/')) {
        return '🎉 **Transação Executada com Sucesso!**\n\n✅ Sua transação foi processada e enviada para a blockchain Stellar.\n\n🔗 Verifique o status no Explorer.\n\n🔐 Stellar Custody MVP';
      }
      
      return successData.trim();
    } catch (error) {
      this.logger.error('❌ Failed to load success message:', error.message);
      return '🎉 **Transação Executada com Sucesso!**\n\n✅ Sua transação foi processada com segurança.\n\n🔐 Stellar Custody MVP';
    }
  }

  /**
   * Get TOTP authentication message
   */
  async getTOTPMessage(): Promise<string> {
    try {
      const totpPath = path.join(this.assetsPath, 'totp.txt');
      const totpData = fs.readFileSync(totpPath, 'utf8');
      
      // If it's base64, use default message
      if (totpData.startsWith('data:image/')) {
        return '🔐 **Autenticação Necessária**\n\n🛡️ Uma transação de alta segurança precisa da sua aprovação.\n\n📱 **Passos:**\n1. Acesse a plataforma Stellar Custody\n2. Vá para "Aprovações Pendentes"\n3. Digite seu código TOTP\n4. Autorize a transação\n\n⏰ **Tempo limite:** 5 minutos\n\n🔗 **Link da plataforma:**';
      }
      
      return totpData.trim();
    } catch (error) {
      this.logger.error('❌ Failed to load TOTP message:', error.message);
      return '🔐 **Autenticação Necessária**\n\n🛡️ Acesse a plataforma para autorizar esta transação.\n\n📱 Use seu código TOTP de 6 dígitos.\n\n⏰ Tempo limite: 5 minutos';
    }
  }

  /**
   * Get TOTP instruction image (if available)
   */
  async getTOTPImage(): Promise<string | null> {
    try {
      const totpPath = path.join(this.assetsPath, 'totp.txt');
      const totpData = fs.readFileSync(totpPath, 'utf8');
      
      // If it's a data URL (base64 image), return it
      if (totpData.startsWith('data:image/')) {
        return totpData.trim();
      }
      
      return null;
    } catch (error) {
      this.logger.error('❌ Failed to load TOTP image:', error.message);
      return null;
    }
  }

  /**
   * Get success celebration image (if available)
   */
  async getSuccessImage(): Promise<string | null> {
    try {
      const successPath = path.join(this.assetsPath, 'success.txt');
      const successData = fs.readFileSync(successPath, 'utf8');
      
      // If it's a data URL (base64 image), return it
      if (successData.startsWith('data:image/')) {
        return successData.trim();
      }
      
      return null;
    } catch (error) {
      this.logger.error('❌ Failed to load success image:', error.message);
      return null;
    }
  }

  /**
   * Validate base64 image data
   */
  private isValidBase64Image(data: string): boolean {
    try {
      // Check if it starts with data URL prefix
      if (!data.startsWith('data:image/')) {
        return false;
      }

      // Extract base64 part
      const base64Part = data.split(',')[1];
      if (!base64Part) {
        return false;
      }

      // Try to decode base64
      Buffer.from(base64Part, 'base64');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get asset file stats
   */
  async getAssetStats() {
    try {
      const assets = ['avatar-stellar-sticker.txt', 'success.txt', 'totp.txt'];
      const stats = [];

      for (const asset of assets) {
        try {
          const assetPath = path.join(this.assetsPath, asset);
          const stat = fs.statSync(assetPath);
          const content = fs.readFileSync(assetPath, 'utf8');
          
          stats.push({
            name: asset,
            size: stat.size,
            sizeKB: Math.round(stat.size / 1024),
            isBase64: content.startsWith('data:image/'),
            isValid: this.isValidBase64Image(content),
            lastModified: stat.mtime.toISOString()
          });
        } catch (error) {
          stats.push({
            name: asset,
            error: error.message,
            exists: false
          });
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('❌ Failed to get asset stats:', error.message);
      return [];
    }
  }
}
