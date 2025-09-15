# 🧪 STELLAR CUSTODY MVP - API TESTING GUIDE

## 📋 Complete curl commands for testing all endpoints

### **🌐 Base URL**: `http://localhost:3001`
### **📚 Swagger Docs**: `http://localhost:3001/api`

---

## 🔐 **1. AUTHENTICATION ENDPOINTS**

### **Login (Email + Password)**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ceo@stellarcustody.com",
    "password": "password123"
  }'
```
**Expected Response**: Session token + TOTP requirement
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requiresTOTP": true,
  "totpChallenge": "uuid-challenge-id",
  "user": {
    "id": "clrx1234567890user01",
    "email": "ceo@stellarcustody.com",
    "name": "João Silva Santos",
    "role": "CEO",
    "isGuardian": true,
    "hsmActivated": true
  }
}
```

### **TOTP Verification**
```bash
curl -X POST http://localhost:3001/api/auth/verify-totp \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "totpCode": "123456",
    "action": "access_token"
  }'
```
**Expected Response**: Full access token
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "tokenType": "Bearer"
  },
  "message": "TOTP verified successfully"
}
```

---

## 👥 **2. GUARDIAN ENDPOINTS (3-Guardian System)**

### **Check Minimum Guardians (Public)**
```bash
curl -X GET http://localhost:3001/api/guardians/check/minimum \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected Response**: Guardian system status
```json
{
  "success": true,
  "data": {
    "hasMinimum": true,
    "activeCount": 3,
    "minimumRequired": 2,
    "roles": ["CEO", "CFO", "CTO"],
    "systemOperational": true
  }
}
```

### **Get Active Guardians**
```bash
curl -X GET http://localhost:3001/api/guardians \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected Response**: List of 3 guardians
```json
{
  "success": true,
  "data": [
    {
      "id": "clrx1234567890guard1",
      "role": "CEO",
      "name": "João Silva Santos",
      "email": "ceo@stellarcustody.com",
      "phone": "+5511999999001",
      "level": 3,
      "isActive": true,
      "totpVerified": true,
      "hsmActivated": true,
      "stellarPublicKey": "GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT",
      "dailyLimit": "100000.0000000",
      "monthlyLimit": "1000000.0000000",
      "totalApprovals": 42
    }
  ],
  "metadata": {
    "count": 3,
    "maxGuardians": 3
  }
}
```

### **Register New Guardian (Admin only)**
```bash
curl -X POST http://localhost:3001/api/guardians/register \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-TOTP-Code: 123456" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva Santos",
    "email": "ceo@stellarcustody.com",
    "phone": "+5511999999001",
    "role": "CEO",
    "level": 3,
    "kycData": {
      "fullName": "João Silva Santos",
      "documentId": "12345678901",
      "address": "Rua das Flores, 123, São Paulo, SP",
      "dateOfBirth": "1980-01-15",
      "nationality": "Brazilian"
    }
  }'
```
**Expected Response**: Guardian registered + TOTP setup
```json
{
  "success": true,
  "data": {
    "guardianId": "clrx1234567890guard1",
    "totpSetup": {
      "secret": "JBSWY3DPEHPK3PXP",
      "qrCodeUrl": "data:image/png;base64,iVBORw0KGgo...",
      "backupCodes": ["12345678", "87654321"],
      "manualEntryKey": "JBSWY3DPEHPK3PXP",
      "hsmPartitionId": "user_abc123def456"
    },
    "nextSteps": [
      "Scan QR code with Google Authenticator",
      "Enter first TOTP code to activate HSM partition"
    ]
  },
  "message": "Guardian CEO registered successfully. TOTP QR code sent via WhatsApp."
}
```

### **Activate Guardian HSM Partition**
```bash
curl -X POST http://localhost:3001/api/guardians/clrx1234567890guard1/activate \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "guardianId": "clrx1234567890guard1",
    "totpCode": "123456"
  }'
```
**Expected Response**: Guardian activated
```json
{
  "success": true,
  "message": "Guardian activated successfully. HSM partition is now active.",
  "data": {
    "guardianId": "clrx1234567890guard1",
    "role": "CEO",
    "hsmActivated": true,
    "activatedAt": "2024-12-14T10:30:00Z"
  }
}
```

### **Get Guardian Statistics**
```bash
curl -X GET http://localhost:3001/api/guardians/stats/overview \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected Response**: System statistics
```json
{
  "success": true,
  "data": {
    "guardians": {
      "total": 3,
      "active": 3,
      "verified": 3,
      "hsmActivated": 3,
      "completionRate": 100
    },
    "approvals": {
      "total": 126,
      "avgPerGuardian": 42
    },
    "systemHealth": {
      "minGuardiansAvailable": true,
      "activeCount": 3,
      "minimumRequired": 2,
      "roles": ["CEO", "CFO", "CTO"]
    }
  }
}
```

---

## 💰 **3. WALLET ENDPOINTS (BIP32 HD Hierarchy)**

### **Get Hot Wallet (5% funds, m/0'/0')**
```bash
curl -X GET http://localhost:3001/api/wallets/hot \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected Response**: Hot wallet details
```json
{
  "success": true,
  "data": {
    "id": "clrx1234567890wallet2",
    "publicKey": "GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM",
    "derivationPath": "m/0'/0'",
    "walletType": "HOT",
    "balance": "5000.0000000",
    "reservedBalance": "100.0000000",
    "hsmKeyName": "stellar_custody_hot_m_0_0",
    "hsmPartitionId": "user_abc123def456",
    "isHSMProtected": true,
    "requiresTOTP": false,
    "parentWallet": {
      "id": "clrx1234567890wallet1",
      "publicKey": "GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI",
      "walletType": "COLD"
    },
    "percentage": 5.0
  }
}
```

### **Get Cold Wallet (95% funds, m/0')**
```bash
curl -X GET http://localhost:3001/api/wallets/cold \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected Response**: Cold wallet details
```json
{
  "success": true,
  "data": {
    "id": "clrx1234567890wallet1",
    "publicKey": "GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI",
    "derivationPath": "m/0'",
    "walletType": "COLD",
    "balance": "95000.0000000",
    "requiresTOTP": true,
    "childWallets": [
      {
        "id": "clrx1234567890wallet2",
        "publicKey": "GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM",
        "walletType": "HOT"
      }
    ],
    "percentage": 95.0
  }
}
```

### **Get Complete Balance Overview**
```bash
curl -X GET http://localhost:3001/api/wallets/balances \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected Response**: Complete hierarchy balance
```json
{
  "success": true,
  "data": {
    "total": "100000.0000000",
    "cold": {
      "balance": "95000.0000000",
      "percentage": 95.0,
      "address": "GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI",
      "derivationPath": "m/0'"
    },
    "hot": {
      "balance": "5000.0000000",
      "percentage": 5.0,
      "address": "GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM",
      "derivationPath": "m/0'/0'",
      "parentAddress": "GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI"
    },
    "needsRebalancing": false
  }
}
```

### **Rebalance Wallets (95%/5%)**
```bash
curl -X POST http://localhost:3001/api/wallets/rebalance \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-TOTP-Code: 123456" \
  -H "Content-Type: application/json" \
  -d '{
    "guardianId": "clrx1234567890guard1",
    "totpCode": "123456",
    "forceRebalance": false
  }'
```
**Expected Response**: Rebalancing result
```json
{
  "success": true,
  "data": {
    "success": true,
    "amountMoved": "1000.0000000",
    "direction": "HOT_TO_COLD",
    "newBalances": {
      "hot": { "balance": "5000.0000000", "percentage": 5.0 },
      "cold": { "balance": "95000.0000000", "percentage": 95.0 }
    }
  },
  "message": "Rebalancing completed: 1000.0000000 XLM moved HOT to COLD"
}
```

---

## 💰 **4. TRANSACTION ENDPOINTS (Multi-Sig)**

### **Create Transaction (Low Value - 2-of-3)**
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromWalletId": "clrx1234567890wallet2",
    "toAddress": "GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF",
    "amount": "500.0000000",
    "memo": "Low value payment",
    "txType": "PAYMENT"
  }'
```
**Expected Response**: Transaction created (may auto-execute)
```json
{
  "success": true,
  "data": {
    "transactionId": "clrx1234567890trans1",
    "requiresApproval": false,
    "thresholdScheme": {
      "type": "LOW_VALUE_2_OF_3",
      "threshold": 2,
      "totalParties": 3,
      "challengeRequired": false
    },
    "status": "SUCCESS"
  },
  "message": "Transaction created and executed automatically."
}
```

### **Create High-Value Transaction (2-of-3 with OCRA)**
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromWalletId": "clrx1234567890wallet2",
    "toAddress": "GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF",
    "amount": "5000.0000000",
    "memo": "High value payment",
    "txType": "PAYMENT"
  }'
```
**Expected Response**: Transaction awaiting approval + challenge
```json
{
  "success": true,
  "data": {
    "transactionId": "clrx1234567890trans2",
    "requiresApproval": true,
    "thresholdScheme": {
      "type": "HIGH_VALUE_2_OF_3",
      "threshold": 2,
      "totalParties": 3,
      "challengeRequired": true
    },
    "challenge": {
      "challengeHash": "A1B2C3D4E5F6G7H8",
      "expiresAt": "2024-12-14T10:35:00Z",
      "transactionData": {
        "amount": "5000.0000000",
        "toAddress": "GABCD1234567890EFGH...",
        "txType": "PAYMENT"
      }
    },
    "status": "AWAITING_APPROVAL",
    "notificationsSent": true
  },
  "message": "Transaction created. WhatsApp notifications sent to guardians."
}
```

### **Create Critical Transaction from Cold Wallet (3-of-3)**
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromWalletId": "clrx1234567890wallet1",
    "toAddress": "GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF",
    "amount": "15000.0000000",
    "memo": "Critical cold wallet transaction",
    "txType": "WITHDRAWAL"
  }'
```
**Expected Response**: Critical transaction + enhanced WhatsApp
```json
{
  "success": true,
  "data": {
    "transactionId": "clrx1234567890trans3",
    "requiresApproval": true,
    "thresholdScheme": {
      "type": "CRITICAL_3_OF_3",
      "threshold": 3,
      "totalParties": 3,
      "challengeRequired": true
    },
    "challenge": {
      "challengeHash": "X9Y8Z7W6V5U4T3S2",
      "expiresAt": "2024-12-14T10:35:00Z"
    },
    "status": "AWAITING_APPROVAL"
  },
  "message": "Critical transaction created. Enhanced WhatsApp notifications sent with TOTP images."
}
```

### **Approve Transaction (OCRA-like)**
```bash
curl -X POST http://localhost:3001/api/transactions/clrx1234567890trans2/approve \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-Challenge-Response: 123456" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "clrx1234567890trans2",
    "guardianId": "clrx1234567890guard1",
    "challengeResponse": "123456",
    "authMethod": "OCRA_LIKE"
  }'
```
**Expected Response**: Approval recorded
```json
{
  "success": true,
  "data": {
    "approved": true,
    "signature": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
    "executionReady": false,
    "remainingApprovals": 1,
    "authMethod": "OCRA_LIKE",
    "approvedBy": "CEO",
    "approvedAt": "2024-12-14T10:30:00Z"
  },
  "message": "Transaction approved. 1 more approval(s) needed."
}
```

### **Approve Transaction (TOTP Fallback)**
```bash
curl -X POST http://localhost:3001/api/transactions/clrx1234567890trans2/approve \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-TOTP-Code: 654321" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "clrx1234567890trans2",
    "guardianId": "clrx1234567890guard2",
    "totpCode": "654321",
    "authMethod": "TOTP_FALLBACK"
  }'
```
**Expected Response**: Transaction executed + success notifications
```json
{
  "success": true,
  "data": {
    "approved": true,
    "signature": "x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4...",
    "executionReady": true,
    "remainingApprovals": 0,
    "authMethod": "TOTP_FALLBACK",
    "approvedBy": "CFO"
  },
  "message": "Transaction approved and executed successfully. Success notifications sent!"
}
```

### **List Transactions (with pagination)**
```bash
curl -X GET "http://localhost:3001/api/transactions?status=SUCCESS&page=1&limit=10" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected Response**: Paginated transaction list
```json
{
  "success": true,
  "data": [
    {
      "id": "clrx1234567890trans1",
      "stellarHash": "a1b2c3d4e5f6g7h8...",
      "fromWallet": {
        "publicKey": "GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM",
        "walletType": "HOT",
        "derivationPath": "m/0'/0'"
      },
      "toAddress": "GABCD1234567890EFGH...",
      "amount": "5000.0000000",
      "status": "SUCCESS",
      "txType": "PAYMENT",
      "approvals": [
        {
          "guardianRole": "CEO",
          "approvedAt": "2024-12-14T10:25:00Z"
        },
        {
          "guardianRole": "CFO", 
          "approvedAt": "2024-12-14T10:30:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "totalPages": 16,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### **Get Transaction Details**
```bash
curl -X GET http://localhost:3001/api/transactions/clrx1234567890trans1 \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected Response**: Complete transaction details
```json
{
  "success": true,
  "data": {
    "id": "clrx1234567890trans1",
    "stellarHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "fromWallet": {
      "id": "clrx1234567890wallet2",
      "publicKey": "GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM",
      "walletType": "HOT",
      "derivationPath": "m/0'/0'"
    },
    "toAddress": "GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF",
    "amount": "5000.0000000",
    "memo": "High value payment",
    "status": "SUCCESS",
    "txType": "PAYMENT",
    "requiresApproval": true,
    "requiredApprovals": 2,
    "approvals": [
      {
        "guardianRole": "CEO",
        "approvedAt": "2024-12-14T10:25:00Z"
      },
      {
        "guardianRole": "CFO",
        "approvedAt": "2024-12-14T10:30:00Z"
      }
    ],
    "createdAt": "2024-12-14T10:20:00Z",
    "executedAt": "2024-12-14T10:30:00Z"
  }
}
```

---

## 🎯 **5. CHALLENGE ENDPOINTS (OCRA-like)**

### **Generate Challenge for Transaction**
```bash
curl -X POST http://localhost:3001/api/transactions/challenges/generate \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "clrx1234567890trans2"
  }'
```
**Expected Response**: Challenge generated
```json
{
  "success": true,
  "data": {
    "challengeHash": "A1B2C3D4E5F6G7H8",
    "expiresAt": "2024-12-14T10:35:00Z",
    "transactionData": {
      "amount": "5000.0000000",
      "toAddress": "GABCD1234567890EFGH...",
      "txType": "PAYMENT"
    },
    "instructions": [
      "1. Open your Authenticator App",
      "2. Add the challenge code manually",
      "3. Enter challenge: A1B2C3D4E5F6G7H8",
      "4. Submit the generated 6-digit code"
    ]
  },
  "message": "Challenge generated successfully. Valid for 5 minutes."
}
```

### **Validate Challenge Response**
```bash
curl -X POST http://localhost:3001/api/transactions/challenges/validate \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "challengeHash": "A1B2C3D4E5F6G7H8",
    "responseCode": "123456",
    "guardianId": "clrx1234567890guard1",
    "transactionId": "clrx1234567890trans2"
  }'
```
**Expected Response**: Validation result
```json
{
  "success": true,
  "data": {
    "valid": true,
    "authMethod": "OCRA_LIKE",
    "keyReleaseId": "release_abc123def456"
  },
  "message": "Challenge response validated successfully"
}
```

---

## 📊 **6. SYSTEM MONITORING ENDPOINTS**

### **Health Check (Public)**
```bash
curl -X GET http://localhost:3001/health
```
**Expected Response**: System health
```json
{
  "status": "ok",
  "timestamp": "2024-12-14T10:30:00Z",
  "service": "stellar-custody-mvp-backend",
  "version": "1.0.0",
  "environment": "development",
  "mtlsEnabled": false
}
```

### **Transaction Statistics**
```bash
curl -X GET http://localhost:3001/api/transactions/stats/overview \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected Response**: Transaction metrics
```json
{
  "success": true,
  "data": {
    "transactions": {
      "total": 1247,
      "pending": 3,
      "successful": 1198,
      "failed": 46,
      "successRate": 96.1
    },
    "volume": {
      "totalProcessed": "2450000.0000000",
      "last24Hours": "45000.0000000"
    }
  }
}
```

---

## 🔧 **7. POSTMAN COLLECTION SETUP**

### **Environment Variables (for Postman)**
```json
{
  "baseUrl": "http://localhost:3001",
  "sessionToken": "",
  "accessToken": "",
  "guardianId": "clrx1234567890guard1",
  "walletHotId": "clrx1234567890wallet2",
  "walletColdId": "clrx1234567890wallet1",
  "transactionId": "",
  "challengeHash": "",
  "totpCode": "123456"
}
```

### **Headers Template (for all requests)**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}",
  "X-TOTP-Code": "{{totpCode}}",
  "X-Challenge-Response": "{{challengeResponse}}"
}
```

---

## 🧪 **8. TESTING WORKFLOW**

### **Complete Testing Sequence:**

#### **Step 1: Health Check**
```bash
curl http://localhost:3001/health
```

#### **Step 2: Authentication Flow**
```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@stellarcustody.com","password":"password123"}'

# 2. Verify TOTP (use sessionToken from step 1)
curl -X POST http://localhost:3001/api/auth/verify-totp \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"totpCode":"123456"}'
```

#### **Step 3: Guardian Management**
```bash
# 1. Check system
curl -X GET http://localhost:3001/api/guardians/check/minimum \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# 2. Register guardian
curl -X POST http://localhost:3001/api/guardians/register \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-TOTP-Code: 123456" \
  -H "Content-Type: application/json" \
  -d '{...guardian_data...}'

# 3. Get guardians
curl -X GET http://localhost:3001/api/guardians \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### **Step 4: Wallet Operations**
```bash
# 1. Check balances
curl -X GET http://localhost:3001/api/wallets/balances \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# 2. Get hot wallet
curl -X GET http://localhost:3001/api/wallets/hot \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# 3. Get cold wallet
curl -X GET http://localhost:3001/api/wallets/cold \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### **Step 5: Transaction Flow**
```bash
# 1. Create transaction
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{...transaction_data...}'

# 2. Generate challenge (if needed)
curl -X POST http://localhost:3001/api/transactions/challenges/generate \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"transactionId":"clrx1234567890trans2"}'

# 3. Approve transaction
curl -X POST http://localhost:3001/api/transactions/clrx1234567890trans2/approve \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{...approval_data...}'

# 4. Check transaction status
curl -X GET http://localhost:3001/api/transactions/clrx1234567890trans2 \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 📱 **9. WHATSAPP INTEGRATION TESTING**

### **Expected WhatsApp Messages:**

#### **For Cold Wallet Transactions:**
1. **📸 TOTP Image**: From `totp.txt` (base64 image)
2. **🔐 Approval Button**: Enhanced message with challenge
3. **📝 Instructions**: Platform access link

#### **For Success Notifications:**
1. **🎉 Stellar Sticker**: From `avatar-stellar-sticker.txt`
2. **✅ Success Message**: From `success.txt`
3. **🔗 Transaction Details**: Hash + Explorer link

---

## 🔐 **10. ERROR RESPONSES**

### **401 Unauthorized (No JWT)**
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

### **400 Bad Request (Invalid Data)**
```json
{
  "message": ["amount must be a positive number"],
  "error": "Bad Request",
  "statusCode": 400
}
```

### **500 Internal Server Error**
```json
{
  "success": false,
  "error": {
    "code": "HSM_CONNECTION_FAILED",
    "message": "HSM service temporarily unavailable"
  }
}
```

---

## 🎯 **READY FOR TESTING!**

**All endpoints are documented and ready for:**
- ✅ **Postman collection** import
- ✅ **Manual curl testing**
- ✅ **Automated testing scripts**
- ✅ **Integration testing**

**🚀 Start testing with:** `./docker-run.sh up` and access http://localhost:3001/api
