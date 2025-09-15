#!/bin/bash

# Basic Contract Tests for Stellar Custody MVP
echo "🧪 Testing Stellar Custody Contract Basic Functions..."

# Configuration
CONTRACT_ID=CCVEIQKVF6C3G52OJ7TLVIPMJXDZ3ABPLLXQAQVDX2BEZHWUPLFWUYSX
NETWORK="testnet"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

echo "📋 Contract ID: $CONTRACT_ID"
echo "🌐 Network: $NETWORK"
echo ""

# Test 1: Check if contract exists
echo "🔍 Test 1: Checking contract deployment..."
CONTRACT_INFO=$(stellar contract info meta --id $CONTRACT_ID --network $NETWORK --network-passphrase "$NETWORK_PASSPHRASE" 2>&1)

if [[ $CONTRACT_INFO == *"Error"* ]]; then
    echo "❌ Contract not found or not accessible"
    echo "Error: $CONTRACT_INFO"
    exit 1
else
    echo "✅ Contract is deployed and accessible"
fi

# Test 2: Get contract metadata
echo ""
echo "📊 Test 2: Contract Metadata:"
echo "$CONTRACT_INFO"

# Test 3: Try to call get_transaction_counter (should work even without initialization)
echo ""
echo "🔢 Test 3: Testing get_transaction_counter function..."
COUNTER_RESULT=$(stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    -- \
    get_transaction_counter \
    2>&1)

if [[ $COUNTER_RESULT == *"Error"* ]]; then
    echo "❌ get_transaction_counter failed"
    echo "Error: $COUNTER_RESULT"
else
    echo "✅ get_transaction_counter: $COUNTER_RESULT"
fi

# Test 4: Try to call is_emergency_mode
echo ""
echo "🚨 Test 4: Testing is_emergency_mode function..."
EMERGENCY_RESULT=$(stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    -- \
    is_emergency_mode \
    2>&1)

if [[ $EMERGENCY_RESULT == *"Error"* ]]; then
    echo "❌ is_emergency_mode failed"
    echo "Error: $EMERGENCY_RESULT"
else
    echo "✅ is_emergency_mode: $EMERGENCY_RESULT"
fi

echo ""
echo "🎯 Basic contract tests completed!"
echo ""
echo "📋 Test Summary:"
echo "- Contract deployment: ✅"
echo "- Contract accessibility: ✅" 
echo "- Function calls: $([ "$COUNTER_RESULT" != *"Error"* ] && echo "✅" || echo "❌")"
echo ""
echo "🔗 View contract on Stellar Explorer:"
echo "https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
