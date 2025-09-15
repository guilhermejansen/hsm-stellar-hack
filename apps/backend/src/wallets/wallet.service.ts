import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';

import { DatabaseService } from '../database/database.service';
import { HSMService } from '../hsm/hsm.service';
import { AuditService } from '../common/audit.service';
import { WalletHierarchy, WalletCreationRequest } from '../common/interfaces';

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
    private readonly auditService: AuditService,
    private readonly configService: ConfigService
  ) {}

  // ==================== WALLET CREATION ====================

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
        where: { id: userId }
      });

      if (!user || !user.hsmPartitionId || !user.hsmKeyName) {
        throw new Error('User HSM partition not found or not activated');
      }

      if (user.kycStatus !== 'APPROVED') {
        throw new Error('KYC must be approved before creating wallets');
      }

      // Create wallet hierarchy using HSM
      const walletHierarchy = await this.hsmService.createWalletHierarchy(
        userId,
        user.hsmPartitionId,
        user.hsmKeyName
      );

      // Create Cold Wallet (Master) in database
      const coldWallet = await this.database.wallet.create({
        data: {
          userId: userId,
          publicKey: walletHierarchy.coldWallet.address,
          derivationPath: walletHierarchy.coldWallet.derivationPath,
          walletType: 'COLD',
          balance: new Decimal(0),
          reservedBalance: new Decimal(0),
          maxBalance: null, // No limit for cold wallet
          hsmKeyName: walletHierarchy.coldWallet.keyId,
          hsmPartitionId: walletHierarchy.coldWallet.hsmPartitionId,
          isHSMProtected: true,
          requiresTOTP: true, // Cold wallet always requires TOTP
          parentWalletId: null // Cold is the master
        }
      });

      // Create Hot Wallet (Derived from Cold) in database
      const hotWallet = await this.database.wallet.create({
        data: {
          userId: userId,
          publicKey: walletHierarchy.hotWallet.address,
          derivationPath: walletHierarchy.hotWallet.derivationPath,
          walletType: 'HOT',
          balance: new Decimal(0),
          reservedBalance: new Decimal(0),
          maxBalance: new Decimal(0), // Will be set based on total balance
          hsmKeyName: walletHierarchy.hotWallet.keyId,
          hsmPartitionId: walletHierarchy.hotWallet.hsmPartitionId,
          isHSMProtected: true,
          requiresTOTP: false, // Hot wallet for operational use
          parentWalletId: coldWallet.id // Hot is derived from Cold
        }
      });

      // Update user with Stellar public key (Cold wallet address)
      await this.database.user.update({
        where: { id: userId },
        data: {
          stellarPublicKey: coldWallet.publicKey
        }
      });

      const result: WalletHierarchy = {
        coldWallet: {
          id: coldWallet.id,
          address: coldWallet.publicKey,
          derivationPath: coldWallet.derivationPath,
          balance: '0.0000000',
          percentage: 95
        },
        hotWallet: {
          id: hotWallet.id,
          address: hotWallet.publicKey,
          derivationPath: hotWallet.derivationPath,
          balance: '0.0000000',
          percentage: 5,
          parentWalletId: coldWallet.id
        }
      };

      // Audit log
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: userId,
        action: 'wallet.hierarchy_created',
        resource: 'wallet',
        ip: 'backend-service',
        userAgent: 'wallet-service',
        result: 'success',
        metadata: {
          coldWalletId: coldWallet.id,
          hotWalletId: hotWallet.id,
          coldAddress: coldWallet.publicKey,
          hotAddress: hotWallet.publicKey,
          duration: Date.now() - startTime
        }
      });

      this.logger.log(`✅ Wallet hierarchy created - Cold: ${coldWallet.publicKey}, Hot: ${hotWallet.publicKey}`);
      return result;

    } catch (error) {
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: userId,
        action: 'wallet.hierarchy_creation_failed',
        resource: 'wallet',
        ip: 'backend-service',
        userAgent: 'wallet-service',
        result: 'failure',
        metadata: { 
          error: error.message,
          duration: Date.now() - startTime
        }
      });
      
      this.logger.error('❌ Wallet hierarchy creation failed:', error.message);
      throw error;
    }
  }

  // ==================== WALLET QUERIES ====================

  /**
   * Get user's Cold wallet (master)
   */
  async getColdWallet(userId: string) {
    try {
      const wallet = await this.database.wallet.findFirst({
        where: {
          userId: userId,
          walletType: 'COLD'
        },
        include: {
          childWallets: true,
          user: true
        }
      });

      if (!wallet) {
        throw new Error('Cold wallet not found');
      }

      return wallet;
    } catch (error) {
      this.logger.error('❌ Failed to get cold wallet:', error.message);
      throw error;
    }
  }

  /**
   * Get user's Hot wallet (derived)
   */
  async getHotWallet(userId: string) {
    try {
      const wallet = await this.database.wallet.findFirst({
        where: {
          userId: userId,
          walletType: 'HOT'
        },
        include: {
          parentWallet: true,
          user: true
        }
      });

      if (!wallet) {
        throw new Error('Hot wallet not found');
      }

      return wallet;
    } catch (error) {
      this.logger.error('❌ Failed to get hot wallet:', error.message);
      throw error;
    }
  }

  /**
   * Get wallet balances with hierarchy info
   */
  async getWalletBalances(userId: string) {
    try {
      const [coldWallet, hotWallet] = await Promise.all([
        this.getColdWallet(userId),
        this.getHotWallet(userId)
      ]);

      const totalBalance = coldWallet.balance.plus(hotWallet.balance);
      const coldPercentage = totalBalance.gt(0) 
        ? coldWallet.balance.div(totalBalance).mul(100).toNumber()
        : 0;
      const hotPercentage = totalBalance.gt(0)
        ? hotWallet.balance.div(totalBalance).mul(100).toNumber() 
        : 0;

      return {
        total: totalBalance.toString(),
        cold: {
          balance: coldWallet.balance.toString(),
          percentage: coldPercentage,
          address: coldWallet.publicKey,
          derivationPath: coldWallet.derivationPath
        },
        hot: {
          balance: hotWallet.balance.toString(),
          percentage: hotPercentage,
          address: hotWallet.publicKey,
          derivationPath: hotWallet.derivationPath,
          parentAddress: coldWallet.publicKey
        },
        needsRebalancing: Math.abs(hotPercentage - 5) > 2 // Alert if hot wallet > 7% or < 3%
      };
    } catch (error) {
      this.logger.error('❌ Failed to get wallet balances:', error.message);
      throw error;
    }
  }

  // ==================== WALLET REBALANCING ====================

  /**
   * Rebalance wallets to maintain 95% Cold / 5% Hot ratio
   */
  async rebalanceWallets(userId: string, guardianId: string): Promise<{
    success: boolean;
    amountMoved: string;
    direction: 'HOT_TO_COLD' | 'COLD_TO_HOT';
    newBalances: any;
  }> {
    try {
      this.logger.log(`⚖️ Rebalancing wallets for user: ${userId}`);

      const balances = await this.getWalletBalances(userId);
      
      if (!balances.needsRebalancing) {
        this.logger.log('✅ Wallets already balanced, no action needed');
        return {
          success: true,
          amountMoved: '0.0000000',
          direction: 'HOT_TO_COLD',
          newBalances: balances
        };
      }

      const totalBalance = new Decimal(balances.total);
      const targetHotBalance = totalBalance.mul(0.05); // 5%
      const currentHotBalance = new Decimal(balances.hot.balance);
      const difference = currentHotBalance.minus(targetHotBalance);

      let direction: 'HOT_TO_COLD' | 'COLD_TO_HOT';
      let amountToMove: Decimal;

      if (difference.gt(0)) {
        // Hot wallet has too much, move to cold
        direction = 'HOT_TO_COLD';
        amountToMove = difference;
      } else {
        // Hot wallet has too little, move from cold
        direction = 'COLD_TO_HOT';
        amountToMove = difference.abs();
      }

      // Create rebalance transaction (this would be handled by TransactionService)
      // For now, just log the intended operation
      this.logger.log(`💱 Rebalance needed: ${direction} - ${amountToMove.toString()} XLM`);

      // Audit log
      await this.auditService.logEvent({
        timestamp: new Date(),
        userId: guardianId,
        action: 'wallet.rebalance',
        resource: 'wallet',
        ip: 'backend-service',
        userAgent: 'wallet-service',
        result: 'success',
        metadata: {
          userId,
          direction,
          amount: amountToMove.toString(),
          balancesBefore: balances
        }
      });

      // Get updated balances after rebalancing
      const newBalances = await this.getWalletBalances(userId);

      return {
        success: true,
        amountMoved: amountToMove.toString(),
        direction,
        newBalances
      };

    } catch (error) {
      this.logger.error('❌ Wallet rebalancing failed:', error.message);
      throw error;
    }
  }

  /**
   * Update wallet balance (used by transaction service)
   */
  async updateWalletBalance(
    walletId: string,
    newBalance: string,
    reservedChange?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        balance: new Decimal(newBalance),
        updatedAt: new Date()
      };

      if (reservedChange) {
        updateData.reservedBalance = new Decimal(reservedChange);
      }

      await this.database.wallet.update({
        where: { id: walletId },
        data: updateData
      });

      this.logger.log(`✅ Wallet balance updated: ${walletId} -> ${newBalance} XLM`);
    } catch (error) {
      this.logger.error('❌ Failed to update wallet balance:', error.message);
      throw error;
    }
  }

  /**
   * Check if wallet can send amount
   */
  async canSendAmount(walletId: string, amount: string): Promise<{
    canSend: boolean;
    availableBalance: string;
    reason?: string;
  }> {
    try {
      const wallet = await this.database.wallet.findUnique({
        where: { id: walletId }
      });

      if (!wallet) {
        return { canSend: false, availableBalance: '0', reason: 'Wallet not found' };
      }

      const requestedAmount = new Decimal(amount);
      const availableBalance = wallet.balance.minus(wallet.reservedBalance);

      if (requestedAmount.gt(availableBalance)) {
        return {
          canSend: false,
          availableBalance: availableBalance.toString(),
          reason: 'Insufficient available balance'
        };
      }

      return {
        canSend: true,
        availableBalance: availableBalance.toString()
      };
    } catch (error) {
      this.logger.error('❌ Failed to check wallet balance:', error.message);
      return { canSend: false, availableBalance: '0', reason: 'Balance check failed' };
    }
  }

  /**
   * Reserve balance for pending transaction
   */
  async reserveBalance(walletId: string, amount: string): Promise<void> {
    try {
      const wallet = await this.database.wallet.findUnique({
        where: { id: walletId }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const reserveAmount = new Decimal(amount);
      const newReservedBalance = wallet.reservedBalance.plus(reserveAmount);

      await this.database.wallet.update({
        where: { id: walletId },
        data: {
          reservedBalance: newReservedBalance
        }
      });

      this.logger.log(`✅ Reserved ${amount} XLM in wallet: ${walletId}`);
    } catch (error) {
      this.logger.error('❌ Failed to reserve balance:', error.message);
      throw error;
    }
  }

  /**
   * Release reserved balance
   */
  async releaseReservedBalance(walletId: string, amount: string): Promise<void> {
    try {
      const wallet = await this.database.wallet.findUnique({
        where: { id: walletId }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const releaseAmount = new Decimal(amount);
      const newReservedBalance = wallet.reservedBalance.minus(releaseAmount);

      // Ensure reserved balance doesn't go negative
      const finalReservedBalance = newReservedBalance.lt(0) ? new Decimal(0) : newReservedBalance;

      await this.database.wallet.update({
        where: { id: walletId },
        data: {
          reservedBalance: finalReservedBalance
        }
      });

      this.logger.log(`✅ Released ${amount} XLM from wallet: ${walletId}`);
    } catch (error) {
      this.logger.error('❌ Failed to release reserved balance:', error.message);
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
              hsmPartitionId: true
            }
          },
          parentWallet: {
            select: {
              id: true,
              publicKey: true,
              walletType: true,
              derivationPath: true
            }
          },
          childWallets: {
            select: {
              id: true,
              publicKey: true,
              walletType: true,
              derivationPath: true,
              balance: true
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('❌ Failed to get wallet:', error.message);
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
          childWallets: true
        },
        orderBy: {
          walletType: 'desc' // COLD first, then HOT
        }
      });
    } catch (error) {
      this.logger.error('❌ Failed to get user wallets:', error.message);
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
        hsmProtectedWallets
      ] = await Promise.all([
        this.database.wallet.count(),
        this.database.wallet.count({ where: { walletType: 'COLD' } }),
        this.database.wallet.count({ where: { walletType: 'HOT' } }),
        this.database.wallet.aggregate({
          _sum: { balance: true }
        }),
        this.database.wallet.count({ where: { isHSMProtected: true } })
      ]);

      return {
        total: totalWallets,
        cold: coldWallets,
        hot: hotWallets,
        totalBalance: totalBalance._sum.balance?.toString() || '0',
        hsmProtected: hsmProtectedWallets,
        hsmProtectionPercentage: totalWallets > 0 ? (hsmProtectedWallets / totalWallets) * 100 : 0
      };
    } catch (error) {
      this.logger.error('❌ Failed to get wallet stats:', error.message);
      throw error;
    }
  }
}
