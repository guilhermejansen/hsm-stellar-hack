#!/bin/bash

# ==================== STELLAR CUSTODY MVP - CURL TESTING COMMANDS ====================
# 🧪 Copy and paste these commands for quick API testing

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001"
API_URL="$BASE_URL/api"

echo -e "${BLUE}🧪 Stellar Custody MVP - API Testing Commands${NC}"
echo "📋 Base URL: $BASE_URL"
echo "📚 Swagger: $BASE_URL/api"
echo ""

# ==================== HEALTH CHECK ====================
echo -e "${GREEN}📡 HEALTH CHECK${NC}"
echo "curl -s $BASE_URL/health | jq"
curl -s $BASE_URL/health | jq
echo ""

# ==================== AUTHENTICATION ====================
echo -e "${GREEN}🔐 AUTHENTICATION${NC}"

echo "# 1. Login (will fail - no real users yet, but shows structure)"
echo "curl -X POST $API_URL/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"ceo@stellarcustody.com\",\"password\":\"password123\"}'"
echo ""

echo "# 2. TOTP Verification (use session token from login)"
echo "curl -X POST $API_URL/auth/verify-totp \\"
echo "  -H 'Authorization: Bearer <SESSION_TOKEN>' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"totpCode\":\"123456\"}'"
echo ""

# ==================== GUARDIAN SYSTEM ====================
echo -e "${GREEN}👥 GUARDIAN SYSTEM (3-Guardian: CEO, CFO, CTO)${NC}"

echo "# 1. Check minimum guardians (requires auth)"
echo "curl -X GET $API_URL/guardians/check/minimum \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>'"
echo ""

echo "# 2. Get active guardians"
echo "curl -X GET $API_URL/guardians \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>'"
echo ""

echo "# 3. Register CEO Guardian (Admin + TOTP required)"
echo "curl -X POST $API_URL/guardians/register \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\"
echo "  -H 'X-TOTP-Code: 123456' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"name\": \"João Silva Santos\","
echo "    \"email\": \"ceo@stellarcustody.com\","
echo "    \"phone\": \"+5511999999001\","
echo "    \"role\": \"CEO\","
echo "    \"level\": 3,"
echo "    \"kycData\": {"
echo "      \"fullName\": \"João Silva Santos\","
echo "      \"documentId\": \"12345678901\","
echo "      \"address\": \"Rua das Flores, 123, São Paulo, SP\","
echo "      \"dateOfBirth\": \"1980-01-15\","
echo "      \"nationality\": \"Brazilian\""
echo "    }"
echo "  }'"
echo ""

echo "# 4. Activate Guardian (after TOTP QR scan)"
echo "curl -X POST $API_URL/guardians/<GUARDIAN_ID>/activate \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"guardianId\": \"<GUARDIAN_ID>\","
echo "    \"totpCode\": \"123456\""
echo "  }'"
echo ""

echo "# 5. Get guardian statistics"
echo "curl -X GET $API_URL/guardians/stats/overview \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>'"
echo ""

# ==================== WALLETS ====================
echo -e "${GREEN}💰 WALLETS (BIP32 HD Hierarchy)${NC}"

echo "# 1. Get Hot Wallet (m/0'/0' - 5% funds)"
echo "curl -X GET $API_URL/wallets/hot \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>'"
echo ""

echo "# 2. Get Cold Wallet (m/0' - 95% funds)"
echo "curl -X GET $API_URL/wallets/cold \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>'"
echo ""

echo "# 3. Get complete balance overview"
echo "curl -X GET $API_URL/wallets/balances \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>'"
echo ""

echo "# 4. Rebalance wallets (95%/5% ratio)"
echo "curl -X POST $API_URL/wallets/rebalance \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\"
echo "  -H 'X-TOTP-Code: 123456' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"guardianId\": \"<GUARDIAN_ID>\","
echo "    \"totpCode\": \"123456\","
echo "    \"forceRebalance\": false"
echo "  }'"
echo ""

# ==================== TRANSACTIONS ====================
echo -e "${GREEN}💰 TRANSACTIONS (Multi-Sig with OCRA-like)${NC}"

echo "# 1. Create Low-Value Transaction (< 1000 XLM - Auto-execute)"
echo "curl -X POST $API_URL/transactions \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"fromWalletId\": \"<HOT_WALLET_ID>\","
echo "    \"toAddress\": \"GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF\","
echo "    \"amount\": \"500.0000000\","
echo "    \"memo\": \"Low value payment\","
echo "    \"txType\": \"PAYMENT\""
echo "  }'"
echo ""

echo "# 2. Create High-Value Transaction (1K-10K XLM - 2-of-3 with OCRA)"
echo "curl -X POST $API_URL/transactions \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"fromWalletId\": \"<HOT_WALLET_ID>\","
echo "    \"toAddress\": \"GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF\","
echo "    \"amount\": \"5000.0000000\","
echo "    \"memo\": \"High value payment requiring approval\","
echo "    \"txType\": \"PAYMENT\""
echo "  }'"
echo ""

echo "# 3. Create Critical Transaction from Cold Wallet (3-of-3 with OCRA)"
echo "curl -X POST $API_URL/transactions \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"fromWalletId\": \"<COLD_WALLET_ID>\","
echo "    \"toAddress\": \"GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF\","
echo "    \"amount\": \"15000.0000000\","
echo "    \"memo\": \"Critical cold wallet transaction\","
echo "    \"txType\": \"WITHDRAWAL\""
echo "  }'"
echo ""

echo "# 4. Approve Transaction with OCRA-like Challenge"
echo "curl -X POST $API_URL/transactions/<TRANSACTION_ID>/approve \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\"
echo "  -H 'X-Challenge-Response: 123456' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"transactionId\": \"<TRANSACTION_ID>\","
echo "    \"guardianId\": \"<GUARDIAN_ID>\","
echo "    \"challengeResponse\": \"123456\","
echo "    \"authMethod\": \"OCRA_LIKE\""
echo "  }'"
echo ""

echo "# 5. Approve Transaction with TOTP Fallback"
echo "curl -X POST $API_URL/transactions/<TRANSACTION_ID>/approve \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\"
echo "  -H 'X-TOTP-Code: 654321' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"transactionId\": \"<TRANSACTION_ID>\","
echo "    \"guardianId\": \"<GUARDIAN_ID>\","
echo "    \"totpCode\": \"654321\","
echo "    \"authMethod\": \"TOTP_FALLBACK\""
echo "  }'"
echo ""

echo "# 6. List transactions"
echo "curl -X GET '$API_URL/transactions?status=SUCCESS&page=1&limit=10' \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>'"
echo ""

echo "# 7. Get transaction details"
echo "curl -X GET $API_URL/transactions/<TRANSACTION_ID> \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>'"
echo ""

# ==================== CHALLENGES ====================
echo -e "${GREEN}🎯 CHALLENGES (OCRA-like System)${NC}"

echo "# 1. Generate challenge for transaction"
echo "curl -X POST $API_URL/transactions/challenges/generate \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"transactionId\": \"<TRANSACTION_ID>\""
echo "  }'"
echo ""

echo "# 2. Validate challenge response"
echo "curl -X POST $API_URL/transactions/challenges/validate \\"
echo "  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"challengeHash\": \"A1B2C3D4E5F6G7H8\","
echo "    \"responseCode\": \"123456\","
echo "    \"guardianId\": \"<GUARDIAN_ID>\","
echo "    \"transactionId\": \"<TRANSACTION_ID>\""
echo "  }'"
echo ""

# ==================== REAL ADDRESSES ====================
echo -e "${GREEN}🌟 REAL STELLAR ADDRESSES (for testing)${NC}"
echo "# Use these real testnet addresses:"
echo "CEO Guardian:     GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT"
echo "CFO Guardian:     GAODJIFVVHOGTISA2JYI4HQLIDAXSAJZI7DKXQBSMOKCYTRUCAXTTJW2"
echo "CTO Guardian:     GD2YNO7FGCSRO5JCMGJZEH5LNC664DYHMKIBJZPMV3ZXAPEXTBGH6OLK"
echo "Hot Wallet:       GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM"
echo "Cold Wallet:      GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI"
echo "Smart Contract:   CCVEIQKVF6C3G52OJ7TLVIPMJXDZ3ABPLLXQAQVDX2BEZHWUPLFWUYSX"
echo ""

# ==================== TESTING NOTES ====================
echo -e "${YELLOW}⚠️  TESTING NOTES${NC}"
echo "1. Some endpoints will return 401 (expected - no real users in DB yet)"
echo "2. Database needs to be populated with guardian data first"
echo "3. TOTP codes are mocked for development"
echo "4. WhatsApp notifications will be sent to configured phones"
echo "5. HSM operations are mocked but follow real structure"
echo "6. Challenge responses are generated using OCRA-like algorithm"
echo ""

echo -e "${GREEN}✅ Ready for testing!${NC}"
echo "🚀 Start with: ./docker-run.sh up"
echo "📚 View docs: $BASE_URL/api"
