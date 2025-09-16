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
      const result = await this.transactionService.createTransaction(
        req.user.userId,
        createDto,
      );

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
              challengeHash: result.challenge?.challengeHash || "",
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
              challengeHash: result.challenge?.challengeHash || "",
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
}
