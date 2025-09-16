import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

import { DatabaseService } from "../database/database.service";
import { AuditService } from "../common/audit.service";
import { WhatsAppAssetsService } from "./whatsapp-assets.service";
import { WhatsAppMessage, WhatsAppApprovalButton } from "../common/interfaces";

/**
 * 📱 WhatsApp Service - ZuckZapGo API Integration
 *
 * Following api-integrations.mdc WhatsApp integration:
 * - Text messages for notifications
 * - Button messages for approval requests
 * - Stickers for success confirmations
 * - Images for QR codes (TOTP setup)
 *
 * ZuckZapGo API Configuration:
 * - Base URL: https://api.zuckzapgo.com
 * - Token: !!qYWdJ61zk3i1AvTfXhzE!!
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private whatsappClient: AxiosInstance;
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly enabled: boolean;

  constructor(
    private readonly database: DatabaseService,
    private readonly auditService: AuditService,
    private readonly assetsService: WhatsAppAssetsService,
    private readonly configService: ConfigService,
  ) {
    this.enabled =
      this.configService.get("WHATSAPP_ENABLED", "false") === "true";
    this.apiUrl = this.configService.get(
      "WHATSAPP_API_URL",
      "https://api.zuckzapgo.com",
    );
    this.token = this.configService.get(
      "WHATSAPP_TOKEN",
      "!!qYWdJ61zk3i1AvTfXhzE!!",
    );

    if (!this.enabled) {
      this.logger.log("ℹ️ WhatsApp integration disabled (WHATSAPP_ENABLED=false)");
      return;
    }

    const inProd = this.configService.get("NODE_ENV") === "production";
    if (inProd && this.token === "!!qYWdJ61zk3i1AvTfXhzE!!") {
      throw new Error(
        "WHATSAPP_TOKEN must be set in production and cannot use default placeholder",
      );
    }

    this.initializeClient();
  }

  /**
   * Initialize WhatsApp API client
   */
  private initializeClient(): void {
    if (!this.enabled) return;
    this.whatsappClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        token: this.token,
        "User-Agent": "StellarCustody/1.0.0",
      },
    });

    this.logger.log("✅ WhatsApp client initialized");
  }

  // ==================== TEXT MESSAGES ====================

  /**
   * Send text message
   * Following api-integrations.mdc sendText implementation
   */
  async sendText(
    phone: string,
    message: string,
    metadata?: any,
  ): Promise<string> {
    try {
      if (!this.enabled) {
        this.logger.log("ℹ️ Skipping WhatsApp text (disabled)");
        return "whatsapp_disabled";
      }
      this.logger.log(`📱 Sending text to ${phone}`);

      const response = await this.whatsappClient.post("/chat/send/text", {
        Phone: phone,
        Body: message,
        Presence: 3000,
        NumberCheck: true,
      });

      // Save notification to database
      await this.saveNotification(
        {
          phone,
          message,
          type: "text",
          metadata,
        },
        response.data?.id,
      );

      this.logger.log(`✅ Text sent to ${phone}`);
      return response.data?.id || "unknown";
    } catch (error) {
      this.logger.error(`❌ Failed to send text to ${phone}:`, error.message);
      throw error;
    }
  }

  // ==================== APPROVAL BUTTONS ====================

  /**
   * Send approval button message with challenge
   * Following api-integrations.mdc sendApprovalButton implementation
   */
  async sendApprovalButton(approval: WhatsAppApprovalButton): Promise<string> {
    try {
      if (!this.enabled) {
        this.logger.log("ℹ️ Skipping WhatsApp approval button (disabled)");
        return "whatsapp_disabled";
      }
      this.logger.log(
        `📱 Sending approval button to ${approval.guardianRole}: ${approval.guardianPhone}`,
      );

      // Build approval URL
      const frontendUrl = this.configService.get(
        "FRONTEND_URL",
        "http://localhost:3000",
      );
      const approvalUrl = `${frontendUrl}/approve/${approval.transactionId}?guardian=${approval.guardianRole}&challenge=${approval.challengeHash}`;

      const requestData = {
        phone: approval.guardianPhone,
        title: "⚠️ Requeriment Approval",
        body: `🔐 **Multi-Sig Transaction**\n\n💰 **Amount:** ${approval.amount} XLM\n📍 **Destination:** ${approval.transactionId.slice(-8)}...\n🎯 **Challenge:** ${approval.challengeHash}\n\n👤 **Guardian:** ${approval.guardianRole}`,
        image: {
          url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(approvalUrl)}`,
        },
        buttons: [
          {
            buttonId: "approve_tx",
            buttonText: { displayText: "✅ Approve Now" },
            type: "cta_url",
            url: approvalUrl,
          },
        ],
        footer: `Stellar Custody - ${approval.guardianRole}`,
      };

      this.logger.log(`🔧 DEBUG: Sending WhatsApp request to ${approval.guardianPhone}:`, JSON.stringify(requestData, null, 2));

      const response = await this.whatsappClient.post("/chat/send/buttons", requestData);

      this.logger.log(`🔧 DEBUG: WhatsApp API response:`, JSON.stringify(response.data, null, 2));

      // Save notification
      await this.saveNotification(
        {
          phone: approval.guardianPhone,
          message: `Approval request for ${approval.amount} XLM`,
          type: "button",
          metadata: {
            transactionId: approval.transactionId,
            challengeHash: approval.challengeHash,
            approvalUrl,
          },
        },
        response.data?.id,
      );

      this.logger.log(`✅ Approval button sent to ${approval.guardianRole}`);
      return response.data?.id || "unknown";
    } catch (error) {
      this.logger.error(`❌ Failed to send approval button:`, error.message);
      throw error;
    }
  }

  // ==================== SUCCESS CONFIRMATIONS ====================

  /**
   * Send success sticker confirmation with custom Stellar sticker
   * Using avatar-stellar-sticker.txt (base64 sticker)
   */
  async sendSuccessSticker(
    phone: string,
    transactionHash: string,
  ): Promise<string> {
    try {
      if (!this.enabled) {
        this.logger.log("ℹ️ Skipping WhatsApp sticker (disabled)");
        return "whatsapp_disabled";
      }
      this.logger.log(`🎉 Sending Stellar success sticker to ${phone}`);

      // Get custom Stellar sticker from assets
      const stellarSticker = await this.assetsService.getStellarSticker();

      // Send Stellar sticker
      const stickerResponse = await this.whatsappClient.post(
        "/chat/send/sticker",
        {
          Phone: phone,
          Sticker: stellarSticker,
        },
      );

      // Get success message
      const successMessage = await this.assetsService.getSuccessMessage();

      // Send follow-up text with transaction details
      await this.sendText(
        phone,
        `${successMessage}\n\n✅ **Hash:** ${transactionHash}\n🔗 **Explorer:** https://stellar.expert/explorer/testnet/tx/${transactionHash}\n\n⏰ **Executado em:** ${new Date().toLocaleString("pt-BR")}\n\n🔐 **Stellar Custody MVP**`,
        { transactionHash, type: "success_notification" },
      );

      this.logger.log(`✅ Stellar success sticker sent to ${phone}`);
      return stickerResponse.data?.id || "unknown";
    } catch (error) {
      this.logger.error(`❌ Failed to send success sticker:`, error.message);
      throw error;
    }
  }

  /**
   * Send Cold Wallet authentication request with TOTP image and approval button
   * For high-value transactions requiring guardian authentication
   */
  async sendColdWalletAuthRequest(
    approval: WhatsAppApprovalButton & {
      isColdWallet: boolean;
      requiresOCRA: boolean;
    },
  ): Promise<string> {
    try {
      this.logger.log(
        `🔐 Sending Cold Wallet auth request to ${approval.guardianRole}: ${approval.guardianPhone}`,
      );

      // Get TOTP instruction message and image
      const totpMessage = await this.assetsService.getTOTPMessage();
      const totpImage = await this.assetsService.getTOTPImage();

      // Build approval URL with challenge
      const approvalUrl = `${approval.approvalUrl}?challenge=${approval.challengeHash}&guardian=${approval.guardianRole}`;

      // Send image with TOTP instructions (if available)
      if (totpImage) {
        await this.whatsappClient.post("/chat/send/image", {
          Phone: approval.guardianPhone,
          Image: totpImage,
          Caption: `🔐 **Autenticação Cold Wallet**\n\n${approval.guardianRole}, uma transação de ${approval.amount} XLM precisa da sua aprovação.\n\n🎯 **Challenge:** ${approval.challengeHash}`,
        });
      }

      // Send approval button with enhanced message for Cold Wallet
      const buttonResponse = await this.whatsappClient.post(
        "/chat/send/buttons",
        {
          phone: approval.guardianPhone,
          title: "🔐 Cold Wallet Authentication",
          body: `🛡️ **HIGH SECURITY TRANSACTION**\n\n💰 **Amount:** ${approval.amount} XLM\n📍 **Destination:** ...${approval.transactionId.slice(-8)}\n🎯 **Challenge:** ${approval.challengeHash}\n${approval.requiresOCRA ? "\n🔢 **OCRA Required**" : ""}\n\n⏰ **Time limit:** 5 minutes\n\n👤 **Guardian:** ${approval.guardianRole}`,
          image: totpImage
            ? undefined
            : {
                url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(approvalUrl)}`,
              },
          buttons: [
            {
              buttonId: "approve_cold_wallet",
              buttonText: { displayText: "🔐 Authenticate Now" },
              type: "cta_url",
              url: approvalUrl,
            },
          ],
          footer: `🔐 Stellar Custody - ${approval.guardianRole}`,
        },
      );

      // Send additional instruction text
      await this.sendText(
        approval.guardianPhone,
        `${totpMessage}\n${approvalUrl}`,
        {
          transactionId: approval.transactionId,
          challengeHash: approval.challengeHash,
          approvalUrl,
          isColdWallet: true,
          guardianRole: approval.guardianRole,
        },
      );

      this.logger.log(
        `✅ Cold Wallet auth request sent to ${approval.guardianRole}`,
      );
      return buttonResponse.data?.id || "unknown";
    } catch (error) {
      this.logger.error(
        `❌ Failed to send Cold Wallet auth request:`,
        error.message,
      );
      throw error;
    }
  }

  // ==================== QR CODE MESSAGES ====================

  /**
   * Send TOTP QR code for guardian setup
   */
  async sendTOTPSetup(
    phone: string,
    qrCodeUrl: string,
    guardianRole: string,
  ): Promise<string> {
    try {
      this.logger.log(`📱 Sending TOTP setup to ${guardianRole}: ${phone}`);
      
      // Send QR code image
      const response = await this.whatsappClient.post("/chat/send/image", {
        Phone: phone,
        Image: qrCodeUrl,
        Caption: `🔐 **TOTP Setup - ${guardianRole}**\n\n📱 **Steps:**\n1. Download Google Authenticator\n2. Scan the QR code above\n3. Enter the 6-digit code\n4. Activate your HSM partition\n\n⚠️ **Important:** Keep this QR code in a secure location!`,
      });

      // Save notification
      await this.saveNotification(
        {
          phone,
          message: `TOTP setup for ${guardianRole}`,
          type: "image",
          metadata: { guardianRole },
        },
        response.data?.id,
      );

      this.logger.log(`✅ TOTP setup sent to ${guardianRole}`);
      return response.data?.id || "unknown";
    } catch (error) {
      this.logger.error(`❌ Failed to send TOTP setup:`, error.message);
      throw error;
    }
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  /**
   * Save notification to database for tracking
   */
  private async saveNotification(
    message: WhatsAppMessage,
    whatsappMessageId?: string,
  ): Promise<void> {
    try {
      // Find user by phone to link notification
      const user = await this.database.user.findFirst({
        where: { phone: message.phone },
      });

      if (user) {
        await this.database.notification.create({
          data: {
            userId: user.id,
            type: this.mapMessageTypeToNotificationType(message.type),
            channel: "WHATSAPP",
            title: "WhatsApp Notification",
            body: message.message,
            whatsappMessageId,
            whatsappStatus: "sent",
            sent: true,
            sentAt: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error("❌ Failed to save notification:", error.message);
      // Don't throw - notification saving shouldn't break the flow
    }
  }

  /**
   * Map message type to notification type
   */
  private mapMessageTypeToNotificationType(
    type: string,
  ):
    | "APPROVAL_REQUEST"
    | "APPROVAL_SUCCESS"
    | "TRANSACTION_SUCCESS"
    | "SECURITY_ALERT" {
    switch (type) {
      case "button":
        return "APPROVAL_REQUEST";
      case "sticker":
        return "TRANSACTION_SUCCESS";
      default:
        return "SECURITY_ALERT";
    }
  }

  // ==================== BROADCAST MESSAGES ====================

  /**
   * Send notification to all guardians
   */
  async notifyAllGuardians(message: string, metadata?: any): Promise<string[]> {
    try {
      this.logger.log(
        `📢 Broadcasting to all guardians: ${message.substring(0, 50)}...`,
      );

      const guardians = await this.database.guardian.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              phone: true,
              name: true,
            },
          },
        },
      });

      const messageIds = await Promise.all(
        guardians.map((guardian) =>
          this.sendText(
            guardian.user.phone,
            `👤 **${guardian.role}**\n\n${message}`,
            metadata,
          ),
        ),
      );

      this.logger.log(`✅ Broadcast sent to ${guardians.length} guardians`);
      return messageIds;
    } catch (error) {
      this.logger.error("❌ Broadcast failed:", error.message);
      throw error;
    }
  }

  /**
   * Send emergency alert to all guardians
   */
  async sendEmergencyAlert(
    message: string,
    severity: "LOW" | "HIGH" | "CRITICAL",
  ): Promise<void> {
    try {
      const alertMessage = `🚨 **ALERTA ${severity}**\n\n${message}\n\n⏰ ${new Date().toLocaleString("pt-BR")}\n🔐 Stellar Custody MVP`;

      await this.notifyAllGuardians(alertMessage, {
        type: "emergency",
        severity,
      });

      // Log security event
      await this.auditService.logSecurityEvent(
        "emergency_alert_sent",
        severity,
        "system",
        { message, guardianCount: 3 },
      );
    } catch (error) {
      this.logger.error("❌ Emergency alert failed:", error.message);
      throw error;
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Get WhatsApp service health
   */
  async getHealth(): Promise<{ status: string; latency: number }> {
    const startTime = Date.now();

    try {
      // Test API connectivity
      await this.whatsappClient.get("/health", { timeout: 5000 });

      return {
        status: "healthy",
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Get message delivery statistics
   */
  async getMessageStats() {
    try {
      const [sent, delivered, failed] = await Promise.all([
        this.database.notification.count({
          where: {
            channel: "WHATSAPP",
            sent: true,
          },
        }),
        this.database.notification.count({
          where: {
            channel: "WHATSAPP",
            whatsappStatus: "delivered",
          },
        }),
        this.database.notification.count({
          where: {
            channel: "WHATSAPP",
            whatsappStatus: "failed",
          },
        }),
      ]);

      return {
        sent,
        delivered,
        failed,
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      };
    } catch (error) {
      this.logger.error("❌ Failed to get message stats:", error.message);
      throw error;
    }
  }
}
