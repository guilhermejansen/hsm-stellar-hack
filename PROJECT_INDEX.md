# 🚀 Stellar Custody MVP - Complete Project Index

## 📁 Project Structure Overview

```
stellar-custody-mvp/
├── .cursor/
│   └── rules/                    # AI Development Rules
│       ├── index.mdc            # Master index (always applied)
│       ├── stellar-custody-mvp.mdc # Main specification
│       ├── setup.mdc            # Quick start guide
│       ├── schema.mdc           # Database models
│       ├── api-integrations.mdc # External APIs
│       ├── security-practices.mdc # Security standards
│       └── README.md            # Rules documentation
│
├── apps/
│   ├── backend/                 # NestJS API
│   │   ├── src/
│   │   │   ├── guardians/      # Guardian management
│   │   │   ├── stellar/        # Blockchain integration
│   │   │   ├── hsm/            # HSM DINAMO
│   │   │   ├── whatsapp/       # Notifications
│   │   │   ├── auth/           # TOTP/Auth
│   │   │   ├── transactions/   # Transaction logic
│   │   │   ├── soroban/        # Smart contracts
│   │   │   ├── recovery/       # Emergency system
│   │   │   └── monitoring/     # Health checks
│   │   └── prisma/
│   │       └── schema.prisma   # Database schema
│   │
│   └── frontend/               # Next.js 15
│       ├── app/
│       │   ├── (auth)/         # Login/Register
│       │   ├── dashboard/      # Main dashboard
│       │   ├── guardians/      # Guardian UI
│       │   └── approve/        # Approval UI
│       └── components/
│           ├── wallet/         # Wallet components
│           ├── guardians/      # Guardian components
│           └── transactions/   # Transaction components
│
├── packages/
│   └── shared/                 # Shared types/utils
│
├── contracts/
│   └── custody/                # Soroban (Rust)
│
├── scripts/                    # Utility scripts
├── docs/                       # Documentation
│   └── HSM_SETUP.md           # HSM configuration
│
└── docker-compose.yml          # Container setup
```

## 🎯 Core Features

### 1. Multi-Signature System (2-of-3)
- **3 Human Guardians**: CEO, CFO, CTO
- **2 Approvals Required**: For transactions > 1000 XLM
- **Individual TOTP**: Each guardian has unique authenticator

### 2. Security Architecture
- **HSM DINAMO**: All private keys in hardware module
- **No Key Export**: Keys never leave HSM
- **Audit Trail**: Every action logged

### 3. WhatsApp Integration
- **API**: ZuckZapGo (Token: `!!qYWdJ61zk3i1AvTfXhzE!!`)
- **Notifications**: Real-time approval requests
- **Buttons**: One-click approval links
- **Stickers**: Success confirmations

### 4. Wallet Management
- **Hot Wallet**: 5% for operations
- **Cold Wallet**: 95% for storage
- **Auto-Rebalancing**: Via smart contract

## 📚 AI Development Rules

The AI agent has complete context through interconnected rules:

1. **[index.mdc](.cursor/rules/index.mdc)** - Start here for overview
2. **[stellar-custody-mvp.mdc](.cursor/rules/stellar-custody-mvp.mdc)** - Technical specifications
3. **[schema.mdc](.cursor/rules/schema.mdc)** - Database models
4. **[api-integrations.mdc](.cursor/rules/api-integrations.mdc)** - External services
5. **[security-practices.mdc](.cursor/rules/security-practices.mdc)** - Security requirements
6. **[setup.mdc](.cursor/rules/setup.mdc)** - Quick start guide

## 🔄 Development Workflow

### Phase 1: Infrastructure
```bash
# 1. Initialize project
npm init -y

# 2. Setup Docker
docker-compose up -d

# 3. Configure environment
cp .env.example .env
```

### Phase 2: Backend Development
```bash
# 1. Setup NestJS
cd apps/backend
nest new . --package-manager npm

# 2. Install dependencies
npm install @stellar/stellar-sdk @dinamonetworks/hsm-dinamo prisma @prisma/client

# 3. Run migrations
npx prisma migrate dev
```

### Phase 3: Frontend Development
```bash
# 1. Setup Next.js
cd apps/frontend
npx create-next-app@latest . --typescript --tailwind --app

# 2. Install UI components
npx shadcn-ui@latest init
npx shadcn-ui@latest add card button tabs input
```

## 🚨 Critical Requirements

1. **Security First**
   - Private keys ONLY in HSM
   - TOTP for all approvals
   - Complete audit logging

2. **Multi-Sig Logic**
   - 2-of-3 guardians required
   - WhatsApp notifications mandatory
   - On-chain enforcement via Soroban

3. **Error Handling**
   - Graceful degradation
   - User-friendly messages
   - Automatic recovery

## 📋 Implementation Checklist

- [ ] **Phase 1**: Core Setup
  - [ ] Monorepo structure
  - [ ] Docker environment
  - [ ] Prisma schema
  - [ ] HSM connection
  - [ ] Stellar testnet

- [ ] **Phase 2**: Guardian System
  - [ ] Registration flow
  - [ ] TOTP generation
  - [ ] WhatsApp service
  - [ ] Dashboard UI

- [ ] **Phase 3**: Transactions
  - [ ] Creation API
  - [ ] Approval logic
  - [ ] TOTP validation
  - [ ] Execution flow

- [ ] **Phase 4**: Smart Contract
  - [ ] Soroban contract
  - [ ] Deploy testnet
  - [ ] Integration test

- [ ] **Phase 5**: Security
  - [ ] Emergency recovery
  - [ ] Daily backups
  - [ ] Monitoring
  - [ ] Rate limiting

- [ ] **Phase 6**: Production
  - [ ] E2E tests
  - [ ] Security audit
  - [ ] CI/CD pipeline
  - [ ] Deployment

## 🔗 Quick Links

- **Stellar Docs**: https://developers.stellar.org
- **Soroban Docs**: https://soroban.stellar.org
- **WhatsApp API**: https://api.zuckzapgo.com
- **HSM Setup**: [docs/HSM_SETUP.md](docs/HSM_SETUP.md)

## 💡 Development Tips

1. **Always check rules**: Start with `.cursor/rules/index.mdc`
2. **Security priority**: When in doubt, choose secure option
3. **Test on testnet**: Never use mainnet for development
4. **Log everything**: Comprehensive audit trail required
5. **HSM required**: System won't work without HSM

---

**The AI agent has everything needed to build this system. All specifications, code examples, and security requirements are documented in the Cursor rules!**
