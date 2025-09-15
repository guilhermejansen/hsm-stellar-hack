# Stellar Custody Smart Contract Makefile
# Usage: make <target>

.PHONY: help build test deploy-testnet deploy-mainnet clean install-deps check

# Default target
help:
	@echo "🚀 Stellar Custody Smart Contract - Available Commands"
	@echo "=================================================="
	@echo ""
	@echo "Development:"
	@echo "  install-deps    Install all required dependencies"
	@echo "  build          Build the smart contract WASM"
	@echo "  test           Run unit tests"
	@echo "  check          Check code formatting and linting"
	@echo "  clean          Clean build artifacts"
	@echo ""
	@echo "Deployment:"
	@echo "  deploy-testnet  Deploy contract to Stellar testnet"
	@echo "  init-testnet    Initialize contract on testnet"
	@echo "  test-integration Run integration tests on testnet"
	@echo "  deploy-mainnet  Deploy contract to Stellar mainnet"
	@echo ""
	@echo "Utilities:"
	@echo "  format          Format code with rustfmt"
	@echo "  lint            Run clippy linter"
	@echo "  docs            Generate documentation"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install-deps && make build && make deploy-testnet"

# Install dependencies
install-deps:
	@echo "📦 Installing dependencies..."
	@cargo install stellar-cli --locked || echo "Stellar CLI already installed"
	@rustup target add wasm32-unknown-unknown || echo "WASM target already installed"
	@cargo install cargo-audit || echo "Cargo audit already installed"
	@echo "✅ Dependencies installed"

# Build the contract
build:
	@echo "🔨 Building smart contract..."
	@./build.sh

# Run unit tests
test:
	@echo "🧪 Running unit tests..."
	@cargo test --verbose

# Code quality checks
check: format lint audit
	@echo "✅ All checks passed"

format:
	@echo "🎨 Formatting code..."
	@cargo fmt --all -- --check

lint:
	@echo "🔍 Running linter..."
	@cargo clippy -- -D warnings

audit:
	@echo "🔒 Running security audit..."
	@cargo audit

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@cargo clean
	@rm -f contract-address-*.txt
	@rm -f contract-config-*.json

# Deploy to testnet
deploy-testnet: build
	@echo "🌐 Deploying to testnet..."
	@./deploy-testnet.sh

# Initialize contract on testnet
init-testnet:
	@echo "⚙️ Initializing contract on testnet..."
	@./initialize-testnet.sh

# Run integration tests on testnet
test-integration:
	@echo "🚀 Running integration tests..."
	@./test-contract.sh

# Deploy to mainnet (careful!)
deploy-mainnet: build check
	@echo "⚠️  WARNING: Deploying to MAINNET"
	@echo "This will deploy to the Stellar mainnet with real XLM!"
	@echo "Make sure you have:"
	@echo "- Tested thoroughly on testnet"
	@echo "- Set proper environment variables"
	@echo "- Audited the contract code"
	@echo ""
	@read -p "Are you sure you want to deploy to mainnet? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		./deploy-mainnet.sh; \
	else \
		echo "Deployment cancelled"; \
	fi

# Generate documentation
docs:
	@echo "📚 Generating documentation..."
	@cargo doc --open --no-deps

# Complete workflow for development
dev-setup: install-deps build test deploy-testnet init-testnet test-integration
	@echo "🎉 Development environment ready!"

# Complete workflow for production
prod-deploy: check build deploy-mainnet
	@echo "🚀 Production deployment complete!"

# Status check
status:
	@echo "📊 Contract Status"
	@echo "=================="
	@if [ -f "contract-address-testnet.txt" ]; then \
		echo "Testnet Address: $$(cat contract-address-testnet.txt)"; \
	else \
		echo "Testnet: Not deployed"; \
	fi
	@if [ -f "contract-address-mainnet.txt" ]; then \
		echo "Mainnet Address: $$(cat contract-address-mainnet.txt)"; \
	else \
		echo "Mainnet: Not deployed"; \
	fi

# Watch for file changes and rebuild
watch:
	@echo "👀 Watching for changes..."
	@cargo watch -x check -x test -s "make build"

# Benchmark tests
benchmark:
	@echo "⚡ Running benchmarks..."
	@cargo test --release -- --ignored benchmark
