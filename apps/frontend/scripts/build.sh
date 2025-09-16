#!/bin/bash

# ==================== STELLAR CUSTODY FRONTEND - BUILD SCRIPT ====================
# 🚀 Optimized build script for Next.js 15 production deployment

set -e

echo "🚀 Building Stellar Custody Frontend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_status "Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

print_status "npm version: $(npm -v)"

# Set environment variables
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

print_status "Environment: $NODE_ENV"
print_status "Build time: $BUILD_TIME"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf dist

# Install dependencies
print_status "Installing dependencies..."
npm ci --only=production --silent

# Type check
print_status "Running type check..."
npm run type-check

# Lint check
print_status "Running lint check..."
npm run lint

# Build the application
print_status "Building Next.js application..."
npm run build

# Verify build output
if [ -d ".next" ]; then
    print_success "Build completed successfully!"
    
    # Show build info
    if [ -f ".next/BUILD_ID" ]; then
        BUILD_ID=$(cat .next/BUILD_ID)
        print_status "Build ID: $BUILD_ID"
    fi
    
    # Show build size
    if command -v du &> /dev/null; then
        BUILD_SIZE=$(du -sh .next | cut -f1)
        print_status "Build size: $BUILD_SIZE"
    fi
    
    # Check if standalone output exists
    if [ -f ".next/standalone/server.js" ]; then
        print_success "Standalone output generated for Docker deployment"
    else
        print_warning "Standalone output not found. Make sure 'output: standalone' is configured in next.config.js"
    fi
    
else
    print_error "Build failed - .next directory not found"
    exit 1
fi

# Show next steps
echo ""
print_success "Frontend build completed successfully!"
echo ""
print_status "Next steps:"
echo "  1. Test the build locally: npm start"
echo "  2. Build Docker image: docker build -t stellar-frontend ."
echo "  3. Run with Docker Compose: docker-compose up frontend"
echo ""

# Optional: Run tests if available
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    print_status "Running tests..."
    npm test -- --passWithNoTests --watchAll=false
    print_success "Tests completed"
fi

print_success "All build steps completed successfully! 🎉"
