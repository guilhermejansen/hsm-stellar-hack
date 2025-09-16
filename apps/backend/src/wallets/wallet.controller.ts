import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  Query,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";

import { WalletService } from "./wallet.service";
import { StellarService } from "../stellar/stellar.service";
import { TransactionKeyService } from "./transaction-key.service";
import { HSMService } from "../hsm/hsm.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TOTPAuthGuard } from "../auth/totp-auth.guard";
import { AuditService } from "../common/audit.service";
import {
  WalletResponseDto,
  RebalanceWalletsDto,
  RebalanceResultDto,
  WalletBalanceResponseDto,
} from "../common/dto/wallet.dto";

/**
 * 💰 Wallet Controller - BIP32 HD Wallet Management API
 *
 * Following FINAL_ARCHITECTURE_SUMMARY.mdc wallet hierarchy:
 * - Cold Wallet (Master): m/0' - 95% of funds
 * - Hot Wallet (Derived): m/0'/0' - 5% of funds
 *
 * Features:
 * - Wallet balance queries
 * - Hierarchical wallet information
 * - Automatic rebalancing (95%/5% ratio)
 * - HSM protection status
 * - Stellar network integration
 */
@ApiTags("Wallets")
@Controller("wallets")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly stellarService: StellarService,
    private readonly txKeyService: TransactionKeyService,
    private readonly hsmService: HSMService,
    private readonly auditService: AuditService,
  ) {}

  // ==================== WALLET QUERIES ====================

  @Get("hot")
  @ApiOperation({
    summary: "Get Hot wallet information",
    description: `
      **Retrieve Hot wallet details and balance**
      
      **Hot Wallet Characteristics:**
      - Derivation Path: m/0'/0' (derived from Cold wallet)
      - Target Balance: 5% of total funds
      - Usage: Operational transactions < 1,000 XLM
      - TOTP Required: No (for operational efficiency)
      - HSM Protected: Yes (all keys in HSM)
      
      **Information Includes:**
      - Current balance and reserved amounts
      - Parent wallet (Cold) relationship
      - HSM partition and key information
      - Transaction capability status
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Hot wallet information",
    type: WalletResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          id: "clrx1234567890wallet2",
          publicKey: "GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM",
          derivationPath: "m/0'/0'",
          walletType: "HOT",
          balance: "5000.0000000",
          reservedBalance: "100.0000000",
          maxBalance: "5000.0000000",
          hsmKeyName: "stellar_custody_hot_m_0_0",
          hsmPartitionId: "user_abc123def456",
          isHSMProtected: true,
          requiresTOTP: false,
          parentWallet: {
            id: "clrx1234567890wallet1",
            publicKey:
              "GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI",
            walletType: "COLD",
          },
          childWallets: [],
          percentage: 5.0,
          createdAt: "2025-09-01T09:00:00Z",
        },
      },
    },
  })
  async getHotWallet(@Request() req: any) {
    try {
      const hotWallet = await this.walletService.getHotWallet(req.user.userId);

      // Get Stellar network balance (with automatic account creation on testnet)
      let stellarBalance = "0";
      try {
        const accountInfo = await this.stellarService.getAccountInfo(
          hotWallet.publicKey,
        );
        stellarBalance = accountInfo.balances[0]?.balance || "0";
      } catch (error) {
        this.logger.warn(`⚠️ Could not fetch Stellar balance for ${hotWallet.publicKey}: ${error.message}`);
        stellarBalance = "0";
      }

      return {
        success: true,
        data: {
          id: hotWallet.id,
          publicKey: hotWallet.publicKey,
          derivationPath: hotWallet.derivationPath,
          walletType: hotWallet.walletType,
          balance: hotWallet.balance.toString(),
          reservedBalance: hotWallet.reservedBalance.toString(),
          maxBalance: hotWallet.maxBalance?.toString(),
          hsmKeyName: hotWallet.hsmKeyName,
          hsmPartitionId: hotWallet.hsmPartitionId,
          isHSMProtected: hotWallet.isHSMProtected,
          requiresTOTP: hotWallet.requiresTOTP,
          parentWallet: hotWallet.parentWallet
            ? {
                id: hotWallet.parentWallet.id,
                publicKey: hotWallet.parentWallet.publicKey,
                walletType: hotWallet.parentWallet.walletType,
              }
            : undefined,
          childWallets: [],
          stellarBalance: stellarBalance,
          createdAt: hotWallet.createdAt.toISOString(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get("cold")
  @ApiOperation({
    summary: "Get Cold wallet information",
    description: `
      **Retrieve Cold wallet details and balance**
      
      **Cold Wallet Characteristics:**
      - Derivation Path: m/0' (master wallet)
      - Target Balance: 95% of total funds
      - Usage: Secure storage, high-value transactions
      - TOTP Required: Yes (always requires guardian approval)
      - HSM Protected: Yes (maximum security)
      
      **Security Features:**
      - All transactions require guardian approval
      - High-value transactions require 3-of-3 approval
      - OCRA-like challenges mandatory for access
      - Complete audit trail for compliance
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Cold wallet information",
    type: WalletResponseDto,
  })
  async getColdWallet(@Request() req: any) {
    try {
      const coldWallet = await this.walletService.getColdWallet(
        req.user.userId,
      );

      // Get Stellar network balance (with automatic account creation on testnet)
      let stellarBalance = "0";
      try {
        const accountInfo = await this.stellarService.getAccountInfo(
          coldWallet.publicKey,
        );
        stellarBalance = accountInfo.balances[0]?.balance || "0";
      } catch (error) {
        this.logger.warn(`⚠️ Could not fetch Stellar balance for ${coldWallet.publicKey}: ${error.message}`);
        stellarBalance = "0";
      }

      return {
        success: true,
        data: {
          id: coldWallet.id,
          publicKey: coldWallet.publicKey,
          derivationPath: coldWallet.derivationPath,
          walletType: coldWallet.walletType,
          balance: coldWallet.balance.toString(),
          reservedBalance: coldWallet.reservedBalance.toString(),
          maxBalance: coldWallet.maxBalance?.toString(),
          hsmKeyName: coldWallet.hsmKeyName,
          hsmPartitionId: coldWallet.hsmPartitionId,
          isHSMProtected: coldWallet.isHSMProtected,
          requiresTOTP: coldWallet.requiresTOTP,
          parentWallet: undefined, // Cold is the master
          childWallets: coldWallet.childWallets.map((child) => ({
            id: child.id,
            publicKey: child.publicKey,
            walletType: child.walletType,
          })),
          stellarBalance: stellarBalance,
          createdAt: coldWallet.createdAt.toISOString(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get("balances")
  @ApiOperation({
    summary: "Get complete wallet balance overview",
    description: `
      **Complete wallet hierarchy balance information**
      
      **Provides:**
      - Total balance across all wallets
      - Cold wallet balance (95% target)
      - Hot wallet balance (5% target)
      - Current percentage distribution
      - Rebalancing recommendations
      - Stellar network synchronization status
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Wallet balance overview",
    schema: {
      example: {
        success: true,
        data: {
          total: "100000.0000000",
          cold: {
            balance: "95000.0000000",
            percentage: 95.0,
            address: "GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI",
            derivationPath: "m/0'",
          },
          hot: {
            balance: "5000.0000000",
            percentage: 5.0,
            address: "GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM",
            derivationPath: "m/0'/0'",
            parentAddress:
              "GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI",
          },
          needsRebalancing: false,
          rebalanceThreshold: 2.0,
        },
      },
    },
  })
  async getWalletBalances(@Request() req: any) {
    try {
      this.logger.log(`🔍 Getting wallet balances for user: ${req.user.userId}`);
      
      const balances = await this.walletService.getWalletBalances(
        req.user.userId,
      );

      this.logger.log(`✅ Wallet balances retrieved successfully for user: ${req.user.userId}`);
      
      return {
        success: true,
        data: balances,
        metadata: {
          userId: req.user.userId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get wallet balances for user ${req.user.userId}:`, error.message);
      this.logger.error('Error stack:', error.stack);
      
      return {
        success: false,
        error: 'Failed to retrieve wallet balances',
        message: error.message,
        userId: req.user.userId,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ==================== EPHEMERAL PREVIEW ====================

  @Get("ephemeral/preview")
  @ApiOperation({
    summary: "Preview next ephemeral transaction address",
    description:
      "Return next deterministic ephemeral address (m/0'/0'/N') for a HOT wallet.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Next ephemeral address preview",
  })
  async previewEphemeral(
    @Request() req: any,
    @Query("walletId") walletId?: string,
  ) {
    try {
      const wallet = walletId
        ? await this.walletService.getWalletById(walletId)
        : await this.walletService.getHotWallet(req.user.userId);

      if (!wallet) throw new Error("Wallet not found");
      if (wallet.walletType !== "HOT")
        throw new Error("Ephemeral keys derive from HOT wallet only");

      const nextIndex = await this.txKeyService.getNextTransactionIndex(
        wallet.id,
      );
      const derivationPath = `m/0'/0'/${nextIndex}'`;

      const preview = await this.hsmService.previewEphemeralPublicKey({
        parentKeyId: wallet.hsmKeyName,
        derivationPath,
        partition: wallet.hsmPartitionId,
      });

      const fundUrl = `https://friendbot.stellar.org?addr=${encodeURIComponent(
        preview.publicKey,
      )}`;

      return {
        success: true,
        data: {
          walletId: wallet.id,
          publicKey: preview.publicKey,
          derivationPath,
          transactionIndex: nextIndex,
          fundWithFriendbot: fundUrl,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== WALLET REBALANCING ====================

  @Post("rebalance")
  @ApiOperation({
    summary: "Rebalance wallets to 95%/5% ratio",
    description: `
      **Rebalance Cold/Hot wallet distribution**
      
      **Target Distribution:**
      - Cold Wallet: 95% of total funds
      - Hot Wallet: 5% of total funds
      
      **Rebalancing Triggers:**
      - Hot wallet > 7% of total (move excess to Cold)
      - Hot wallet < 3% of total (move funds from Cold)
      - Manual rebalancing request by guardian
      
      **Security Requirements:**
      - Guardian TOTP verification required
      - Transaction created for fund movement
      - HSM signature for all transfers
      - Complete audit trail maintained
      
      **Process:**
      1. Calculate current distribution
      2. Determine rebalancing direction and amount
      3. Create internal transfer transaction
      4. Execute with HSM signature
      5. Update wallet balances
    `,
  })
  @ApiBody({
    type: RebalanceWalletsDto,
    description: "Guardian authorization for rebalancing",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Rebalancing completed successfully",
    type: RebalanceResultDto,
  })
  @UseGuards(TOTPAuthGuard)
  @ApiSecurity("TOTP")
  async rebalanceWallets(
    @Body() rebalanceDto: RebalanceWalletsDto,
    @Request() req: any,
  ) {
    try {
      const result = await this.walletService.rebalanceWallets(
        req.user.userId,
        rebalanceDto.guardianId,
      );

      return {
        success: true,
        data: result,
        message: result.success
          ? `Rebalancing completed: ${result.amountMoved} XLM moved ${result.direction.replace("_", " to ")}`
          : "No rebalancing needed - wallets already in optimal ratio",
      };
    } catch (error) {
      throw error;
    }
  }
}
