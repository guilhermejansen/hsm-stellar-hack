import { PrismaClient, ThresholdSchemeType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as crypto from 'crypto';

/**
 * 🌱 Database Seed - Initial Admin/Guardian Setup
 * 
 * Creates:
 * - Admin user with CEO guardian role
 * - TOTP setup for authentication
 * - Hot/Cold wallet hierarchy
 * - Initial threshold schemes
 * 
 * Following FINAL_ARCHITECTURE_SUMMARY.mdc 3-Guardian system
 */

const prisma = new PrismaClient();

// Encryption function (matching EncryptionService)
function encrypt(text: string): string {
  // For development, we'll use a simple base64 encoding
  // In production, this should match EncryptionService exactly
  return Buffer.from(text).toString('base64');
}

async function main() {
  console.log('🌱 Starting Stellar Custody MVP database seed...');

  try {
    // ==================== CREATE ADMIN USER ====================
    console.log('👤 Creating admin user...');
    
    const adminEmail = 'admin@stellarcustody.com';
    const adminPassword = 'admin123456';
    const adminPhone = '+5521979232690';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists, skipping creation');
    } else {
      // Hash password
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      
      // Generate TOTP secret
      const totpSecret = authenticator.generateSecret();
      const encryptedTotpSecret = encrypt(totpSecret);
      
      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Administrator',
          phone: adminPhone,
          phoneCountryCode: '+55',
          passwordHash,
          
          // KYC approved for admin
          kycStatus: 'APPROVED',
          kycDocuments: ['admin_id_doc', 'admin_address_proof'],
          
          // HSM Integration (mock for development)
          hsmPartitionId: 'admin_partition_001',
          hsmAESKeyId: 'admin_aes_key_001',
          hsmKeyName: 'admin_stellar_master_001',
          
          // Authentication
          totpSecret: encryptedTotpSecret,
          isEmailVerified: true,
          isPhoneVerified: true,
          hsmActivated: true,
          
          // Stellar address (from our existing keys)
          stellarPublicKey: 'GDYR3L2QNF7IZ5RXX7Q4MYZNPDI57CETCHNO45DUYDOSVU4OXZFVHNXS'
        }
      });

      console.log(`✅ Admin user created: ${adminUser.id}`);
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
      console.log(`📱 TOTP Secret: ${totpSecret}`);
      console.log(`🔐 TOTP Manual Entry: ${totpSecret}`);
    }

    // ==================== CREATE CEO GUARDIAN ====================
    console.log('👑 Creating CEO Guardian...');
    
    const ceoEmail = 'ceo@stellarcustody.com';
    const ceoPassword = 'ceo123456';
    const ceoPhone = '+5511958411806';

    const existingCEO = await prisma.user.findUnique({
      where: { email: ceoEmail }
    });

    let ceoUser;
    if (existingCEO) {
      console.log('⚠️ CEO user already exists');
      ceoUser = existingCEO;
    } else {
      // Hash password
      const passwordHash = await bcrypt.hash(ceoPassword, 12);
      
      // Generate TOTP secret
      const totpSecret = authenticator.generateSecret();
      const encryptedTotpSecret = encrypt(totpSecret);
      
      // Create CEO user
      ceoUser = await prisma.user.create({
        data: {
          email: ceoEmail,
          name: 'João Silva Santos',
          phone: ceoPhone,
          phoneCountryCode: '+55',
          passwordHash,
          
          // KYC approved
          kycStatus: 'APPROVED',
          kycDocuments: ['ceo_id_doc', 'ceo_address_proof'],
          
          // HSM Integration
          hsmPartitionId: 'user_ceo_partition_001',
          hsmAESKeyId: 'ceo_aes_key_001',
          hsmKeyName: 'ceo_stellar_master_001',
          
          // Authentication
          totpSecret: encryptedTotpSecret,
          isEmailVerified: true,
          isPhoneVerified: true,
          hsmActivated: true,
          
          // Stellar address (CEO guardian from our keys)
          stellarPublicKey: 'GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT'
        }
      });

      console.log(`✅ CEO user created: ${ceoUser.id}`);
      console.log(`📧 Email: ${ceoEmail}`);
      console.log(`🔑 Password: ${ceoPassword}`);
      console.log(`📱 TOTP Secret: ${totpSecret}`);
    }

    // Create CEO Guardian
    const existingCEOGuardian = await prisma.guardian.findFirst({
      where: { role: 'CEO' }
    });

    if (existingCEOGuardian) {
      console.log('⚠️ CEO Guardian already exists');
    } else {
      const ceoTotpSecret = authenticator.generateSecret();
      const encryptedCeoTotpSecret = encrypt(ceoTotpSecret);
      
      const ceoGuardian = await prisma.guardian.create({
        data: {
          userId: ceoUser.id,
          role: 'CEO',
          level: 3,
          isActive: true,
          
          // Individual TOTP for guardian
          totpSecret: encryptedCeoTotpSecret,
          totpQrCode: 'qr_code_data_for_ceo',
          totpVerified: true,
          
          // Limits
          dailyLimit: 100000,
          monthlyLimit: 1000000,
          totalApprovals: 0
        }
      });

      console.log(`✅ CEO Guardian created: ${ceoGuardian.id}`);
      console.log(`👑 Role: ${ceoGuardian.role}`);
      console.log(`📱 Guardian TOTP Secret: ${ceoTotpSecret}`);
    }

    // ==================== CREATE CFO GUARDIAN ====================
    console.log('💰 Creating CFO Guardian...');
    
    const cfoEmail = 'cfo@stellarcustody.com';
    const cfoPassword = 'cfo123456';
    const cfoPhone = '+5521981796084';

    const existingCFO = await prisma.user.findUnique({
      where: { email: cfoEmail }
    });

    let cfoUser;
    if (existingCFO) {
      console.log('⚠️ CFO user already exists');
      cfoUser = existingCFO;
    } else {
      const passwordHash = await bcrypt.hash(cfoPassword, 12);
      const totpSecret = authenticator.generateSecret();
      const encryptedTotpSecret = encrypt(totpSecret);
      
      cfoUser = await prisma.user.create({
        data: {
          email: cfoEmail,
          name: 'Maria Oliveira Santos',
          phone: cfoPhone,
          phoneCountryCode: '+55',
          passwordHash,
          kycStatus: 'APPROVED',
          kycDocuments: ['cfo_id_doc', 'cfo_address_proof'],
          hsmPartitionId: 'user_cfo_partition_002',
          hsmAESKeyId: 'cfo_aes_key_002',
          hsmKeyName: 'cfo_stellar_master_002',
          totpSecret: encryptedTotpSecret,
          isEmailVerified: true,
          isPhoneVerified: true,
          hsmActivated: true,
          stellarPublicKey: 'GAODJIFVVHOGTISA2JYI4HQLIDAXSAJZI7DKXQBSMOKCYTRUCAXTTJW2'
        }
      });

      console.log(`✅ CFO user created: ${cfoUser.id}`);
      console.log(`📧 Email: ${cfoEmail}`);
      console.log(`🔑 Password: ${cfoPassword}`);
      console.log(`📱 TOTP Secret: ${totpSecret}`);
    }

    // Create CFO Guardian
    const existingCFOGuardian = await prisma.guardian.findFirst({
      where: { role: 'CFO' }
    });

    if (!existingCFOGuardian) {
      const cfoTotpSecret = authenticator.generateSecret();
      const encryptedCfoTotpSecret = encrypt(cfoTotpSecret);
      
      const cfoGuardian = await prisma.guardian.create({
        data: {
          userId: cfoUser.id,
          role: 'CFO',
          level: 2,
          isActive: true,
          totpSecret: encryptedCfoTotpSecret,
          totpQrCode: 'qr_code_data_for_cfo',
          totpVerified: true,
          dailyLimit: 50000,
          monthlyLimit: 500000,
          totalApprovals: 0
        }
      });

      console.log(`✅ CFO Guardian created: ${cfoGuardian.id}`);
      console.log(`💰 Role: ${cfoGuardian.role}`);
      console.log(`📱 Guardian TOTP Secret: ${cfoTotpSecret}`);
    }

    // ==================== CREATE CTO GUARDIAN ====================
    console.log('🔧 Creating CTO Guardian...');
    
    const ctoEmail = 'cto@stellarcustody.com';
    const ctoPassword = 'cto123456';
    const ctoPhone = '+5521971893103';

    const existingCTO = await prisma.user.findUnique({
      where: { email: ctoEmail }
    });

    let ctoUser;
    if (existingCTO) {
      console.log('⚠️ CTO user already exists');
      ctoUser = existingCTO;
    } else {
      const passwordHash = await bcrypt.hash(ctoPassword, 12);
      const totpSecret = authenticator.generateSecret();
      const encryptedTotpSecret = encrypt(totpSecret);
      
      ctoUser = await prisma.user.create({
        data: {
          email: ctoEmail,
          name: 'Pedro Almeida Santos',
          phone: ctoPhone,
          phoneCountryCode: '+55',
          passwordHash,
          kycStatus: 'APPROVED',
          kycDocuments: ['cto_id_doc', 'cto_address_proof'],
          hsmPartitionId: 'user_cto_partition_003',
          hsmAESKeyId: 'cto_aes_key_003',
          hsmKeyName: 'cto_stellar_master_003',
          totpSecret: encryptedTotpSecret,
          isEmailVerified: true,
          isPhoneVerified: true,
          hsmActivated: true,
          stellarPublicKey: 'GD2YNO7FGCSRO5JCMGJZEH5LNC664DYHMKIBJZPMV3ZXAPEXTBGH6OLK'
        }
      });

      console.log(`✅ CTO user created: ${ctoUser.id}`);
      console.log(`📧 Email: ${ctoEmail}`);
      console.log(`🔑 Password: ${ctoPassword}`);
      console.log(`📱 TOTP Secret: ${totpSecret}`);
    }

    // Create CTO Guardian
    const existingCTOGuardian = await prisma.guardian.findFirst({
      where: { role: 'CTO' }
    });

    if (!existingCTOGuardian) {
      const ctoTotpSecret = authenticator.generateSecret();
      const encryptedCtoTotpSecret = encrypt(ctoTotpSecret);
      
      const ctoGuardian = await prisma.guardian.create({
        data: {
          userId: ctoUser.id,
          role: 'CTO',
          level: 2,
          isActive: true,
          totpSecret: encryptedCtoTotpSecret,
          totpQrCode: 'qr_code_data_for_cto',
          totpVerified: true,
          dailyLimit: 50000,
          monthlyLimit: 500000,
          totalApprovals: 0
        }
      });

      console.log(`✅ CTO Guardian created: ${ctoGuardian.id}`);
      console.log(`🔧 Role: ${ctoGuardian.role}`);
      console.log(`📱 Guardian TOTP Secret: ${ctoTotpSecret}`);
    }

    // ==================== CREATE WALLETS FOR ALL USERS ====================
    console.log('💰 Creating wallet hierarchy for all users...');

    // Wallet configurations for all users (unique valid Stellar addresses)
    const walletConfigs = [
      {
        user: existingAdmin || {
          id: (await prisma.user.findUnique({ where: { email: adminEmail } }))?.id,
          name: 'Administrator',
          hsmPartitionId: 'admin_partition_001'
        },
        coldAddress: 'GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI',
        hotAddress: 'GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM',
        coldBalance: 100000,
        hotBalance: 5000,
        prefix: 'admin'
      },
      {
        user: ceoUser,
        coldAddress: 'GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT',
        hotAddress: 'GBUQWP3BOUZX5TCRQWAHCPHOBVIXMJZPYUKDCW3VXLB6LLXQTGWJFM4X',
        coldBalance: 200000,
        hotBalance: 10000,
        prefix: 'ceo'
      },
      {
        user: cfoUser,
        coldAddress: 'GAODJIFVVHOGTISA2JYI4HQLIDAXSAJZI7DKXQBSMOKCYTRUCAXTTJW2',
        hotAddress: 'GBDGYC73PPZKCQJVQHJ3LGQEY7QA5X5I5GU32MHOWXVLWVH5LJV4OUZ4',
        coldBalance: 150000,
        hotBalance: 7500,
        prefix: 'cfo'
      },
      {
        user: ctoUser,
        coldAddress: 'GD2YNO7FGCSRO5JCMGJZEH5LNC664DYHMKIBJZPMV3ZXAPEXTBGH6OLK',
        hotAddress: 'GDAHPZ2NSYIIHZXM56Y36SBVTV5QKFIZIDDJG5LQOXTNKZHA2WU2BXYZ',
        coldBalance: 100000,
        hotBalance: 5000,
        prefix: 'cto'
      }
    ];

    // Create wallets for each user
    for (const config of walletConfigs) {
      if (!config.user?.id) {
        console.log(`⚠️ Skipping wallet creation for missing user`);
        continue;
      }

      // Check if user already has wallets
      const existingWallet = await prisma.wallet.findFirst({
        where: { userId: config.user.id }
      });

      if (existingWallet) {
        console.log(`⚠️ ${config.prefix.toUpperCase()} user already has wallets`);
        continue;
      }

      // Create Cold Wallet (Master - 95% funds)
      const coldWallet = await prisma.wallet.create({
        data: {
          userId: config.user.id,
          publicKey: config.coldAddress,
          derivationPath: "m/0'",
          walletType: 'COLD',
          balance: config.coldBalance,
          reservedBalance: 0,
          maxBalance: null,
          hsmKeyName: `stellar_custody_${config.prefix}_cold_master`,
          hsmPartitionId: config.user.hsmPartitionId || `${config.prefix}_partition_001`,
          isHSMProtected: true,
          requiresTOTP: true,
          parentWalletId: null
        }
      });

      // Create Hot Wallet (Derived - 5% funds)
      const hotWallet = await prisma.wallet.create({
        data: {
          userId: config.user.id,
          publicKey: config.hotAddress,
          derivationPath: "m/0'/0'",
          walletType: 'HOT',
          balance: config.hotBalance,
          reservedBalance: 0,
          maxBalance: config.hotBalance,
          hsmKeyName: `stellar_custody_${config.prefix}_hot_derived`,
          hsmPartitionId: config.user.hsmPartitionId || `${config.prefix}_partition_001`,
          isHSMProtected: true,
          requiresTOTP: false,
          parentWalletId: coldWallet.id
        }
      });

      console.log(`✅ ${config.prefix.toUpperCase()} Wallets created:`);
      console.log(`   🧊 Cold: ${coldWallet.publicKey} (${config.coldBalance} XLM)`);
      console.log(`   🔥 Hot:  ${hotWallet.publicKey} (${config.hotBalance} XLM)`);
    }

    // ==================== CREATE THRESHOLD SCHEMES ====================
    console.log('🎯 Creating threshold schemes...');

    const schemes = [
      {
        groupId: 'scheme_low_value_2_of_3',
        schemeType: 'LOW_VALUE_2_OF_3',
        threshold: 2,
        totalParties: 3,
        challengeType: 'OCRA_LIKE',
        challengeTimeout: 300,
        requiresContext: false
      },
      {
        groupId: 'scheme_high_value_2_of_3',
        schemeType: 'HIGH_VALUE_2_OF_3',
        threshold: 2,
        totalParties: 3,
        challengeType: 'OCRA_LIKE_REQUIRED',
        challengeTimeout: 300,
        requiresContext: true
      },
      {
        groupId: 'scheme_critical_3_of_3',
        schemeType: 'CRITICAL_3_OF_3',
        threshold: 3,
        totalParties: 3,
        challengeType: 'OCRA_LIKE_REQUIRED',
        challengeTimeout: 300,
        requiresContext: true
      }
    ];

    for (const scheme of schemes) {
      const existingScheme = await prisma.thresholdScheme.findUnique({
        where: { groupId: scheme.groupId }
      });

      if (!existingScheme) {
        await prisma.thresholdScheme.create({
          data: {
            groupId: scheme.groupId,
            schemeType: scheme.schemeType as ThresholdSchemeType,
            threshold: scheme.threshold,
            totalParties: scheme.totalParties,
            challengeType: scheme.challengeType,
            challengeTimeout: scheme.challengeTimeout,
            requiresContext: scheme.requiresContext,
            guardianShares: [],
            isActive: true,
            usageCount: 0
          }
        });
        console.log(`✅ Threshold scheme created: ${scheme.schemeType}`);
      }
    }

    // ==================== CREATE SAMPLE NOTIFICATION ====================
    console.log('📱 Creating sample notification...');

    const existingNotification = await prisma.notification.findFirst();
    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          userId: ceoUser.id,
          type: 'SECURITY_ALERT',
          channel: 'WHATSAPP',
          title: 'Sistema Inicializado',
          body: '🎉 Stellar Custody MVP inicializado com sucesso!\n\n✅ 3 Guardiões configurados\n✅ Wallets criadas\n✅ Sistema pronto para uso',
          sent: true,
          sentAt: new Date(),
          whatsappStatus: 'delivered'
        }
      });
      console.log('✅ Sample notification created');
    }

    // ==================== SUMMARY ====================
    console.log('\n🎉 Database seed completed successfully!');
    console.log('\n📋 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 ADMIN USER:');
    console.log(`   📧 Email: admin@stellarcustody.com`);
    console.log(`   🔑 Password: admin123456`);
    console.log(`   📱 Phone: +5521979232690`);
    console.log('');
    console.log('👑 CEO GUARDIAN:');
    console.log(`   📧 Email: ceo@stellarcustody.com`);
    console.log(`   🔑 Password: ceo123456`);
    console.log(`   📱 Phone: +5511958411806`);
    console.log(`   🌟 Stellar: GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT`);
    console.log('');
    console.log('💰 CFO GUARDIAN:');
    console.log(`   📧 Email: cfo@stellarcustody.com`);
    console.log(`   🔑 Password: cfo123456`);
    console.log(`   📱 Phone: +5521981796084`);
    console.log(`   🌟 Stellar: GAODJIFVVHOGTISA2JYI4HQLIDAXSAJZI7DKXQBSMOKCYTRUCAXTTJW2`);
    console.log('');
    console.log('🔧 CTO GUARDIAN:');
    console.log(`   📧 Email: cto@stellarcustody.com`);
    console.log(`   🔑 Password: cto123456`);
    console.log(`   📱 Phone: +5521971893103`);
    console.log(`   🌟 Stellar: GD2YNO7FGCSRO5JCMGJZEH5LNC664DYHMKIBJZPMV3ZXAPEXTBGH6OLK`);
    console.log('');
    console.log('💰 WALLETS:');
    console.log(`   🧊 Cold (95%): GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI`);
    console.log(`   🔥 Hot (5%):   GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM`);
    console.log('');
    console.log('🎯 THRESHOLD SCHEMES:');
    console.log(`   📊 Low Value:  2-of-3 (< 1K XLM, OCRA optional)`);
    console.log(`   📊 High Value: 2-of-3 (1K-10K XLM, OCRA required)`);
    console.log(`   📊 Critical:   3-of-3 (> 10K XLM, OCRA required)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🧪 TESTING:');
    console.log('1. Login with any of the accounts above');
    console.log('2. Use TOTP code: 123456 (mocked for development)');
    console.log('3. Create transactions and test multi-sig approval');
    console.log('4. Access Swagger: http://localhost:3001/api');
    console.log('');
    console.log('🚀 Ready for testing!');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute seed
main()
  .catch((e) => {
    console.error('❌ Database seed failed:', e);
    process.exit(1);
  });
