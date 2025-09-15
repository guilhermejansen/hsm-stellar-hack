#!/bin/bash

# ==================== STELLAR CUSTODY MVP - DOCKER RUN SCRIPT ====================
# 🐳 Simple script to manage Docker Compose application

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Stellar Custody MVP"
COMPOSE_FILE="docker-compose.yml"

# Help function
show_help() {
    echo -e "${BLUE}🐳 $PROJECT_NAME - Docker Management${NC}"
    echo ""
    echo "Usage: ./docker-run.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  up        Start all services"
    echo "  down      Stop all services"
    echo "  restart   Restart all services"
    echo "  logs      Show application logs"
    echo "  status    Show services status"
    echo "  db        Access database shell"
    echo "  redis     Access Redis shell" 
    echo "  clean     Clean all data (DESTRUCTIVE)"
    echo "  help      Show this help"
    echo ""
    echo "Examples:"
    echo "  ./docker-run.sh up     # Start application"
    echo "  ./docker-run.sh logs   # View logs"
    echo "  ./docker-run.sh db     # Connect to database"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
}

# ==================== COMMAND HANDLERS ====================

cmd_up() {
    echo -e "${BLUE}🚀 Starting $PROJECT_NAME...${NC}"
    check_docker
    
    # Build and start services
    docker-compose -f $COMPOSE_FILE up -d --build
    
    echo ""
    echo -e "${GREEN}✅ Services started successfully!${NC}"
    echo ""
    echo "📋 Service URLs:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 Backend API:        http://localhost:3001"
    echo "📚 Swagger Docs:       http://localhost:3001/api"
    echo "❤️  Health Check:      http://localhost:3001/health"
    echo "🗄️  PostgreSQL:        localhost:5432"
    echo "📊 Redis:              localhost:6379"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 Useful commands:"
    echo "  ./docker-run.sh logs    # View application logs"
    echo "  ./docker-run.sh status  # Check services status"
    echo "  ./docker-run.sh db      # Access database"
    echo ""
    
    # Wait for services to be healthy
    echo "⏳ Waiting for services to be ready..."
    sleep 5
    
    # Check service health
    cmd_status
}

cmd_down() {
    echo -e "${YELLOW}🔄 Stopping $PROJECT_NAME...${NC}"
    docker-compose -f $COMPOSE_FILE down
    echo -e "${GREEN}✅ Services stopped successfully!${NC}"
}

cmd_restart() {
    echo -e "${YELLOW}🔄 Restarting $PROJECT_NAME...${NC}"
    docker-compose -f $COMPOSE_FILE restart
    echo -e "${GREEN}✅ Services restarted successfully!${NC}"
}

cmd_logs() {
    echo -e "${BLUE}📋 Showing application logs (press Ctrl+C to exit)...${NC}"
    docker-compose -f $COMPOSE_FILE logs -f backend
}

cmd_status() {
    echo -e "${BLUE}📊 Services Status:${NC}"
    echo ""
    
    # Check service health
    services=("postgres" "redis" "backend")
    for service in "${services[@]}"; do
        if docker-compose -f $COMPOSE_FILE ps --services --filter "status=running" | grep -q "^$service$"; then
            echo -e "  ✅ $service: ${GREEN}Running${NC}"
        else
            echo -e "  ❌ $service: ${RED}Stopped${NC}"
        fi
    done
    
    echo ""
    echo "🔍 Detailed status:"
    docker-compose -f $COMPOSE_FILE ps
}

cmd_db() {
    echo -e "${BLUE}🗄️  Connecting to PostgreSQL database...${NC}"
    docker-compose -f $COMPOSE_FILE exec postgres psql -U stellar_custody -d stellar_custody_db
}

cmd_redis() {
    echo -e "${BLUE}📊 Connecting to Redis...${NC}"
    docker-compose -f $COMPOSE_FILE exec redis redis-cli -a redis_secure_2024
}

cmd_clean() {
    echo -e "${RED}⚠️  WARNING: This will delete ALL data!${NC}"
    read -p "Are you sure? Type 'yes' to confirm: " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo -e "${YELLOW}🧹 Cleaning all data...${NC}"
        docker-compose -f $COMPOSE_FILE down -v
        docker volume rm stellar_postgres_data stellar_redis_data 2>/dev/null || true
        echo -e "${GREEN}✅ All data cleaned!${NC}"
    else
        echo "❌ Cancelled."
    fi
}

# ==================== MAIN SCRIPT ====================

case "${1:-help}" in
    up)
        cmd_up
        ;;
    down)
        cmd_down
        ;;
    restart)
        cmd_restart
        ;;
    logs)
        cmd_logs
        ;;
    status)
        cmd_status
        ;;
    db)
        cmd_db
        ;;
    redis)
        cmd_redis
        ;;
    clean)
        cmd_clean
        ;;
    help|*)
        show_help
        ;;
esac
