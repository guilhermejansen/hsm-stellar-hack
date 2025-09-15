#!/bin/bash

# Stellar Custody Smart Contract Build Script
echo "🚀 Building Stellar Custody Multi-Sig Smart Contract..."

# Check if stellar-cli is installed
if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found. Installing..."
    cargo install --locked stellar-cli
fi

# Check if Rust target is installed
if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo "📦 Installing wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cargo clean

# Build the contract
echo "🔨 Building contract..."
cargo build --target wasm32-unknown-unknown --release

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Contract built successfully!"
    echo "📁 WASM file location: target/wasm32-unknown-unknown/release/stellar_custody_contract.wasm"
    
    # Display file size
    WASM_FILE="target/wasm32-unknown-unknown/release/stellar_custody_contract.wasm"
    if [ -f "$WASM_FILE" ]; then
        FILE_SIZE=$(du -h "$WASM_FILE" | cut -f1)
        echo "📊 Contract size: $FILE_SIZE"
    fi
    
    echo ""
    echo "🎯 Next steps:"
    echo "1. Deploy to testnet: ./deploy-testnet.sh"
    echo "2. Run tests: cargo test"
    echo "3. Deploy to mainnet: ./deploy-mainnet.sh"
else
    echo "❌ Build failed!"
    exit 1
fi
