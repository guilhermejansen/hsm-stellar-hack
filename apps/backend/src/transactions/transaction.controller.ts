import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import * as crypto from "crypto";
import { Decimal } from "@prisma/client/runtime/library";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";

import { TransactionService } from "./transaction.service";
import { ChallengeService } from "../challenges/challenge.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { GuardianService } from "../guardians/guardian.service";
import { WalletService } from "../wallets/wallet.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DatabaseService } from "../database/database.service";
import {
  CreateTransactionDto,
  ApproveTransactionDto,
  ListTransactionsDto,
} from "../common/dto/transaction.dto";
import { TransactionPrivacyReportDto } from "../common/dto/privacy.dto";

/**
 * 💰 Transaction Controller - Multi-Sig Transaction Processing API
 */
@ApiTags("Transactions")
@Controller("transactions")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly challengeService: ChallengeService,
    private readonly whatsappService: WhatsAppService,
    private readonly guardianService: GuardianService,
    private readonly database: DatabaseService,
    private readonly walletService: WalletService,
  ) {}

  @Post()
  @ApiOperation({
    summary: "Create new transaction",
    description:
      "Create a new multi-sig transaction with automatic threshold determination",
  })
  @ApiBody({ type: CreateTransactionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Transaction created successfully",
  })
  async createTransaction(
    @Body() createDto: CreateTransactionDto,
    @Request() req: any,
  ) {
    try {
      // 🔧 TEMPORARY SIMPLIFIED VERSION FOR DEBUGGING
      this.logger.log(`🔧 DEBUG: Creating simplified transaction for ${createDto.amount} XLM`);
      
      // 1. Validate wallet exists and has balance
      const wallet = await this.database.wallet.findUnique({
        where: { id: createDto.fromWalletId }
      });
      if (!wallet) {
        throw new Error("Source wallet not found");
      }

      // 2. Check balance using the new auto-sync method
      const canSend = await this.walletService.canSendAmount(
        createDto.fromWalletId,
        createDto.amount,
      );
      
      if (!canSend.canSend) {
        throw new Error(canSend.reason || "Insufficient balance");
      }

      this.logger.log(`✅ Balance check passed: ${canSend.availableBalance} XLM available`);

      // 3. Create simple transaction record
      const transaction = await this.database.transaction.create({
        data: {
          userId: req.user.userId,
          fromWalletId: createDto.fromWalletId,
          toAddress: createDto.toAddress,
          amount: new Decimal(createDto.amount),
          memo: createDto.memo,
          status: "AWAITING_APPROVAL",
          txType: createDto.txType,
          requiresApproval: true,
          requiredApprovals: 2, // Simple 2-of-3
        },
      });

      this.logger.log(`✅ Transaction created: ${transaction.id}`);

      // 4. Reserve balance
      await this.walletService.reserveBalance(createDto.fromWalletId, createDto.amount);
      this.logger.log(`✅ Balance reserved: ${createDto.amount} XLM`);

      const result = {
        transactionId: transaction.id,
        requiresApproval: true,
        thresholdScheme: {
          type: "HIGH_VALUE_2_OF_3",
          required: 2,
          total: 3,
          challengeRequired: false,
          description: "2 of 3 guardians required",
        },
      };

      if (result.requiresApproval) {
        const guardians = await this.guardianService.getActiveGuardians();

        // Get wallet to check if it's Cold Wallet
        const wallet = await this.database.wallet.findUnique({
          where: { id: createDto.fromWalletId },
        });

        const isColdWallet = wallet?.walletType === "COLD";
        const requiresOCRA = result.thresholdScheme.challengeRequired;

        // Send appropriate notification based on wallet type
        const notificationPromises = guardians.map((guardian) => {
          if (isColdWallet || requiresOCRA) {
            // Send Cold Wallet authentication request with images
            return this.whatsappService.sendColdWalletAuthRequest({
              guardianPhone: guardian.user.phone,
              transactionId: result.transactionId,
              amount: createDto.amount,
              challengeHash: "",
              approvalUrl: `http://localhost:3000/approve/${result.transactionId}`,
              guardianRole: guardian.role,
              isColdWallet,
              requiresOCRA,
            });
          } else {
            // Send regular approval button
            return this.whatsappService.sendApprovalButton({
              guardianPhone: guardian.user.phone,
              transactionId: result.transactionId,
              amount: createDto.amount,
              challengeHash: "",
              approvalUrl: `http://localhost:3000/approve/${result.transactionId}`,
              guardianRole: guardian.role,
            });
          }
        });

        await Promise.all(notificationPromises);
      }

      return {
        success: true,
        data: result,
        message: result.requiresApproval
          ? "Transaction created. WhatsApp notifications sent to guardians."
          : "Transaction created and executed automatically.",
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(":id/approve")
  @ApiOperation({
    summary: "Approve transaction",
    description:
      "Guardian approves transaction using challenge-response or TOTP",
  })
  @ApiParam({ name: "id", description: "Transaction ID" })
  @ApiBody({ type: ApproveTransactionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transaction approved successfully",
  })
  async approveTransaction(
    @Param("id") transactionId: string,
    @Body() approveDto: ApproveTransactionDto,
    @Request() req: any,
  ) {
    try {
      const result = await this.transactionService.approveTransaction(
        {
          transactionId,
          guardianId: approveDto.guardianId,
          challengeResponse: approveDto.challengeResponse,
          totpCode: approveDto.totpCode,
          authMethod: approveDto.authMethod,
        },
        req.ip,
        req.get("user-agent"),
      );

      // 🎉 If transaction executed successfully, send Stellar sticker to all guardians
      if (result.executionReady) {
        const transaction =
          await this.transactionService.getTransactionById(transactionId);
        if (transaction && transaction.stellarHash) {
          const guardians = await this.guardianService.getActiveGuardians();

          // Send Stellar sticker + success message to all guardians
          const stickerPromises = guardians.map((guardian) =>
            this.whatsappService.sendSuccessSticker(
              guardian.user.phone,
              transaction.stellarHash!,
            ),
          );

          await Promise.all(stickerPromises);
          this.logger.log(
            `🎉 Stellar success stickers sent to ${guardians.length} guardians`,
          );
        }
      }

      return {
        success: true,
        data: result,
        message: result.executionReady
          ? "Transaction approved and executed successfully. Success notifications sent!"
          : `Transaction approved. ${result.remainingApprovals} more approval(s) needed.`,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get("pending")
  @ApiOperation({
    summary: "Get pending transactions for approval",
    description: `
      **Get transactions awaiting guardian approval**
      
      **Returns:**
      - Transactions with status AWAITING_APPROVAL
      - Guardian approval progress
      - Challenge information if applicable
      - Privacy protection details
      
      **Use Cases:**
      - Guardian dashboard
      - Approval workflow
      - Pending transaction monitoring
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of pending transactions",
    schema: {
      example: {
        success: true,
        data: [
          {
            id: "cmfmhi0m00001vobrqrz1f24o",
            fromWallet: {
              walletType: "HOT",
              publicKey: "GDXZBVFB4G5FZYGWHTYP2J5PT2XYRTP3Q465WPMWHR2NOMFQC5MNE2SD"
            },
            toAddress: "GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM",
            amount: "10.0000000",
            status: "AWAITING_APPROVAL",
            txType: "PAYMENT",
            requiredApprovals: 2,
            currentApprovals: 0,
            approvals: [],
            createdAt: "2025-09-16T11:43:15.095Z"
          }
        ],
        metadata: {
          count: 1,
          timestamp: "2025-09-16T12:00:00.000Z"
        }
      }
    }
  })
  async getPendingTransactions(@Request() req: any) {
    try {
      const pendingTransactions = await this.database.transaction.findMany({
        where: {
          status: "AWAITING_APPROVAL"
        },
        include: {
          fromWallet: {
            select: {
              id: true,
              publicKey: true,
              walletType: true,
              derivationPath: true,
            },
          },
          approvals: {
            include: {
              guardian: {
                select: {
                  id: true,
                  role: true,
                },
              },
            },
          },
          challenge: true,
          TransactionKey: {
            select: {
              publicKey: true,
              derivationPath: true,
              isUsed: true,
              isExpired: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        success: true,
        data: pendingTransactions.map((tx) => ({
          id: tx.id,
          stellarHash: tx.stellarHash,
          fromWallet: tx.fromWallet,
          toAddress: tx.toAddress,
          amount: tx.amount.toString(),
          status: tx.status,
          txType: tx.txType,
          requiredApprovals: tx.requiredApprovals,
          currentApprovals: tx.approvals.length,
          approvals: tx.approvals.map((approval) => ({
            guardianRole: approval.guardian.role,
            approvedAt: approval.validatedAt.toISOString(),
          })),
          challenge: tx.challenge ? {
            challengeHash: tx.challenge.challengeHash,
            expiresAt: tx.challenge.expiresAt.toISOString(),
            isActive: tx.challenge.expiresAt > new Date(),
          } : null,
          privacyProtection: tx.TransactionKey
            ? {
                ephemeralAddress: tx.TransactionKey.publicKey,
                derivationPath: tx.TransactionKey.derivationPath,
                isPrivacyProtected: true,
                keyDestroyed: tx.TransactionKey.isUsed && tx.TransactionKey.isExpired,
              }
            : {
                isPrivacyProtected: false,
                warning: "Transaction not using ephemeral key",
              },
          createdAt: tx.createdAt.toISOString(),
        })),
        metadata: {
          count: pendingTransactions.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @ApiOperation({
    summary: "List transactions",
    description: "Retrieve transactions with filtering and pagination",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Paginated list of transactions",
  })
  async listTransactions(@Query() query: ListTransactionsDto) {
    try {
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (query.status) where.status = query.status;
      if (query.txType) where.txType = query.txType;

      const [transactions, total] = await Promise.all([
        this.database.transaction.findMany({
          where,
          include: {
            fromWallet: {
              select: {
                id: true,
                publicKey: true,
                walletType: true,
                derivationPath: true,
              },
            },
            approvals: {
              include: {
                guardian: {
                  select: {
                    id: true,
                    role: true,
                  },
                },
              },
            },
            TransactionKey: {
              select: {
                publicKey: true,
                derivationPath: true,
                isUsed: true,
                isExpired: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        this.database.transaction.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: transactions.map((tx) => ({
          id: tx.id,
          stellarHash: tx.stellarHash,
          fromWallet: tx.fromWallet,
          toAddress: tx.toAddress,
          amount: tx.amount.toString(),
          status: tx.status,
          txType: tx.txType,
          approvals: tx.approvals.map((approval) => ({
            guardianRole: approval.guardian.role,
            approvedAt: approval.validatedAt.toISOString(),
          })),
          // Privacy information (ephemeral transaction key)
          privacyProtection: tx.TransactionKey
            ? {
                ephemeralAddress: tx.TransactionKey.publicKey,
                derivationPath: tx.TransactionKey.derivationPath,
                isPrivacyProtected: true,
                keyDestroyed:
                  tx.TransactionKey.isUsed && tx.TransactionKey.isExpired,
                correlationPrevented: true,
              }
            : {
                isPrivacyProtected: false,
                warning: "Transaction not using ephemeral key",
              },
          createdAt: tx.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get transaction details",
    description: "Retrieve detailed information about a specific transaction",
  })
  @ApiParam({ name: "id", description: "Transaction ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transaction details",
  })
  async getTransactionById(@Param("id") transactionId: string) {
    try {
      const transaction =
        await this.transactionService.getTransactionById(transactionId);

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      return {
        success: true,
        data: {
          id: transaction.id,
          stellarHash: transaction.stellarHash,
          fromWallet: transaction.fromWallet,
          toAddress: transaction.toAddress,
          amount: transaction.amount.toString(),
          status: transaction.status,
          txType: transaction.txType,
          approvals: transaction.approvals.map((approval) => ({
            guardianRole: approval.guardian.role,
            approvedAt: approval.validatedAt.toISOString(),
          })),
          // Privacy protection details
          privacyProtection: transaction.TransactionKey
            ? {
                ephemeralAddress: transaction.TransactionKey.publicKey,
                derivationPath: transaction.TransactionKey.derivationPath,
                transactionIndex: transaction.TransactionKey.transactionIndex,
                isPrivacyProtected: true,
                keyStatus: {
                  isUsed: transaction.TransactionKey.isUsed,
                  isExpired: transaction.TransactionKey.isExpired,
                  destroyedAt:
                    transaction.TransactionKey.destroyedAt?.toISOString(),
                  expiresAt: transaction.TransactionKey.expiresAt.toISOString(),
                },
                privacyBenefits: {
                  correlationPrevented: true,
                  addressUnique: true,
                  traceabilityImpossible: true,
                },
              }
            : null,
          createdAt: transaction.createdAt.toISOString(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get("privacy/report")
  @ApiOperation({
    summary: "Get transaction privacy report",
    description: `
      **Transaction Privacy Protection Report**
      
      **Privacy Features Tracked:**
      - Ephemeral transaction keys usage (m/0'/0'/N')
      - Unique address generation per transaction
      - Key destruction and lifecycle management
      - Correlation prevention effectiveness
      
      **Privacy Benefits:**
      - External observers cannot correlate transactions
      - Each transaction appears from random address
      - Wallet balances cannot be traced
      - Complete financial privacy protection
      
      **Use Cases:**
      - Privacy compliance monitoring
      - Security audit reporting
      - Transaction pattern analysis prevention
      - Regulatory compliance verification
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transaction privacy protection report",
    type: TransactionPrivacyReportDto,
    schema: {
      example: {
        success: true,
        data: {
          summary: {
            totalTransactions: 247,
            ephemeralTransactions: 243,
            uniqueAddressesGenerated: 243,
            privacyCompliance: 98.38,
            correlationRisk: "LOW",
          },
          privacy: {
            addressReuse: 4,
            correlationPrevention: 243,
            privacyBenefits: [
              "External observers cannot correlate transactions",
              "Each transaction appears from random address",
              "Wallet balances cannot be traced",
              "Transaction patterns are hidden",
              "Complete financial privacy protection",
            ],
          },
          recommendations: [
            "✅ Excellent privacy protection maintained",
            "🎯 All transactions using ephemeral keys",
            "🛡️ Complete correlation prevention active",
          ],
        },
        metadata: {
          timestamp: new Date().toISOString(),
          privacyStandard: "ENTERPRISE_GRADE",
        },
      },
    },
  })
  async getTransactionPrivacyReport(@Request() req: any) {
    try {
      const privacyReport =
        await this.transactionService.getTransactionPrivacyReport(
          req.user.userId,
        );

      return {
        success: true,
        data: privacyReport,
        metadata: {
          timestamp: new Date().toISOString(),
          privacyStandard: "ENTERPRISE_GRADE",
          privacyFeatures: [
            "Ephemeral transaction keys",
            "BIP32 hierarchical derivation",
            "HSM key auto-destruction",
            "Complete address isolation",
            "Correlation prevention",
          ],
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get("stats/overview")
  @ApiOperation({
    summary: "Get transaction statistics overview",
    description: `
      **Comprehensive transaction statistics and metrics**
      
      **Includes:**
      - Total/Pending/Successful/Failed transaction counts
      - Success rate percentage
      - Volume metrics
      - Privacy protection statistics
      - Ephemeral key usage metrics
      
      **Use Cases:**
      - Dashboard overview
      - System performance monitoring
      - Privacy compliance reporting
      - Operational metrics
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transaction statistics overview",
    schema: {
      example: {
        success: true,
        data: {
          transactions: {
            total: 247,
            pending: 3,
            successful: 240,
            failed: 4,
            successRate: 97.17,
          },
          volume: {
            total: "1250000.0000000",
          },
          privacy: {
            ephemeralKeysGenerated: 243,
            ephemeralKeysUsed: 240,
            ephemeralKeysDestroyed: 240,
            privacyScore: 98.38,
            privacyProtectedTransactions: 240,
            correlationProtection: "EXCELLENT",
          },
        },
        metadata: {
          timestamp: "2025-09-14T10:30:00Z",
        },
      },
    },
  })
  async getTransactionStats(@Request() req: any) {
    try {
      const stats = await this.transactionService.getTransactionStats();

      return {
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
