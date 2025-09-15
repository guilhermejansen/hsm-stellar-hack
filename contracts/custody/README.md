# 🚀 Stellar Custody Multi-Sig Smart Contract

A production-ready **2-of-3 multi-signature smart contract** built with Soroban for secure cryptocurrency custody operations on the Stellar network.

🌐 Network: testnet
🚀 Deployer: GDYR3L2QNF7IZ5RXX7Q4MYZNPDI57CETCHNO45DUYDOSVU4OXZFVHNXS
👥 Guardians:
   CEO: GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT
   CFO: GAODJIFVVHOGTISA2JYI4HQLIDAXSAJZI7DKXQBSMOKCYTRUCAXTTJW2
   CTO: GD2YNO7FGCSRO5JCMGJZEH5LNC664DYHMKIBJZPMV3ZXAPEXTBGH6OLK
💰 Wallets:
   Hot:  GCMFYTMZJPDS2ECNYBU5XZ4KE5GHMPX7LYOWQII4TC4XRBO5WSAJDPFM
   Cold: GCVPYOTR4K2KYNXFC4OFRE2ZVC3CZIRUEIIXUJ7FDNZECZ4VYAVZURKI
🔐 HSM Host: 187.33.9.132

ℹ️  Simulating install transaction…
ℹ️  Signing transaction: 3477287f403fd34e5946a5a6f18f640b5cdd29fe34ff623f9cb61f6c0345f32c
🌎 Submitting install transaction…
ℹ️  Using wasm hash a3981c7f28a9797ca163ecee4fc7d99d4c5a7e132a39272c81cd8412cd90c485
ℹ️  Simulating deploy transaction…
ℹ️  Transaction hash is c2177b5c799fe8f8b36cd7c2e630bbd414bb9a8ff81a143015dee0832c75589b
🔗 https://stellar.expert/explorer/testnet/tx/c2177b5c799fe8f8b36cd7c2e630bbd414bb9a8ff81a143015dee0832c75589b
ℹ️  Signing transaction: c2177b5c799fe8f8b36cd7c2e630bbd414bb9a8ff81a143015dee0832c75589b
🌎 Submitting deploy transaction…
🔗 https://stellar.expert/explorer/testnet/contract/CCVEIQKVF6C3G52OJ7TLVIPMJXDZ3ABPLLXQAQVDX2BEZHWUPLFWUYSX
✅ Deployed!
CCVEIQKVF6C3G52OJ7TLVIPMJXDZ3ABPLLXQAQVDX2BEZHWUPLFWUYSX

## 🎯 Features

### Core Multi-Sig Functionality
- ✅ **2-of-3 Guardian Approval**: Requires 2 out of 3 guardians to approve high-value transactions
- ✅ **Hot/Cold Wallet Management**: 95% cold storage, 5% hot wallet for operations
- ✅ **Automatic Thresholds**: Transactions > 1000 XLM require multi-sig approval
- ✅ **Individual Guardian Roles**: CEO, CFO, CTO with different permission levels

### Security Features
- 🔒 **Emergency Shutdown**: Any guardian can freeze all operations
- 🛡️ **Spending Limits**: Daily and monthly limits enforced on-chain
- 📊 **Audit Trail**: Complete transaction history with guardian approvals
- 🔄 **Automatic Rebalancing**: Maintains optimal hot/cold wallet distribution

### Smart Contract Architecture
- ⚡ **Gas Optimized**: Efficient WASM bytecode with minimal storage usage
- 🧪 **Thoroughly Tested**: Comprehensive unit tests covering all scenarios
- 📋 **Well Documented**: Complete API documentation and usage examples
- 🔧 **Easy Integration**: Simple API for backend integration

## 🏗️ Contract Structure

```rust
// Main contract interface
pub struct CustodyContract;

// Core data structures
pub struct Guardian {
    address: Address,
    role: GuardianRole,
    is_active: bool,
    daily_limit: i128,
    monthly_limit: i128,
    approval_count: u32,
}

pub struct Transaction {
    id: u64,
    from_wallet: Address,
    to_address: Address,
    amount: i128,
    status: TxStatus,
    approvals: Vec<Address>,
    requires_approval: bool,
}
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install Stellar CLI
cargo install stellar-cli

# Install Rust WASM target
rustup target add wasm32-unknown-unknown

# Clone and navigate to contract
cd contracts/custody
```

### 1. Build Contract

```bash
./build.sh
```

### 2. Deploy to Testnet

```bash
# Set your deployer secret key
export STELLAR_DEPLOYER_SECRET="SXXX..."

# Deploy contract
./deploy-testnet.sh
```

### 3. Initialize Contract

```bash
# Initialize with test guardians
./initialize-testnet.sh
```

### 4. Run Tests

```bash
# Run unit tests
cargo test

# Run integration tests
./test-contract.sh
```

## 🔧 Contract API

### Core Functions

#### `initialize(guardians, hot_wallet, cold_wallet, system_limits)`
Initialize the contract with 3 guardians and system parameters.

```bash
stellar contract invoke --id CONTRACT_ID --source deployer --network testnet -- \
  initialize \
  --guardians "[{address:'G...', role:'CEO', ...}, ...]" \
  --hot-wallet "GXXX..." \
  --cold-wallet "GYYY..." \
  --system-limits "{daily_limit: 100000, ...}"
```

#### `create_transaction(from_wallet, to_address, amount, memo, tx_type)`
Create a new transaction. High-value transactions require guardian approval.

```bash
stellar contract invoke --id CONTRACT_ID --source user --network testnet -- \
  create_transaction \
  --from_wallet "GXXX..." \
  --to_address "GYYY..." \
  --amount 5000 \
  --memo "payment" \
  --tx_type "Payment"
```

#### `approve_transaction(guardian, tx_id)`
Guardian approves a pending transaction.

```bash
stellar contract invoke --id CONTRACT_ID --source guardian --network testnet -- \
  approve_transaction \
  --guardian "GXXX..." \
  --tx_id 1
```

### Query Functions

#### `get_transaction(tx_id)` → `Transaction`
Get transaction details by ID.

#### `get_guardian(guardian_address)` → `Guardian`
Get guardian information.

#### `get_hot_balance()` → `i128`
Get hot wallet balance.

#### `get_cold_balance()` → `i128` 
Get cold wallet balance.

### Emergency Functions

#### `emergency_shutdown(guardian)`
Immediately freeze all contract operations.

#### `disable_emergency_mode(guardians_approval)`
Disable emergency mode (requires 2 guardian approval).

#### `rebalance_wallets(guardian)`
Rebalance hot/cold wallets to maintain 95%/5% ratio.

## 🧪 Testing

### Unit Tests

```bash
cargo test
```

Tests cover:
- Contract initialization
- Transaction creation and approval
- Guardian management
- Emergency procedures
- Wallet rebalancing
- Error handling

### Integration Tests

```bash
./test-contract.sh
```

Tests include:
- End-to-end transaction flow
- Multi-guardian approval process
- Emergency shutdown scenarios
- Balance verification
- Real network interaction

## 🌐 Network Configuration

### Testnet Deployment

```bash
# Deploy to testnet
./deploy-testnet.sh

# Initialize for testing
./initialize-testnet.sh

# Run comprehensive tests
./test-contract.sh
```

### Mainnet Deployment

```bash
# Build optimized version
./build.sh

# Deploy to mainnet (use with caution!)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_custody_contract.wasm \
  --source mainnet_deployer \
  --network mainnet
```

## 📊 System Limits

| Parameter | Default Value | Description |
|-----------|--------------|-------------|
| `daily_limit` | 100,000 XLM | Maximum daily spending |
| `monthly_limit` | 1,000,000 XLM | Maximum monthly spending |
| `high_value_threshold` | 1,000 XLM | Requires multi-sig approval |
| `required_approvals` | 2 | Number of guardian approvals needed |
| `cold_wallet_percentage` | 95% | Percentage in cold storage |
| `hot_wallet_percentage` | 5% | Percentage in hot wallet |

## 🔒 Security Considerations

### Guardian Key Management
- Each guardian should use hardware wallets
- Private keys should never be stored on servers
- Use HSM integration for production deployments

### Emergency Procedures
1. **Immediate Response**: Any guardian can trigger emergency shutdown
2. **Recovery Process**: Requires 2-of-3 guardians to restore operations
3. **Incident Documentation**: All emergency actions are logged on-chain

### Audit Trail
- All transactions are permanently recorded
- Guardian approvals are immutable
- Emergency actions trigger automatic notifications

## 🛠️ Development

### Project Structure

```
contracts/custody/
├── src/
│   ├── lib.rs              # Main contract logic
│   └── bin/main.rs         # CLI interface
├── Cargo.toml              # Dependencies and build config
├── build.sh                # Build script
├── deploy-testnet.sh       # Testnet deployment
├── initialize-testnet.sh   # Contract initialization
├── test-contract.sh        # Integration tests
└── README.md               # This file
```

### Build Configuration

```toml
[profile.release]
opt-level = "z"        # Optimize for size
overflow-checks = true # Security checks
debug = 0              # No debug info
strip = "symbols"      # Remove symbols
panic = "abort"        # Fail fast
codegen-units = 1      # Single compilation unit
lto = true             # Link time optimization
```

## 🤝 Integration

### Backend Integration

```typescript
// Example NestJS service integration
import { SorobanRpc } from '@stellar/stellar-sdk';

@Injectable()
export class SorobanService {
  async approveTransaction(guardianSecret: string, txId: number) {
    const tx = contract.call('approve_transaction', guardian, txId);
    const result = await this.server.sendTransaction(tx);
    return result;
  }
}
```

### Frontend Integration

```typescript
// Example React hook
export function useContractTransaction(txId: number) {
  return useQuery(['transaction', txId], async () => {
    const result = await contract.call('get_transaction', txId);
    return result;
  });
}
```

## 📈 Performance

### Gas Costs (Testnet)
- Contract deployment: ~2M stroops
- Initialize contract: ~500K stroops
- Create transaction: ~100K stroops
- Approve transaction: ~150K stroops
- Emergency shutdown: ~75K stroops

### Storage Usage
- Per guardian: ~200 bytes
- Per transaction: ~300 bytes
- System config: ~100 bytes
- Total optimized for minimal fees

## 🐛 Troubleshooting

### Common Issues

#### "Not Initialized" Error
```bash
# Contract must be initialized first
./initialize-testnet.sh
```

#### "Not A Guardian" Error
```bash
# Verify guardian address is correct
stellar contract invoke --id CONTRACT_ID --source deployer --network testnet -- \
  get_guardian --guardian_address "GXXX..."
```

#### Build Failures
```bash
# Clean and rebuild
cargo clean
./build.sh
```

### Debug Mode

```bash
# Enable debug logging
RUST_LOG=debug cargo test -- --nocapture
```

## 📄 License

This smart contract is part of the Stellar Custody MVP project. All rights reserved.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Submit a pull request

## 📞 Support

For issues and questions:
- Check integration tests: `./test-contract.sh`
- Review contract logs on Stellar Explorer
- Consult the main project documentation

---

**Security Notice**: This is financial infrastructure. Always test thoroughly on testnet before mainnet deployment. Use hardware security modules (HSM) for production guardian keys.

**Ready for production deployment with proper security measures!** 🚀
