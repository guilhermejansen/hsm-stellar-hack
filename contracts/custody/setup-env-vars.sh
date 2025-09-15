#!/bin/bash

# ==================== STELLAR CUSTODY MVP - ENVIRONMENT SETUP ====================
# 🚨 TESTNET CONFIGURATION - Run this script to set up environment variables
# Usage: source ./setup-env-vars.sh

echo "🚀 Setting up Stellar Custody MVP Environment Variables..."

# ==================== DEPLOYMENT CONFIGURATION ====================
export STELLAR_NETWORK=testnet
export STELLAR_RPC_URL=https://soroban-testnet.stellar.org:443
export STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Contract Deployment
export STELLAR_DEPLOYER_SECRET=SBWUCOVLBNIZPERNDSDRMVUTAA3Q2GEMHQ6FNKJRYD6PTSVRNG4TRBUU
export STELLAR_DEPLOYER_ADDRESS=GDYR3L2QNF7IZ5RXX7Q4MYZNPDI57CETCHNO45DUYDOSVU4OXZFVHNXS

# ==================== GUARDIAN CONFIGURATION ====================
# Guardian 1 (CEO)
export GUARDIAN_1_SECRET=SCD5OH24CPLZLCFSAFF6OWXURA3CMMFWRULKZQOQC2IA45HB4EJE6CIM
export GUARDIAN_1_ADDRESS=GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT
export GUARDIAN_1_ROLE=CEO
export GUARDIAN_1_PHONE=+5511999999001

# Guardian 2 (CFO)
export GUARDIAN_2_SECRET=SB5TO67IIRWYS3XJJBJ7L6GQI6D4XNOD47BM6UNAUNQZTZE6AOALVLGZ
export GUARDIAN_2_ADDRESS=GAODJIFVVHOGTISA2JYI4HQLIDAXSAJZI7DKXQBSMOKCYTRUCAXTTJW2
export GUARDIAN_2_ROLE=CFO
export GUARDIAN_2_PHONE=+5511999999002

# Guardian 3 (CTO)
export GUARDIAN_3_SECRET=SAO2LN4UINGQHZ3AYW4QAAWCERT5Y62FKKVHIVPCKO4XO54C5W7QRPH3
export GUARDIAN_3_ADDRESS=GD2YNO7FGCSRO5JCMGJZEH5LNC664DYHMKIBJZPMV3ZXAPEXTBGH6OLK
export GUARDIAN_3_ROLE=CTO
export GUARDIAN_3_PHONE=+5511999999003

# ==================== WALLET CONFIGURATION ====================
# Hot Wallet (5% of funds - operational)
export HOT_WALLET_SECRET=SA5UXL6HZGG6LXT6D7EUDGA53DLXJ65NHASES3TLMRAZ74WR7P2JANOC
export HOT_WALLET_ADDRESS=GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM

# Cold Wallet (95% of funds - secure storage)
export COLD_WALLET_SECRET=SBYMRKSX7GVZIKYEMP4P4ZLHOY7LPKHUTCFBMLNHXTL3RJ4GG2BO6KXB
export COLD_WALLET_ADDRESS=GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI

# ==================== HSM DINAMO CONFIGURATION ====================
# HSM Connection (PRODUCTION VALUES PROVIDED)
export HSM_HOST=187.33.9.132
export HSM_PORT=4433
export HSM_USER=demoale
export HSM_PASS=12345678
export HSM_PARTITION=DEMO
export HSM_TIMEOUT=30000

# HSM Key Management
export HSM_MASTER_KEY_ID=stellar_custody_master
export HSM_HOT_KEY_ID=stellar_custody_hot
export HSM_COLD_KEY_ID=stellar_custody_cold
export HSM_GUARDIAN_KEY_PREFIX=stellar_guardian_

# ==================== WHATSAPP CONFIGURATION ====================
# ZuckZapGo API Configuration
export WHATSAPP_API_URL=https://api.zuckzapgo.com
export WHATSAPP_TOKEN=!!qYWdJ61zk3i1AvTfXhzE!!
export WHATSAPP_FROM_NUMBER=+5511999999999

# ==================== SYSTEM LIMITS ====================
# Transaction Limits (in stroops - 1 XLM = 10,000,000 stroops)
export DAILY_LIMIT_STROOPS=1000000000000    # 100,000 XLM
export MONTHLY_LIMIT_STROOPS=10000000000000  # 1,000,000 XLM
export HIGH_VALUE_THRESHOLD_STROOPS=10000000000  # 1,000 XLM

# Multi-sig Configuration
export REQUIRED_APPROVALS=2
export GUARDIAN_COUNT=3
export COLD_WALLET_PERCENTAGE=95
export HOT_WALLET_PERCENTAGE=5

# ==================== CONTRACT DEPLOYMENT INFO ====================
# Contract deployed successfully on testnet
export STELLAR_CONTRACT_ID="CCVEIQKVF6C3G52OJ7TLVIPMJXDZ3ABPLLXQAQVDX2BEZHWUPLFWUYSX"
export STELLAR_CONTRACT_ADDRESS="CCVEIQKVF6C3G52OJ7TLVIPMJXDZ3ABPLLXQAQVDX2BEZHWUPLFWUYSX"
export DEPLOYMENT_TRANSACTION_ID="c2177b5c799fe8f8b36cd7c2e630bbd414bb9a8ff81a143015dee0832c75589b"
export DEPLOYMENT_TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "✅ Environment variables set successfully!"
echo ""
echo "📋 SUMMARY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Network: $STELLAR_NETWORK"
echo "🚀 Deployer: $STELLAR_DEPLOYER_ADDRESS"
echo "👥 Guardians:"
echo "   CEO: $GUARDIAN_1_ADDRESS"
echo "   CFO: $GUARDIAN_2_ADDRESS" 
echo "   CTO: $GUARDIAN_3_ADDRESS"
echo "💰 Wallets:"
echo "   Hot:  $HOT_WALLET_ADDRESS"
echo "   Cold: $COLD_WALLET_ADDRESS"
echo "🔐 HSM Host: $HSM_HOST"
echo "📱 WhatsApp API: $WHATSAPP_API_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔄 Next steps:"
echo "1. Deploy contract: ./deploy-testnet.sh"
echo "2. Initialize contract: ./initialize-testnet.sh"
echo "3. Test contract: ./test-contract.sh"
echo ""
echo "⚠️  SECURITY NOTE: These are TESTNET keys only!"
