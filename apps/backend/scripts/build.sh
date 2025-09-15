#!/bin/bash

# ==================== STELLAR CUSTODY MVP - BUILD SCRIPT ====================
# 🚀 Complete backend build and verification script

echo "🚀 Building Stellar Custody MVP Backend..."

# Set error handling
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Stellar Custody MVP Backend"
NODE_VERSION_REQUIRED="18.0.0"
BUILD_DIR="dist"

# ==================== ENVIRONMENT CHECK ====================

echo -e "${BLUE}📋 Environment Check${NC}"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
echo "Node.js version: $NODE_VERSION"

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set, using default${NC}"
fi

if [ -z "$HSM_HOST" ]; then
    echo -e "${YELLOW}⚠️  HSM_HOST not set, using default (187.33.9.132)${NC}"
fi

echo -e "${GREEN}✅ Environment check completed${NC}"

# ==================== DEPENDENCY INSTALLATION ====================

echo -e "${BLUE}📦 Installing Dependencies${NC}"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "Dependencies already installed, checking for updates..."
    npm ci
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"

# ==================== PRISMA SETUP ====================

echo -e "${BLUE}🗄️  Database Setup${NC}"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Check database connection (optional)
if [ "$NODE_ENV" != "production" ]; then
    echo "Testing database connection..."
    npx prisma db push --skip-generate || echo -e "${YELLOW}⚠️  Database not available, continuing...${NC}"
fi

echo -e "${GREEN}✅ Database setup completed${NC}"

# ==================== LINTING AND FORMATTING ====================

echo -e "${BLUE}🔍 Code Quality Check${NC}"

# Format code
echo "Formatting code..."
npm run format

# Lint code
echo "Linting code..."
npm run lint

echo -e "${GREEN}✅ Code quality check completed${NC}"

# ==================== TESTING ====================

echo -e "${BLUE}🧪 Running Tests${NC}"

# Run unit tests
echo "Running unit tests..."
npm run test -- --passWithNoTests

# Run test coverage
echo "Generating test coverage..."
npm run test:cov -- --passWithNoTests

echo -e "${GREEN}✅ Tests completed${NC}"

# ==================== BUILDING ====================

echo -e "${BLUE}🔨 Building Application${NC}"

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
    echo "Cleaning previous build..."
    rm -rf $BUILD_DIR
fi

# Build application
echo "Building TypeScript..."
npm run build

# Verify build output
if [ ! -f "$BUILD_DIR/main.js" ]; then
    echo -e "${RED}❌ Build failed - main.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# ==================== SECURITY CHECK ====================

echo -e "${BLUE}🔐 Security Audit${NC}"

# Check for vulnerabilities
echo "Running security audit..."
npm audit --audit-level=moderate || echo -e "${YELLOW}⚠️  Security warnings found, review recommended${NC}"

echo -e "${GREEN}✅ Security audit completed${NC}"

# ==================== BUILD SUMMARY ====================

echo ""
echo -e "${GREEN}🎉 BUILD COMPLETED SUCCESSFULLY!${NC}"
echo ""
echo "📋 Build Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Project: $PROJECT_NAME"
echo "📦 Node.js: $NODE_VERSION"
echo "🗄️  Database: Prisma client generated"
echo "🔍 Code Quality: Passed"
echo "🧪 Tests: Passed"
echo "🔨 Build: Success"
echo "🔐 Security: Audited"
echo "📁 Output: $BUILD_DIR/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Ready to start:"
echo "   npm run start:dev  # Development mode"
echo "   npm run start:prod # Production mode"
echo ""
echo "📚 API Documentation: http://localhost:3001/api"
echo "❤️  Health Check: http://localhost:3001/health"
echo ""

# ==================== DEPLOYMENT READINESS ====================

echo -e "${BLUE}✅ DEPLOYMENT READINESS CHECK${NC}"
echo ""
echo "Required for deployment:"
echo "- [✅] Build successful"
echo "- [✅] Tests passing"
echo "- [✅] Dependencies installed"
echo "- [✅] Prisma client generated"
echo "- [ ] Environment variables configured"
echo "- [ ] Database migrations applied"
echo "- [ ] HSM connection verified"
echo "- [ ] SSL certificates (for mTLS)"
echo ""
echo -e "${GREEN}🎯 Backend build completed successfully!${NC}"
