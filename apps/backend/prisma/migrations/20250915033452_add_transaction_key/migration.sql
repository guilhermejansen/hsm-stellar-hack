-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_UPDATE');

-- CreateEnum
CREATE TYPE "GuardianRole" AS ENUM ('CEO', 'CFO', 'CTO', 'TREASURER', 'ADMIN');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('HOT', 'COLD');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'AWAITING_APPROVAL', 'APPROVED', 'EXECUTING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('PAYMENT', 'REBALANCE', 'WITHDRAWAL', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "ThresholdSchemeType" AS ENUM ('LOW_VALUE_2_OF_3', 'HIGH_VALUE_2_OF_3', 'CRITICAL_3_OF_3');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPROVAL_REQUEST', 'APPROVAL_SUCCESS', 'TRANSACTION_SUCCESS', 'TRANSACTION_FAILED', 'SECURITY_ALERT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('ROOT_CA', 'INTERMEDIATE_CA', 'SERVER_CERT', 'CLIENT_CERT', 'CODE_SIGNING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneCountryCode" TEXT NOT NULL DEFAULT '+55',
    "passwordHash" TEXT NOT NULL,
    "encryptedPII" TEXT,
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "kycDocuments" TEXT[],
    "hsmPartitionId" TEXT,
    "hsmAESKeyId" TEXT,
    "stellarPublicKey" TEXT,
    "hsmKeyName" TEXT,
    "totpSecret" TEXT,
    "totpQrCode" TEXT,
    "totpBackupCodes" TEXT[],
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT true,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT true,
    "hsmActivated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GuardianRole" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totpSecret" TEXT NOT NULL,
    "totpQrCode" TEXT NOT NULL,
    "totpVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastTotpUsed" TEXT,
    "dailyLimit" DECIMAL(20,7) NOT NULL DEFAULT 10000,
    "monthlyLimit" DECIMAL(20,7) NOT NULL DEFAULT 100000,
    "lastApprovalAt" TIMESTAMP(3),
    "totalApprovals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "derivationPath" TEXT NOT NULL,
    "walletType" "WalletType" NOT NULL,
    "parentWalletId" TEXT,
    "balance" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "reservedBalance" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "maxBalance" DECIMAL(20,7),
    "hsmKeyName" TEXT NOT NULL,
    "hsmPartitionId" TEXT NOT NULL,
    "isHSMProtected" BOOLEAN NOT NULL DEFAULT true,
    "requiresTOTP" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionKey" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "parentWalletId" TEXT NOT NULL,
    "hsmKeyId" TEXT NOT NULL,
    "derivationPath" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "destroyedAt" TIMESTAMP(3),
    "guardianId" TEXT,
    "totpCodeUsed" TEXT,
    "signatureHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "stellarHash" TEXT,
    "fromWalletId" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amount" DECIMAL(20,7) NOT NULL,
    "memo" TEXT,
    "status" "TxStatus" NOT NULL,
    "txType" "TxType" NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "requiredApprovals" INTEGER NOT NULL DEFAULT 0,
    "thresholdSchemeId" TEXT,
    "userId" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "totpCode" TEXT,
    "totpValidatedAt" TIMESTAMP(3),
    "challengeHash" TEXT,
    "challengeResponse" TEXT,
    "authMethod" TEXT,
    "challengeExpiresAt" TIMESTAMP(3),
    "hsmKeyReleased" BOOLEAN NOT NULL DEFAULT false,
    "hsmKeyReleasedAt" TIMESTAMP(3),
    "hsmSignature" TEXT,
    "hsmPartitionUsed" TEXT,
    "keyReleaseId" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "rawTransaction" TEXT,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "actionUrl" TEXT,
    "whatsappMessageId" TEXT,
    "whatsappStatus" TEXT,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThresholdScheme" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "schemeType" "ThresholdSchemeType" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "totalParties" INTEGER NOT NULL,
    "challengeType" TEXT NOT NULL DEFAULT 'OCRA_LIKE',
    "challengeTimeout" INTEGER NOT NULL DEFAULT 300,
    "requiresContext" BOOLEAN NOT NULL DEFAULT true,
    "hsmAlgorithm" TEXT NOT NULL DEFAULT 'ED25519',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "guardianShares" JSONB NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThresholdScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "certificateType" "CertificateType" NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "pemCertificate" TEXT NOT NULL,
    "pemPrivateKey" TEXT,
    "caCertificate" TEXT,
    "notBefore" TIMESTAMP(3) NOT NULL,
    "notAfter" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "userId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianThresholdShare" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "thresholdSchemeId" TEXT NOT NULL,
    "shareIndex" INTEGER NOT NULL,
    "hsmPartitionId" TEXT NOT NULL,
    "shareKeyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianThresholdShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionChallenge" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "challengeHash" TEXT NOT NULL,
    "fullChallenge" TEXT NOT NULL,
    "challengeData" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeResponse" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "responseCode" TEXT NOT NULL,
    "responseMethod" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ChallengeResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_hsmPartitionId_key" ON "User"("hsmPartitionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_hsmAESKeyId_key" ON "User"("hsmAESKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stellarPublicKey_key" ON "User"("stellarPublicKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_hsmKeyName_key" ON "User"("hsmKeyName");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_userId_key" ON "Guardian"("userId");

-- CreateIndex
CREATE INDEX "Guardian_isActive_idx" ON "Guardian"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_publicKey_key" ON "Wallet"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_hsmKeyName_key" ON "Wallet"("hsmKeyName");

-- CreateIndex
CREATE INDEX "Wallet_walletType_idx" ON "Wallet"("walletType");

-- CreateIndex
CREATE INDEX "Wallet_publicKey_idx" ON "Wallet"("publicKey");

-- CreateIndex
CREATE INDEX "Wallet_parentWalletId_idx" ON "Wallet"("parentWalletId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionKey_transactionId_key" ON "TransactionKey"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionKey_hsmKeyId_key" ON "TransactionKey"("hsmKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionKey_publicKey_key" ON "TransactionKey"("publicKey");

-- CreateIndex
CREATE INDEX "TransactionKey_isActive_isUsed_idx" ON "TransactionKey"("isActive", "isUsed");

-- CreateIndex
CREATE INDEX "TransactionKey_expiresAt_idx" ON "TransactionKey"("expiresAt");

-- CreateIndex
CREATE INDEX "TransactionKey_transactionIndex_idx" ON "TransactionKey"("transactionIndex");

-- CreateIndex
CREATE INDEX "TransactionKey_parentWalletId_idx" ON "TransactionKey"("parentWalletId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stellarHash_key" ON "Transaction"("stellarHash");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_stellarHash_idx" ON "Transaction"("stellarHash");

-- CreateIndex
CREATE INDEX "Approval_transactionId_idx" ON "Approval"("transactionId");

-- CreateIndex
CREATE INDEX "Approval_hsmKeyReleased_idx" ON "Approval"("hsmKeyReleased");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_transactionId_guardianId_key" ON "Approval"("transactionId", "guardianId");

-- CreateIndex
CREATE INDEX "Notification_userId_sent_idx" ON "Notification"("userId", "sent");

-- CreateIndex
CREATE UNIQUE INDEX "ThresholdScheme_groupId_key" ON "ThresholdScheme"("groupId");

-- CreateIndex
CREATE INDEX "ThresholdScheme_schemeType_idx" ON "ThresholdScheme"("schemeType");

-- CreateIndex
CREATE INDEX "ThresholdScheme_threshold_totalParties_idx" ON "ThresholdScheme"("threshold", "totalParties");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_serialNumber_key" ON "Certificate"("serialNumber");

-- CreateIndex
CREATE INDEX "Certificate_certificateType_idx" ON "Certificate"("certificateType");

-- CreateIndex
CREATE INDEX "Certificate_commonName_idx" ON "Certificate"("commonName");

-- CreateIndex
CREATE INDEX "Certificate_notAfter_idx" ON "Certificate"("notAfter");

-- CreateIndex
CREATE INDEX "GuardianThresholdShare_thresholdSchemeId_idx" ON "GuardianThresholdShare"("thresholdSchemeId");

-- CreateIndex
CREATE INDEX "GuardianThresholdShare_shareIndex_idx" ON "GuardianThresholdShare"("shareIndex");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianThresholdShare_guardianId_thresholdSchemeId_key" ON "GuardianThresholdShare"("guardianId", "thresholdSchemeId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionChallenge_transactionId_key" ON "TransactionChallenge"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionChallenge_challengeHash_key" ON "TransactionChallenge"("challengeHash");

-- CreateIndex
CREATE INDEX "TransactionChallenge_challengeHash_idx" ON "TransactionChallenge"("challengeHash");

-- CreateIndex
CREATE INDEX "TransactionChallenge_expiresAt_idx" ON "TransactionChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "TransactionChallenge_isActive_isUsed_idx" ON "TransactionChallenge"("isActive", "isUsed");

-- CreateIndex
CREATE INDEX "ChallengeResponse_challengeId_idx" ON "ChallengeResponse"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeResponse_challengeId_guardianId_key" ON "ChallengeResponse"("challengeId", "guardianId");

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_parentWalletId_fkey" FOREIGN KEY ("parentWalletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionKey" ADD CONSTRAINT "TransactionKey_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionKey" ADD CONSTRAINT "TransactionKey_parentWalletId_fkey" FOREIGN KEY ("parentWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fromWalletId_fkey" FOREIGN KEY ("fromWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_thresholdSchemeId_fkey" FOREIGN KEY ("thresholdSchemeId") REFERENCES "ThresholdScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianThresholdShare" ADD CONSTRAINT "GuardianThresholdShare_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianThresholdShare" ADD CONSTRAINT "GuardianThresholdShare_thresholdSchemeId_fkey" FOREIGN KEY ("thresholdSchemeId") REFERENCES "ThresholdScheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionChallenge" ADD CONSTRAINT "TransactionChallenge_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeResponse" ADD CONSTRAINT "ChallengeResponse_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "TransactionChallenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeResponse" ADD CONSTRAINT "ChallengeResponse_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
