#!/bin/bash

# Initialize Stellar Custody Contract on Testnet
echo "⚙️  Initializing Stellar Custody Contract..."

# Check if contract address exists
if [ ! -f "contract-address-testnet.txt" ]; then
    echo "❌ Contract address not found. Deploy first with ./deploy-testnet.sh"
    exit 1
fi

CONTRACT_ADDRESS=$(cat contract-address-testnet.txt)
echo "📋 Contract Address: $CONTRACT_ADDRESS"

# Check environment variables
if [ -z "$STELLAR_DEPLOYER_SECRET" ]; then
    echo "❌ STELLAR_DEPLOYER_SECRET environment variable not set."
    exit 1
fi

# Create test guardian addresses (you should replace these with real guardian addresses)
echo "🔑 Creating test guardian accounts..."

# Use existing guardian accounts
GUARDIAN_CEO=$GUARDIAN_1_ADDRESS
GUARDIAN_CFO=$GUARDIAN_2_ADDRESS
GUARDIAN_CTO=$GUARDIAN_3_ADDRESS

# Use existing wallet addresses
HOT_WALLET=$HOT_WALLET_ADDRESS
COLD_WALLET=$COLD_WALLET_ADDRESS

echo "👥 Test Guardians Created:"
echo "   CEO: $GUARDIAN_CEO"
echo "   CFO: $GUARDIAN_CFO" 
echo "   CTO: $GUARDIAN_CTO"
echo ""
echo "💰 Wallets Created:"
echo "   Hot Wallet: $HOT_WALLET"
echo "   Cold Wallet: $COLD_WALLET"

# Initialize contract with guardians
echo ""
echo "🚀 Initializing contract with guardians..."

# Create guardian data structure (simplified for script)
INIT_RESULT=$(stellar contract invoke \
    --id "$CONTRACT_ADDRESS" \
    --source deployer \
    --network testnet \
    --network-passphrase "Test SDF Network ; September 2015" \
    -- \
    initialize \
    --guardians "[
        {
            \"address\": \"$GUARDIAN_CEO\",
            \"role\": \"CEO\",
            \"is_active\": true,
            \"daily_limit\": 100000,
            \"monthly_limit\": 1000000,
            \"approval_count\": 0,
            \"last_approval\": 0
        },
        {
            \"address\": \"$GUARDIAN_CFO\",
            \"role\": \"CFO\",
            \"is_active\": true,
            \"daily_limit\": 100000,
            \"monthly_limit\": 1000000,
            \"approval_count\": 0,
            \"last_approval\": 0
        },
        {
            \"address\": \"$GUARDIAN_CTO\",
            \"role\": \"CTO\",
            \"is_active\": true,
            \"daily_limit\": 100000,
            \"monthly_limit\": 1000000,
            \"approval_count\": 0,
            \"last_approval\": 0
        }
    ]" \
    --hot-wallet "$HOT_WALLET" \
    --cold-wallet "$COLD_WALLET" \
    --system-limits "{
        \"daily_limit\": 100000,
        \"monthly_limit\": 1000000,
        \"high_value_threshold\": 1000,
        \"required_approvals\": 2,
        \"cold_wallet_percentage\": 95,
        \"hot_wallet_percentage\": 5
    }" \
    2>&1)

if [[ $INIT_RESULT == *"success"* ]] || [[ $INIT_RESULT == *"null"* ]]; then
    echo "✅ Contract initialized successfully!"
    
    # Save configuration to file
    cat > contract-config-testnet.json << EOF
{
    "contract_address": "$CONTRACT_ADDRESS",
    "network": "testnet",
    "guardians": {
        "ceo": "$GUARDIAN_CEO",
        "cfo": "$GUARDIAN_CFO",
        "cto": "$GUARDIAN_CTO"
    },
    "wallets": {
        "hot": "$HOT_WALLET",
        "cold": "$COLD_WALLET"
    },
    "system_limits": {
        "daily_limit": 100000,
        "monthly_limit": 1000000,
        "high_value_threshold": 1000,
        "required_approvals": 2,
        "cold_wallet_percentage": 95,
        "hot_wallet_percentage": 5
    },
    "initialized_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    echo "💾 Configuration saved to contract-config-testnet.json"
    echo ""
    echo "🎯 Contract is ready! You can now:"
    echo "1. Create test transactions"
    echo "2. Test guardian approvals"
    echo "3. Test emergency procedures"
    echo "4. Test wallet rebalancing"
    echo ""
    echo "📚 Example commands:"
    echo "stellar contract invoke --id $CONTRACT_ADDRESS --source guardian1 --network testnet --network-passphrase \"Test SDF Network ; September 2015\" -- get_hot_balance"
    echo "stellar contract invoke --id $CONTRACT_ADDRESS --source guardian1 --network testnet --network-passphrase \"Test SDF Network ; September 2015\" -- get_cold_balance"
    
else
    echo "❌ Initialization failed!"
    echo "Error: $INIT_RESULT"
    exit 1
fi
