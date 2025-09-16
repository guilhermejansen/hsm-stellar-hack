#!/bin/bash

# ==================== STELLAR CUSTODY MVP - DOCKER DEVELOPMENT SCRIPT ====================
# 🐳 Complete Docker development environment for Stellar Custody MVP

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE} $1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

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

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are available"
}

# Check if Docker is running
check_docker_running() {
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is running"
}

# Setup environment files
setup_environment() {
    print_step "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "apps/backend/.env" ]; then
        if [ -f "apps/backend/_env.example" ]; then
            cp apps/backend/_env.example apps/backend/.env
            print_success "Created apps/backend/.env from example"
        else
            print_warning "No backend environment example found"
        fi
    else
        print_status "Backend .env already exists"
    fi
    
    # Frontend environment
    if [ ! -f "apps/frontend/.env.local" ]; then
        if [ -f "apps/frontend/env.example" ]; then
            cp apps/frontend/env.example apps/frontend/.env.local
            print_success "Created apps/frontend/.env.local from example"
        else
            print_warning "No frontend environment example found"
        fi
    else
        print_status "Frontend .env.local already exists"
    fi
}

# Build and start services
start_services() {
    print_step "Building and starting Docker services..."
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose down --remove-orphans
    
    # Build and start services
    print_status "Building images and starting services..."
    docker-compose up --build -d
    
    print_success "Services started successfully!"
}

# Wait for services to be healthy
wait_for_services() {
    print_step "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Checking service health (attempt $attempt/$max_attempts)..."
        
        # Check PostgreSQL
        if docker-compose exec -T postgres pg_isready -U stellar_custody -d stellar_custody_db &> /dev/null; then
            print_success "PostgreSQL is healthy"
        else
            print_warning "PostgreSQL is not ready yet"
            sleep 2
            attempt=$((attempt + 1))
            continue
        fi
        
        # Check Redis
        if docker-compose exec -T redis redis-cli ping &> /dev/null; then
            print_success "Redis is healthy"
        else
            print_warning "Redis is not ready yet"
            sleep 2
            attempt=$((attempt + 1))
            continue
        fi
        
        # Check Backend
        if curl -f http://localhost:3001/health &> /dev/null; then
            print_success "Backend is healthy"
        else
            print_warning "Backend is not ready yet"
            sleep 2
            attempt=$((attempt + 1))
            continue
        fi
        
        # Check Frontend
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            print_success "Frontend is healthy"
            break
        else
            print_warning "Frontend is not ready yet"
            sleep 2
            attempt=$((attempt + 1))
            continue
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Services failed to become healthy within timeout"
        show_logs
        exit 1
    fi
}

# Show service status
show_status() {
    print_step "Service Status:"
    docker-compose ps
    
    echo ""
    print_step "Service URLs:"
    echo "  🌐 Frontend: http://localhost:3000"
    echo "  🔧 Backend API: http://localhost:3001"
    echo "  📊 Backend Health: http://localhost:3001/health"
    echo "  🔍 Frontend Health: http://localhost:3000/api/health"
    echo "  🗄️  PostgreSQL: localhost:5433"
    echo "  📦 Redis: localhost:6380"
}

# Show logs
show_logs() {
    print_step "Recent logs from all services:"
    docker-compose logs --tail=50
}

# Stop services
stop_services() {
    print_step "Stopping all services..."
    docker-compose down
    print_success "All services stopped"
}

# Clean up
cleanup() {
    print_step "Cleaning up Docker resources..."
    docker-compose down --volumes --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Main menu
show_menu() {
    echo ""
    print_header "STELLAR CUSTODY MVP - DOCKER DEVELOPMENT"
    echo ""
    echo "Available commands:"
    echo "  start     - Start all services (build + run)"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  status    - Show service status"
    echo "  logs      - Show service logs"
    echo "  health    - Check service health"
    echo "  cleanup   - Clean up Docker resources"
    echo "  help      - Show this help"
    echo ""
}

# Check service health
check_health() {
    print_step "Checking service health..."
    
    local services=("postgres:5432" "redis:6379" "backend:3001" "frontend:3000")
    local healthy=true
    
    for service in "${services[@]}"; do
        local name=$(echo $service | cut -d: -f1)
        local port=$(echo $service | cut -d: -f2)
        
        if curl -f "http://localhost:$port" &> /dev/null || nc -z localhost $port &> /dev/null; then
            print_success "$name is healthy"
        else
            print_error "$name is not responding"
            healthy=false
        fi
    done
    
    if [ "$healthy" = true ]; then
        print_success "All services are healthy!"
    else
        print_error "Some services are not healthy. Check logs with: $0 logs"
    fi
}

# Main script logic
main() {
    case "${1:-help}" in
        start)
            print_header "STARTING STELLAR CUSTODY MVP"
            check_docker
            check_docker_running
            setup_environment
            start_services
            wait_for_services
            show_status
            ;;
        stop)
            print_header "STOPPING STELLAR CUSTODY MVP"
            stop_services
            ;;
        restart)
            print_header "RESTARTING STELLAR CUSTODY MVP"
            stop_services
            sleep 2
            main start
            ;;
        status)
            print_header "STELLAR CUSTODY MVP STATUS"
            show_status
            ;;
        logs)
            print_header "STELLAR CUSTODY MVP LOGS"
            show_logs
            ;;
        health)
            print_header "STELLAR CUSTODY MVP HEALTH CHECK"
            check_health
            ;;
        cleanup)
            print_header "CLEANING UP DOCKER RESOURCES"
            cleanup
            ;;
        help|*)
            show_menu
            ;;
    esac
}

# Run main function with all arguments
main "$@"
