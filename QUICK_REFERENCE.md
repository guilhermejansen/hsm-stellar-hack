# ⚡ Stellar Custody MVP - Quick Reference

## 🚀 Quick Commands

### Initial Setup
```bash
# Clone and install
git clone [repo]
cd stellar-custody-mvp
npm install

# Start services
docker-compose up -d

# Setup database
npm run db:migrate
npm run db:studio
```

### Development
```bash
# Start everything
npm run dev

# Individual services
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:3000

# Testing
npm test
npm run test:e2e
```

### Production
```bash
# Build
npm run build

# Deploy
docker-compose -f docker-compose.prod.yml up
```

## 🔑 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://stellar:stellar_secure_2024@localhost:5432/stellar_custody"

# HSM
HSM_HOST="localhost"
HSM_PORT="4433"
HSM_USERNAME="master"
HSM_PASSWORD="master123"

# Stellar
STELLAR_NETWORK="testnet"
STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"

# WhatsApp
WHATSAPP_TOKEN="!!qYWdJ61zk3i1AvTfXhzE!!"
WHATSAPP_API_URL="https://api.zuckzapgo.com"

# Security
JWT_SECRET="change_in_production"
ENCRYPTION_KEY="32_byte_hex_key"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## 📱 WhatsApp API Examples

### Send Text
```bash
curl -X POST https://api.zuckzapgo.com/chat/send/text \
  -H "Content-Type: application/json" \
  -H "token: !!qYWdJ61zk3i1AvTfXhzE!!" \
  -d '{
    "Phone": "5521999999999",
    "Body": "Test message"
  }'
```

### Send Button
```bash
curl -X POST https://api.zuckzapgo.com/chat/send/buttons \
  -H "Content-Type: application/json" \
  -H "token: !!qYWdJ61zk3i1AvTfXhzE!!" \
  -d '{
    "phone": "5521999999999",
    "title": "Approval Required",
    "body": "Transaction needs approval",
    "buttons": [{
      "buttonId": "approve",
      "buttonText": { "displayText": "Approve" },
      "type": "cta_url",
      "url": "https://app.com/approve/123"
    }]
  }'
```

## 🌟 Stellar Operations

### Create Account (Testnet)
```bash
# Using friendbot
curl "https://friendbot.stellar.org?addr=GXXXXX..."
```

### Check Balance
```javascript
const account = await server.loadAccount(publicKey);
account.balances.forEach(balance => {
  console.log(`${balance.asset_type}: ${balance.balance}`);
});
```

## 🔐 HSM Commands

### Test Connection
```javascript
const hsm = new HSMClient({
  host: 'localhost',
  port: 4433,
  username: 'master',
  password: 'master123'
});

await hsm.connect();
console.log('HSM connected!');
```

### Create Key
```javascript
const key = await hsm.generateKey({
  algorithm: 'ED25519',
  exportable: false,
  label: 'stellar_key_001'
});
```

## 📊 Database Queries

### Get Pending Approvals
```sql
SELECT t.*, COUNT(a.id) as approval_count
FROM transactions t
LEFT JOIN approvals a ON t.id = a.transaction_id
WHERE t.status = 'AWAITING_APPROVAL'
GROUP BY t.id;
```

### Guardian Stats
```sql
SELECT 
  g.role,
  g.total_approvals,
  g.last_approval_at,
  u.name
FROM guardians g
JOIN users u ON g.user_id = u.id
WHERE g.is_active = true;
```

## 🚨 Emergency Procedures

### Disable All Guardians
```javascript
await prisma.guardian.updateMany({
  data: { isActive: false }
});
```

### Lock HSM
```javascript
await hsm.lockAllKeys();
```

### Emergency Recovery
```bash
npm run emergency:recovery -- --admin-code=XXXX
```

## 📋 Testing Checklist

### Unit Tests
- [ ] Guardian registration
- [ ] TOTP generation/validation
- [ ] Transaction creation
- [ ] Approval logic
- [ ] HSM operations

### E2E Tests
- [ ] Complete guardian flow
- [ ] Transaction approval (2-of-3)
- [ ] WhatsApp notifications
- [ ] Emergency recovery

### Security Tests
- [ ] SQL injection
- [ ] XSS prevention
- [ ] Rate limiting
- [ ] TOTP replay

## 🎯 Troubleshooting

### HSM Connection Failed
```bash
# Check HSM status
telnet localhost 4433

# Restart HSM simulator
docker-compose restart hsm-simulator
```

### WhatsApp Not Sending
```bash
# Test API token
curl -H "token: !!qYWdJ61zk3i1AvTfXhzE!!" \
  https://api.zuckzapgo.com/status
```

### Database Issues
```bash
# Reset database
npm run db:reset

# Check migrations
npx prisma migrate status
```

## 📱 Guardian Test Accounts

### Development Guardians
```
CEO:
- Email: ceo@test.com
- Password: Test@123
- Phone: +5521999999901

CFO:
- Email: cfo@test.com
- Password: Test@123
- Phone: +5521999999902

CTO:
- Email: cto@test.com
- Password: Test@123
- Phone: +5521999999903
```

---

**Keep this reference handy during development!**
