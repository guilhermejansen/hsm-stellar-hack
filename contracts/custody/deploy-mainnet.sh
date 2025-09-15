#!/bin/bash

# Stellar Custody Smart Contract Mainnet Deployment
# ⚠️ WARNING: This deploys to MAINNET with real XLM!

echo "🚨 MAINNET DEPLOYMENT WARNING 🚨"
echo "================================="
echo ""
echo "You are about to deploy to the Stellar MAINNET."
echo "This will use real XLM and cannot be undone."
echo ""
echo "Please ensure:"
echo "- ✅ Contract has been thoroughly tested on testnet"
echo "- ✅ All unit tests pass"
echo "- ✅ Integration tests pass"
echo "- ✅ Security audit is complete"
echo "- ✅ Guardian keys are secured with HSM"
echo "- ✅ Environment variables are set correctly"
echo ""

# Configuration
NETWORK="mainnet"
WASM_FILE="target/wasm32-unknown-unknown/release/stellar_custody_contract.wasm"

# Check if WASM file exists
if [ ! -f "$WASM_FILE" ]; then
    echo "❌ WASM file not found. Running build first..."
    ./build.sh
    
    if [ ! -f "$WASM_FILE" ]; then
        echo "❌ Build failed. Cannot deploy."
        exit 1
    fi
fi

# Check if deployer account is configured
if [ -z "$STELLAR_MAINNET_SECRET" ]; then
    echo "❌ STELLAR_MAINNET_SECRET environment variable not set."
    echo ""
    echo "Please set your mainnet deployer account secret key:"
    echo "export STELLAR_MAINNET_SECRET='SXXX...'"
    echo ""
    echo "⚠️ SECURITY WARNING:"
    echo "- Use a dedicated deployer account"
    echo "- Store secret key securely (HSM recommended)"
    echo "- Do not commit secret keys to version control"
    exit 1
fi

# Verify deployer account has sufficient balance
echo "💰 Checking deployer account balance..."
DEPLOYER_PUBLIC=$(stellar keys address mainnet_deployer 2>/dev/null || echo "unknown")
if [ "$DEPLOYER_PUBLIC" = "unknown" ]; then
    echo "❌ Mainnet deployer key not found."
    echo "Add your deployer key: stellar keys add mainnet_deployer --secret-key"
    exit 1
fi

BALANCE=$(stellar account balance mainnet_deployer --network mainnet 2>/dev/null | grep "XLM" | head -1 | awk '{print $1}' || echo "0")
MIN_BALANCE="10"

if (( $(echo "$BALANCE < $MIN_BALANCE" | bc -l) )); then
    echo "❌ Insufficient balance for deployment."
    echo "Current balance: $BALANCE XLM"
    echo "Minimum required: $MIN_BALANCE XLM"
    echo "Please fund your deployer account: $DEPLOYER_PUBLIC"
    exit 1
fi

echo "✅ Deployer balance: $BALANCE XLM"

# Final confirmation
echo ""
echo "🔍 Final Deployment Details:"
echo "=============================="
echo "Network: MAINNET"
echo "Deployer: $DEPLOYER_PUBLIC"
echo "Balance: $BALANCE XLM"
echo "Contract: stellar_custody_contract.wasm"
echo "Size: $(du -h $WASM_FILE | cut -f1)"
echo ""

read -p "❓ Type 'DEPLOY TO MAINNET' to confirm deployment: " confirmation

if [ "$confirmation" != "DEPLOY TO MAINNET" ]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo ""
echo "🚀 Deploying to Stellar MAINNET..."
echo "This may take 30-60 seconds..."

# Deploy the contract
CONTRACT_ADDRESS=$(stellar contract deploy \
    --wasm "$WASM_FILE" \
    --source mainnet_deployer \
    --network "$NETWORK" \
    --fee 1000000 \
    2>&1)

# Check deployment result
if [[ $CONTRACT_ADDRESS == *"C"* ]]; then
    echo ""
    echo "✅ CONTRACT DEPLOYED TO MAINNET! ✅"
    echo "==================================="
    echo ""
    echo "📋 Contract Address: $CONTRACT_ADDRESS"
    
    # Save contract address to file
    echo "$CONTRACT_ADDRESS" > contract-address-mainnet.txt
    echo "💾 Contract address saved to contract-address-mainnet.txt"
    
    # Create deployment record
    cat > mainnet-deployment-$(date +%Y%m%d_%H%M%S).json << EOF
{
    "contract_address": "$CONTRACT_ADDRESS",
    "network": "mainnet",
    "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "deployer_address": "$DEPLOYER_PUBLIC",
    "deployer_balance": "$BALANCE",
    "wasm_file": "$WASM_FILE",
    "wasm_size": "$(stat -f%z $WASM_FILE 2>/dev/null || stat -c%s $WASM_FILE)",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "contract_features": [
        "Multi-sig 2-of-3 approval system",
        "Hot/Cold wallet management (5%/95%)",
        "Daily and monthly spending limits",
        "Guardian role management",
        "Emergency shutdown procedures",
        "Automatic rebalancing"
    ]
}
EOF
    
    echo "📋 Deployment record created"
    
    echo ""
    echo "🎯 IMPORTANT NEXT STEPS:"
    echo "========================"
    echo ""
    echo "1. 🔐 SECURE THE CONTRACT ADDRESS"
    echo "   - Store $CONTRACT_ADDRESS securely"
    echo "   - Add to your production environment variables"
    echo ""
    echo "2. ⚙️ INITIALIZE THE CONTRACT"
    echo "   - Create initialize-mainnet.sh script"
    echo "   - Use REAL guardian addresses with HSM protection"
    echo "   - Set production wallet addresses"
    echo ""
    echo "3. 🧪 VERIFY DEPLOYMENT"
    echo "   - Check on Stellar Expert:"
    echo "     https://stellar.expert/explorer/public/contract/$CONTRACT_ADDRESS"
    echo ""
    echo "4. 🔒 SECURITY CHECKLIST"
    echo "   - ✅ Guardian keys secured with HSM"
    echo "   - ✅ Deployer key rotated/secured"
    echo "   - ✅ Contract address in secure storage"
    echo "   - ✅ Monitoring alerts configured"
    echo "   - ✅ Emergency procedures documented"
    echo ""
    echo "5. 📊 MONITORING SETUP"
    echo "   - Set up transaction monitoring"
    echo "   - Configure guardian alert system"
    echo "   - Monitor contract interactions"
    echo ""
    echo "🚨 CRITICAL REMINDERS:"
    echo "- This is PRODUCTION financial infrastructure"
    echo "- Test all operations before high-value transactions"
    echo "- Keep guardian keys in HSM at all times"
    echo "- Document all emergency procedures"
    echo ""
    echo "🎉 Deployment successful! Contract is live on Stellar mainnet."
    
else
    echo ""
    echo "❌ DEPLOYMENT FAILED!"
    echo "===================="
    echo ""
    echo "Error details:"
    echo "$CONTRACT_ADDRESS"
    echo ""
    echo "Common issues:"
    echo "- Insufficient balance for deployment fees"
    echo "- Network connectivity problems" 
    echo "- Invalid contract WASM"
    echo "- Stellar network congestion"
    echo ""
    echo "Please resolve the issue and try again."
    exit 1
fi
