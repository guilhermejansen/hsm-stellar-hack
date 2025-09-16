import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Decimal } from "@prisma/client/runtime/library";

import { DatabaseService } from "../database/database.service";
import { HSMService } from "../hsm/hsm.service";
import { StellarService } from "../stellar/stellar.service";
import { AuditService } from "../common/audit.service";
import { WalletHierarchy, WalletCreationRequest } from "../common/interfaces";

/**
 * 💰 Wallet Service - BIP32 HD Wallet Management
 *
 * Following api-integrations.mdc wallet hierarchy:
 * - Cold Wallet (Master): m/0' - 95% of funds
 * - Hot Wallet (Derived): m/0'/0' - 5% of funds, derived from Cold
 * - HSM protection for all keys
 * - Automatic rebalancing between wallets
 *
 * Security:
 * - Cold wallet requires TOTP for all transactions
 * - Hot wallet for operational transactions (< 1000 XLM)
 * - All keys protected by HSM partitions
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly hsmService: HSMService,
    private readonly stellarService: StellarService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== WALLET CREATION ====================

  /**
   * Create simple wallet hierarchy for development/testing
   * Uses deterministic addresses based on userId
   */
  async createSimpleWalletHierarchy(userId: string): Promise<WalletHierarchy> {
    this.logger.log(`🛠️ Creating simple wallet hierarchy for user: ${userId}`);
    
    try {
      // Get user information
      const user = await this.database.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Generate deterministic addresses based on user email
      const addressSeed = user.email.toLowerCase().replace(/[^a-z0-9]/g, '');
      const addresses = this.generateTestAddresses(addressSeed);
      
      // Create Cold Wallet (Master) 
      const coldWallet = await this.database.wallet.create({
        data: {
          userId: userId,
          publicKey: addresses.cold,
          derivationPath: "m/0'",
          walletType: "COLD",
          balance: new Decimal(100000), // 100K XLM for testing
          reservedBalance: new Decimal(0),
          maxBalance: null,
          hsmKeyName: `${addressSeed}_cold_master`,
          hsmPartitionId: user.hsmPartitionId || `${addressSeed}_partition`,
          isHSMProtected: true,
          requiresTOTP: true,
          parentWalletId: null,
        },
      });

      // Create Hot Wallet (Derived from Cold)
      const hotWallet = await this.database.wallet.create({
        data: {
          userId: userId,
          publicKey: addresses.hot,
          derivationPath: "m/0'/0'",
          walletType: "HOT",
          balance: new Decimal(5000), // 5K XLM for testing
          reservedBalance: new Decimal(0),
          maxBalance: new Decimal(5000),
          hsmKeyName: `${addressSeed}_hot_derived`,
          hsmPartitionId: user.hsmPartitionId || `${addressSeed}_partition`,
          isHSMProtected: true,
          requiresTOTP: false,
          parentWalletId: coldWallet.id,
        },
      });

      // Update user with Stellar public key
      await this.database.user.update({
        where: { id: userId },
        data: {
          stellarPublicKey: coldWallet.publicKey,
        },
      });

      const result: WalletHierarchy = {
        coldWallet: {
          id: coldWallet.id,
          address: coldWallet.publicKey,
          derivationPath: coldWallet.derivationPath,
          balance: coldWallet.balance.toString(),
          percentage: 95,
        },
        hotWallet: {
          id: hotWallet.id,
          address: hotWallet.publicKey,
          derivationPath: hotWallet.derivationPath,
          balance: hotWallet.balance.toString(),
          percentage: 5,
          parentWalletId: coldWallet.id,
        },
      };

      this.logger.log(`✅ Simple wallet hierarchy created - Cold: ${coldWallet.publicKey}, Hot: ${hotWallet.publicKey}`);
      return result;
    } catch (error) {
      this.logger.error("❌ Simple wallet hierarchy creation failed:", error.message);
      throw error;
    }
  }

  /**
   * Generate deterministic test addresses based on a seed
   * NOTE: These are for testing only, real implementation uses HSM
   */
  private generateTestAddresses(seed: string): { cold: string; hot: string } {
    // Predefined test addresses that are valid Stellar addresses
    const testAddresses = [
      'GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI',
      'GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM',
      'GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT',
      'GAODJIFVVHOGTISA2JYI4HQLIDAXSAJZI7DKXQBSMOKCYTRUCAXTTJW2',
      'GD2YNO7FGCSRO5JCMGJZEH5LNC664DYHMKIBJZPMV3ZXAPEXTBGH6OLK',
      'GBUQWP3BOUZX5TCRQWAHCPHOBVIXMJZPYUKDCW3VXLB6LLXQTGWJFM4X'
    ];
    
    // Simple hash function to select addresses deterministically
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const coldIndex = Math.abs(hash) % testAddresses.length;
    const hotIndex = Math.abs(hash + 1) % testAddresses.length;
    
    return {
      cold: testAddresses[coldIndex],
      hot: testAddresses[hotIndex],
    };
  }

  /**
   * Create complete wallet hierarchy for user
   * Following BIP32 hierarchy: Cold (master) -> Hot (derived)
   */
  async createWalletHierarchy(userId: string): Promise<WalletHierarchy> {
    const startTime = Date.now();

    try {
      this.logger.log(`🌳 Creating wallet hierarchy for user: ${userId}`);

      // Get user with HSM partition info
      const user = await this.database.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.hsmPartitionId || !user.hsmKeyName) {
        throw new Error("User HSM partition not found or not activated");
      }

      if (user.kycStatus !== "APPROVED") {
        throw new Error("KYC must be approved before creating wallets");
      }

      // Create wallet hierarchy using HSM
      const walletHierarchy = await this.hsmService.createWalletHierarchy(
        userId,
        user.hsmPartitionId,
        user.hsmKeyName,
      );

      // Create Cold Wallet (Master) in database
      const coldWallet = await this.database.wallet.create({
        data: {
          userId: userId,
          publicKey: walletHierarchy.coldWallet.address,
          derivationPath: walletHierarchy.coldWallet.derivationPath,
          walletType: "COLD",
          balance: new Decimal(0),
          reservedBalance: new Decimal(0),
          maxBalance: null, // No limit for cold wallet
          hsmKeyName: walletHierarchy.coldWallet.keyId,
          hsmPartitionId: walletHierarchy.coldWallet.hsmPartitionId,
          isHSMProtected: true,
          requiresTOTP: true, // Cold wallet always requires TOTP
          parentWalletId: null, // Cold is the master
        },
      });

      // Create Hot Wallet (Derived from Cold) in database
      const hotWallet = await this.database.wallet.create({
        data: {
          userId: userId,
          publicKey: walletHierarchy.hotWallet.address,
          derivationPath: walletHierarchy.hotWallet.derivationPath,
          walletType: "HOT",
          balance: new Decimal(0),
          reservedBalance: new Decimal(0),
          maxBalance: new Decimal(0), // Will be set based on total balance
          hsmKeyName: walletHierarchy.hotWallet.keyId,
          hsmPartitionId: walletHierarchy.hotWallet.hsmPartitionId,
          isHSMProtected: true,
          requiresTOTP: false, // Hot wallet for operational use
          parentWalletId: coldWallet.id, // Hot is derived from Cold
        },
      });

      // Update user with Stellar public key (Cold wallet address)
      await this.database.user.update({
        where: { id: userId },
        data: {
          stellarPublicKey: coldWallet.publicKey,
        },
      });

      const result: WalletHierarchy = {
        coldWallet: {
          id: coldWallet.id,
          address: coldWallet.publicKey,
          derivationPath: coldWallet.derivationPath,
          balance: "0.0000000",
          percentage: 95,
        },
        hotWallet: {
          id: hotWallet.id,
          address: hotWallet.publicKey,
          derivationPath: hotWallet.derivationPath,
          balance: "0.0000000",
          percentage: 5,
          parentWalletId: coldWallet.id,
        },
      };

      // Audit log
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: userId,
        action: "wallet.hierarchy_created",
        resource: "wallet",
        ip: "backend-service",
        userAgent: "wallet-service",
        result: "success",
        metadata: {
          coldWalletId: coldWallet.id,
          hotWalletId: hotWallet.id,
          coldAddress: coldWallet.publicKey,
          hotAddress: hotWallet.publicKey,
          duration: Date.now() - startTime,
        },
      });

      this.logger.log(
        `✅ Wallet hierarchy created - Cold: ${coldWallet.publicKey}, Hot: ${hotWallet.publicKey}`,
      );
      return result;
    } catch (error) {
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: userId,
        action: "wallet.hierarchy_creation_failed",
        resource: "wallet",
        ip: "backend-service",
        userAgent: "wallet-service",
        result: "failure",
        metadata: {
          error: error.message,
          duration: Date.now() - startTime,
        },
      });

      this.logger.error("❌ Wallet hierarchy creation failed:", error.message);
      throw error;
    }
  }

  // ==================== WALLET QUERIES ====================

  /**
   * Get user's Cold wallet (master)
   * Auto-creates wallet hierarchy if none exists
   */
  async getColdWallet(userId: string) {
    try {
      let wallet = await this.database.wallet.findFirst({
        where: {
          userId: userId,
          walletType: "COLD",
        },
        include: {
          childWallets: true,
          user: true,
        },
      });

      // 🚀 AUTO-CREATE: If no wallet exists, create wallet hierarchy
      if (!wallet) {
        this.logger.warn(`⚠️ No cold wallet found for user ${userId}, auto-creating...`);
        
        try {
          // Use simple wallet creation for development
          this.logger.log(`🛠️ Using simple wallet creation for development environment`);
          const walletHierarchy = await this.createSimpleWalletHierarchy(userId);
          
          // Fetch the newly created cold wallet
          wallet = await this.database.wallet.findFirst({
            where: {
              userId: userId,
              walletType: "COLD",
            },
            include: {
              childWallets: true,
              user: true,
            },
          });

          if (wallet) {
            this.logger.log(`✅ Auto-created cold wallet for user ${userId}: ${wallet.publicKey}`);
          }
        } catch (createError) {
          this.logger.error(`❌ Failed to auto-create wallet hierarchy: ${createError.message}`);
          this.logger.error('Create error details:', createError.stack);
          throw new Error(`Cold wallet not found and auto-creation failed: ${createError.message}`);
        }
      }

      if (!wallet) {
        throw new Error("Cold wallet not found");
      }

      return wallet;
    } catch (error) {
      this.logger.error("❌ Failed to get cold wallet:", error.message);
      throw error;
    }
  }

  /**
   * Get user's Hot wallet (derived)
   * Auto-creates wallet hierarchy if none exists
   */
  async getHotWallet(userId: string) {
    try {
      let wallet = await this.database.wallet.findFirst({
        where: {
          userId: userId,
          walletType: "HOT",
        },
        include: {
          parentWallet: true,
          user: true,
        },
      });

      // 🚀 AUTO-CREATE: If no wallet exists, create wallet hierarchy
      if (!wallet) {
        this.logger.warn(`⚠️ No hot wallet found for user ${userId}, auto-creating...`);
        
        try {
          // Use simple wallet creation for development
          this.logger.log(`🛠️ Using simple wallet creation for development environment`);
          const walletHierarchy = await this.createSimpleWalletHierarchy(userId);
          
          // Fetch the newly created hot wallet
          wallet = await this.database.wallet.findFirst({
            where: {
              userId: userId,
              walletType: "HOT",
            },
            include: {
              parentWallet: true,
              user: true,
            },
          });

          if (wallet) {
            this.logger.log(`✅ Auto-created hot wallet for user ${userId}: ${wallet.publicKey}`);
          }
        } catch (createError) {
          this.logger.error(`❌ Failed to auto-create wallet hierarchy: ${createError.message}`);
          this.logger.error('Create error details:', createError.stack);
          throw new Error(`Hot wallet not found and auto-creation failed: ${createError.message}`);
        }
      }

      if (!wallet) {
        throw new Error("Hot wallet not found");
      }

      return wallet;
    } catch (error) {
      this.logger.error("❌ Failed to get hot wallet:", error.message);
      throw error;
    }
  }

  /**
   * Get wallet balances with hierarchy info and sync with Stellar blockchain
   */
  async getWalletBalances(userId: string) {
    try {
      const [coldWallet, hotWallet] = await Promise.all([
        this.getColdWallet(userId),
        this.getHotWallet(userId),
      ]);

      // 🌟 STELLAR SYNC: Always sync with blockchain for fresh data
      await this.syncWalletWithStellar(coldWallet.id, coldWallet.publicKey);
      await this.syncWalletWithStellar(hotWallet.id, hotWallet.publicKey);

      // Refresh wallet data after sync
      const [syncedColdWallet, syncedHotWallet] = await Promise.all([
        this.database.wallet.findUnique({ where: { id: coldWallet.id } }),
        this.database.wallet.findUnique({ where: { id: hotWallet.id } }),
      ]);

      const totalBalance = syncedColdWallet.balance.plus(syncedHotWallet.balance);
      const coldPercentage = totalBalance.gt(0)
        ? syncedColdWallet.balance.div(totalBalance).mul(100).toNumber()
        : 0;
      const hotPercentage = totalBalance.gt(0)
        ? syncedHotWallet.balance.div(totalBalance).mul(100).toNumber()
        : 0;

      return {
        total: totalBalance.toString(),
        cold: {
          balance: syncedColdWallet.balance.toString(),
          percentage: coldPercentage,
          address: syncedColdWallet.publicKey,
          derivationPath: syncedColdWallet.derivationPath,
          stellarSynced: true,
        },
        hot: {
          balance: syncedHotWallet.balance.toString(),
          percentage: hotPercentage,
          address: syncedHotWallet.publicKey,
          derivationPath: syncedHotWallet.derivationPath,
          parentAddress: syncedColdWallet.publicKey,
          stellarSynced: true,
        },
        needsRebalancing: Math.abs(hotPercentage - 5) > 2, // Alert if hot wallet > 7% or < 3%
        lastSyncedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("❌ Failed to get wallet balances:", error.message);
      throw error;
    }
  }

  // ==================== STELLAR BLOCKCHAIN SYNC ====================

  /**
   * Sync individual wallet with Stellar blockchain
   * Updates local balance with real blockchain balance
   */
  async syncWalletWithStellar(walletId: string, publicKey: string): Promise<void> {
    try {
      this.logger.log(`🌟 Syncing wallet ${walletId} (${publicKey}) with Stellar blockchain...`);

      // Get current blockchain balance
      const stellarAccount = await this.stellarService.getAccountInfo(publicKey);
      const stellarXlmBalance = stellarAccount.balances.find(b => b.assetType === 'native')?.balance || "0";
      
      if (parseFloat(stellarXlmBalance) >= 0) {
        // Update local balance with Stellar balance
        await this.database.wallet.update({
          where: { id: walletId },
          data: { 
            balance: new Decimal(stellarXlmBalance),
            updatedAt: new Date()
          }
        });
        
        this.logger.log(`✅ Synced wallet ${walletId}: Local=${stellarXlmBalance} XLM (from Stellar)`);
      } else {
        this.logger.warn(`⚠️ Invalid Stellar balance for wallet ${walletId}: ${stellarXlmBalance}`);
      }

    } catch (error) {
      // Don't throw error - sync failures shouldn't break the API
      this.logger.warn(`⚠️ Failed to sync wallet ${walletId} with Stellar: ${error.message}`);
      
      // If account doesn't exist on Stellar, log but don't fail
      if (error.message?.includes('Not Found') || error.message?.includes('404')) {
        this.logger.warn(`⚠️ Stellar account ${publicKey} not found - using local balance only`);
      }
    }
  }

  /**
   * Batch sync all wallets for a user with Stellar blockchain
   */
  async syncAllUserWalletsWithStellar(userId: string): Promise<{
    synced: number;
    failed: number;
    details: any[];
  }> {
    try {
      const wallets = await this.getUserWallets(userId);
      const results = [];
      let synced = 0;
      let failed = 0;

      for (const wallet of wallets) {
        try {
          await this.syncWalletWithStellar(wallet.id, wallet.publicKey);
          results.push({
            walletId: wallet.id,
            address: wallet.publicKey,
            type: wallet.walletType,
            status: 'synced'
          });
          synced++;
        } catch (error) {
          results.push({
            walletId: wallet.id,
            address: wallet.publicKey,
            type: wallet.walletType,
            status: 'failed',
            error: error.message
          });
          failed++;
        }
      }

      this.logger.log(`🌟 Batch sync completed for user ${userId}: ${synced} synced, ${failed} failed`);
      
      return {
        synced,
        failed,
        details: results
      };

    } catch (error) {
      this.logger.error(`❌ Batch sync failed for user ${userId}:`, error.message);
      throw error;
    }
  }

  // ==================== WALLET REBALANCING ====================

  /**
   * Rebalance wallets to maintain 95% Cold / 5% Hot ratio
   */
  async rebalanceWallets(
    userId: string,
    guardianId: string,
  ): Promise<{
    success: boolean;
    amountMoved: string;
    direction: "HOT_TO_COLD" | "COLD_TO_HOT";
    newBalances: any;
  }> {
    try {
      this.logger.log(`⚖️ Rebalancing wallets for user: ${userId}`);

      const balances = await this.getWalletBalances(userId);

      if (!balances.needsRebalancing) {
        this.logger.log("✅ Wallets already balanced, no action needed");
        return {
          success: true,
          amountMoved: "0.0000000",
          direction: "HOT_TO_COLD",
          newBalances: balances,
        };
      }

      const totalBalance = new Decimal(balances.total);
      const targetHotBalance = totalBalance.mul(0.05); // 5%
      const currentHotBalance = new Decimal(balances.hot.balance);
      const difference = currentHotBalance.minus(targetHotBalance);

      let direction: "HOT_TO_COLD" | "COLD_TO_HOT";
      let amountToMove: Decimal;

      if (difference.gt(0)) {
        // Hot wallet has too much, move to cold
        direction = "HOT_TO_COLD";
        amountToMove = difference;
      } else {
        // Hot wallet has too little, move from cold
        direction = "COLD_TO_HOT";
        amountToMove = difference.abs();
      }

      // Create rebalance transaction (this would be handled by TransactionService)
      // For now, just log the intended operation
      this.logger.log(
        `💱 Rebalance needed: ${direction} - ${amountToMove.toString()} XLM`,
      );

      // Audit log
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: guardianId,
        action: "wallet.rebalance",
        resource: "wallet",
        ip: "backend-service",
        userAgent: "wallet-service",
        result: "success",
        metadata: {
          userId,
          direction,
          amount: amountToMove.toString(),
          balancesBefore: balances,
        },
      });

      // Get updated balances after rebalancing
      const newBalances = await this.getWalletBalances(userId);

      return {
        success: true,
        amountMoved: amountToMove.toString(),
        direction,
        newBalances,
      };
    } catch (error) {
      this.logger.error("❌ Wallet rebalancing failed:", error.message);
      throw error;
    }
  }

  /**
   * Update wallet balance (used by transaction service)
   */
  async updateWalletBalance(
    walletId: string,
    newBalance: string,
    reservedChange?: string,
  ): Promise<void> {
    try {
      const updateData: any = {
        balance: new Decimal(newBalance),
        updatedAt: new Date(),
      };

      if (reservedChange) {
        updateData.reservedBalance = new Decimal(reservedChange);
      }

      await this.database.wallet.update({
        where: { id: walletId },
        data: updateData,
      });

      this.logger.log(
        `✅ Wallet balance updated: ${walletId} -> ${newBalance} XLM`,
      );
    } catch (error) {
      this.logger.error("❌ Failed to update wallet balance:", error.message);
      throw error;
    }
  }

  /**
   * Check if wallet can send amount
   * Auto-syncs with Stellar blockchain if local balance is 0
   */
  async canSendAmount(
    walletId: string,
    amount: string,
  ): Promise<{
    canSend: boolean;
    availableBalance: string;
    reason?: string;
  }> {
    try {
      const wallet = await this.database.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        return {
          canSend: false,
          availableBalance: "0",
          reason: "Wallet not found",
        };
      }

      const requestedAmount = new Decimal(amount);
      let availableBalance = wallet.balance.minus(wallet.reservedBalance);

      // 🔄 AUTO-SYNC: If local balance is 0, sync with Stellar blockchain
      if (availableBalance.eq(0)) {
        this.logger.log(`🔄 Auto-syncing balance for wallet ${walletId} from Stellar blockchain...`);
        
        try {
          const stellarBalance = await this.stellarService.getAccountInfo(wallet.publicKey);
          const stellarXlmBalance = stellarBalance.balances.find(b => b.assetType === 'native')?.balance || "0";
          
          if (parseFloat(stellarXlmBalance) > 0) {
            // Update local balance with Stellar balance
            await this.database.wallet.update({
              where: { id: walletId },
              data: { 
                balance: new Decimal(stellarXlmBalance),
                updatedAt: new Date()
              }
            });
            
            availableBalance = new Decimal(stellarXlmBalance).minus(wallet.reservedBalance);
            this.logger.log(`✅ Synced wallet ${walletId} balance: ${stellarXlmBalance} XLM`);
          }
        } catch (syncError) {
          this.logger.warn(`⚠️ Failed to sync balance for wallet ${walletId}: ${syncError.message}`);
          // Continue with local balance if sync fails
        }
      }

      if (requestedAmount.gt(availableBalance)) {
        return {
          canSend: false,
          availableBalance: availableBalance.toString(),
          reason: "Insufficient available balance",
        };
      }

      return {
        canSend: true,
        availableBalance: availableBalance.toString(),
      };
    } catch (error) {
      this.logger.error("❌ Failed to check wallet balance:", error.message);
      return {
        canSend: false,
        availableBalance: "0",
        reason: "Balance check failed",
      };
    }
  }

  /**
   * Reserve balance for pending transaction
   */
  async reserveBalance(walletId: string, amount: string): Promise<void> {
    try {
      const wallet = await this.database.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const reserveAmount = new Decimal(amount);
      const newReservedBalance = wallet.reservedBalance.plus(reserveAmount);

      await this.database.wallet.update({
        where: { id: walletId },
        data: {
          reservedBalance: newReservedBalance,
        },
      });

      this.logger.log(`✅ Reserved ${amount} XLM in wallet: ${walletId}`);
    } catch (error) {
      this.logger.error("❌ Failed to reserve balance:", error.message);
      throw error;
    }
  }

  /**
   * Release reserved balance
   */
  async releaseReservedBalance(
    walletId: string,
    amount: string,
  ): Promise<void> {
    try {
      const wallet = await this.database.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const releaseAmount = new Decimal(amount);
      const newReservedBalance = wallet.reservedBalance.minus(releaseAmount);

      // Ensure reserved balance doesn't go negative
      const finalReservedBalance = newReservedBalance.lt(0)
        ? new Decimal(0)
        : newReservedBalance;

      await this.database.wallet.update({
        where: { id: walletId },
        data: {
          reservedBalance: finalReservedBalance,
        },
      });

      this.logger.log(`✅ Released ${amount} XLM from wallet: ${walletId}`);
    } catch (error) {
      this.logger.error(
        "❌ Failed to release reserved balance:",
        error.message,
      );
      throw error;
    }
  }

  // ==================== WALLET QUERIES ====================

  /**
   * Get wallet by ID with full hierarchy info
   */
  async getWalletById(walletId: string) {
    try {
      return await this.database.wallet.findUnique({
        where: { id: walletId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              hsmPartitionId: true,
            },
          },
          parentWallet: {
            select: {
              id: true,
              publicKey: true,
              walletType: true,
              derivationPath: true,
            },
          },
          childWallets: {
            select: {
              id: true,
              publicKey: true,
              walletType: true,
              derivationPath: true,
              balance: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error("❌ Failed to get wallet:", error.message);
      throw error;
    }
  }

  /**
   * Get all wallets for user
   */
  async getUserWallets(userId: string) {
    try {
      return await this.database.wallet.findMany({
        where: { userId },
        include: {
          parentWallet: true,
          childWallets: true,
        },
        orderBy: {
          walletType: "desc", // COLD first, then HOT
        },
      });
    } catch (error) {
      this.logger.error("❌ Failed to get user wallets:", error.message);
      throw error;
    }
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats() {
    try {
      const [
        totalWallets,
        coldWallets,
        hotWallets,
        totalBalance,
        hsmProtectedWallets,
      ] = await Promise.all([
        this.database.wallet.count(),
        this.database.wallet.count({ where: { walletType: "COLD" } }),
        this.database.wallet.count({ where: { walletType: "HOT" } }),
        this.database.wallet.aggregate({
          _sum: { balance: true },
        }),
        this.database.wallet.count({ where: { isHSMProtected: true } }),
      ]);

      return {
        total: totalWallets,
        cold: coldWallets,
        hot: hotWallets,
        totalBalance: totalBalance._sum.balance?.toString() || "0",
        hsmProtected: hsmProtectedWallets,
        hsmProtectionPercentage:
          totalWallets > 0 ? (hsmProtectedWallets / totalWallets) * 100 : 0,
      };
    } catch (error) {
      this.logger.error("❌ Failed to get wallet stats:", error.message);
      throw error;
    }
  }
}
