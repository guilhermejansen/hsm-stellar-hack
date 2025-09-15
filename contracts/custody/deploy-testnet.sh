#!/bin/bash

# Stellar Custody Smart Contract Testnet Deployment
echo "🌐 Deploying Stellar Custody Contract to Testnet..."

# Configuration
NETWORK="testnet"
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
if [ -z "$STELLAR_DEPLOYER_SECRET" ]; then
    echo "⚠️  STELLAR_DEPLOYER_SECRET environment variable not set."
    echo "Please set your deployer account secret key:"
    echo "export STELLAR_DEPLOYER_SECRET='SXXX...'"
    echo ""
    echo "Or create a new testnet account:"
    echo "stellar keys generate deployer --network testnet --fund"
    exit 1
fi

echo "🔑 Using deployer account..."

# Deploy the contract
echo "🚀 Deploying contract to Stellar testnet..."
CONTRACT_ADDRESS=$(stellar contract deploy \
    --wasm "$WASM_FILE" \
    --source deployer \
    --network "$NETWORK" \
    --network-passphrase "Test SDF Network ; September 2015" \
    2>&1)

# Check deployment result
if [[ $CONTRACT_ADDRESS == *"C"* ]]; then
    echo "✅ Contract deployed successfully!"
    echo "📋 Contract Address: $CONTRACT_ADDRESS"
    
    # Save contract address to file
    echo "$CONTRACT_ADDRESS" > contract-address-testnet.txt
    echo "💾 Contract address saved to contract-address-testnet.txt"
    
    echo ""
    echo "🎯 Next steps:"
    echo "1. Initialize contract: ./initialize-testnet.sh"
    echo "2. Test contract functions: cargo test"
    echo "3. Verify on Stellar Explorer:"
    echo "   https://stellar.expert/explorer/testnet/contract/$CONTRACT_ADDRESS"
    
    echo ""
    echo "📚 Contract Features Deployed:"
    echo "- ✅ Multi-sig 2-of-3 approval system"
    echo "- ✅ Hot/Cold wallet management"
    echo "- ✅ Daily/Monthly spending limits"
    echo "- ✅ Guardian role management"
    echo "- ✅ Emergency shutdown procedures"
    echo "- ✅ Automatic rebalancing"
    
else
    echo "❌ Deployment failed!"
    echo "Error: $CONTRACT_ADDRESS"
    exit 1
fi
