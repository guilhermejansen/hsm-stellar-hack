# 🐳 Docker Setup - Stellar Custody MVP

## Overview

This document provides complete instructions for running the Stellar Custody MVP using Docker. The setup includes:

- **Frontend**: Next.js 15 with standalone output
- **Backend**: NestJS API with Prisma
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **HSM**: DINAMO integration (external)
- **WhatsApp**: ZuckZapGo API integration

## Quick Start

### 1. Prerequisites

- Docker Desktop (latest version)
- Docker Compose v2
- 8GB+ RAM available
- Ports 3000, 3001, 5433, 6380 available

### 2. Start All Services

```bash
# Clone and navigate to project
cd stellar-custody-mvp

# Start all services with one command
./scripts/dev-docker.sh start
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api
- **Health Checks**: 
  - Backend: http://localhost:3001/health
  - Frontend: http://localhost:3000/api/health

## Docker Architecture

### Services Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │   PostgreSQL    │
│   (Next.js 15)  │◄──►│   (NestJS API)  │◄──►│     15          │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 5433    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Redis       │    │   HSM DINAMO    │    │  WhatsApp API   │
│     7           │    │   (External)    │    │  (ZuckZapGo)    │
│   Port: 6380    │    │   187.33.9.132  │    │  api.zuckzapgo  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Network Configuration

- **Network**: `stellar-custody-network`
- **Frontend → Backend**: `http://backend:3001`
- **Backend → Database**: `postgresql://stellar_custody:secure_password_2024@postgres:5432/stellar_custody_db`
- **Backend → Redis**: `redis://:redis_secure_2024@redis:6379`

## Environment Configuration

### Frontend Environment

The frontend uses the following environment variables (configured in `docker-compose.yml`):

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://backend:3001/api
NEXT_PUBLIC_API_URL=http://backend:3001

# Stellar Network
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org:443

# Smart Contract
NEXT_PUBLIC_STELLAR_CONTRACT_ADDRESS=CCVEIQKVF6C3G52OJ7TLVIPMJXDZ3ABPLLXQAQVDX2BEZHWUPLFWUYSX

# External Services
NEXT_PUBLIC_WHATSAPP_API_URL=https://api.zuckzapgo.com
NEXT_PUBLIC_QR_CODE_SERVICE=https://api.qrserver.com
```

### Backend Environment

The backend uses comprehensive environment configuration including:

- Database connection
- HSM DINAMO credentials
- Stellar network settings
- Guardian keys for multi-sig
- WhatsApp API token
- JWT and encryption keys

## Docker Commands

### Development Script

Use the provided development script for common operations:

```bash
# Start all services
./scripts/dev-docker.sh start

# Check service status
./scripts/dev-docker.sh status

# View logs
./scripts/dev-docker.sh logs

# Check health
./scripts/dev-docker.sh health

# Stop services
./scripts/dev-docker.sh stop

# Restart services
./scripts/dev-docker.sh restart

# Clean up everything
./scripts/dev-docker.sh cleanup
```

### Manual Docker Commands

```bash
# Build and start all services
docker-compose up --build -d

# Start specific service
docker-compose up frontend -d
docker-compose up backend -d

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Execute commands in containers
docker-compose exec frontend sh
docker-compose exec backend sh

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down --volumes
```

## Frontend Docker Configuration

### Dockerfile Features

- **Multi-stage build** for optimized image size
- **Standalone output** for minimal runtime dependencies
- **Non-root user** for security
- **Health checks** for monitoring
- **Production optimizations** (console removal, minification)

### Build Process

1. **Dependencies Stage**: Install production dependencies
2. **Builder Stage**: Build Next.js application with standalone output
3. **Runner Stage**: Create minimal runtime image

### Key Optimizations

- Uses `output: 'standalone'` in Next.js config
- Removes console logs in production
- Optimizes webpack chunks for Docker
- Implements proper caching strategies

## Backend Docker Configuration

### Dockerfile Features

- **Multi-stage build** with separate dependencies
- **Prisma integration** with database migrations
- **HSM SDK** external package handling
- **Health checks** and monitoring
- **Log volume** mounting for persistence

## Database Setup

### PostgreSQL Configuration

- **Version**: 15-alpine
- **Database**: `stellar_custody_db`
- **User**: `stellar_custody`
- **Password**: `secure_password_2024`
- **Port**: 5433 (external), 5432 (internal)
- **Health Check**: Built-in pg_isready

### Redis Configuration

- **Version**: 7-alpine
- **Password**: `redis_secure_2024`
- **Port**: 6380 (external), 6379 (internal)
- **Persistence**: AOF enabled
- **Health Check**: Redis PING

## Health Monitoring

### Health Check Endpoints

- **Backend**: `GET /health` - Complete system health
- **Frontend**: `GET /api/health` - Frontend application health
- **Database**: Built-in PostgreSQL health check
- **Redis**: Built-in Redis health check

### Docker Health Checks

All services include Docker health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

## Troubleshooting

### Common Issues

#### 1. Port Conflicts

```bash
# Check what's using ports
lsof -i :3000
lsof -i :3001
lsof -i :5433
lsof -i :6380

# Kill processes using ports
sudo kill -9 $(lsof -t -i:3000)
```

#### 2. Docker Build Failures

```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check build logs
docker-compose build frontend --progress=plain
```

#### 3. Database Connection Issues

```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U stellar_custody -d stellar_custody_db -c "SELECT 1;"

# Reset database
docker-compose down --volumes
docker-compose up postgres -d
```

#### 4. Frontend Build Issues

```bash
# Check Node.js version
docker-compose exec frontend node --version

# Check build logs
docker-compose logs frontend

# Rebuild frontend only
docker-compose build frontend --no-cache
```

### Debug Commands

```bash
# Check service status
docker-compose ps

# View detailed logs
docker-compose logs --tail=100 -f

# Check container resources
docker stats

# Inspect container configuration
docker inspect stellar-frontend
docker inspect stellar-backend
```

## Performance Optimization

### Resource Limits

For production deployment, consider adding resource limits:

```yaml
services:
  frontend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Build Optimization

- Use `.dockerignore` to exclude unnecessary files
- Leverage Docker layer caching
- Use multi-stage builds to reduce final image size
- Implement proper dependency caching

## Security Considerations

### Container Security

- All services run as non-root users
- Minimal base images (alpine)
- No unnecessary packages installed
- Proper file permissions set

### Network Security

- Services communicate over internal Docker network
- External access only through defined ports
- Security headers configured in Next.js
- CORS properly configured

### Secrets Management

- Environment variables for sensitive data
- No secrets in Docker images
- Use Docker secrets for production deployment
- Rotate credentials regularly

## Production Deployment

### Environment Variables

For production, update environment variables:

```bash
# Production API URLs
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Production Stellar network
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon.stellar.org
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban.stellar.org:443
```

### SSL/TLS

Configure reverse proxy (nginx/traefik) for SSL termination:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Logging

### Log Management

- Logs are mounted to host volumes
- Use centralized logging (ELK stack, Fluentd)
- Implement log rotation
- Monitor error rates and patterns

### Metrics Collection

- Application metrics via health endpoints
- Container metrics via Docker stats
- Database performance monitoring
- Network traffic analysis

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U stellar_custody stellar_custody_db > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U stellar_custody stellar_custody_db < backup.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v stellar_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
docker run --rm -v stellar_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz /data
```

---

**For additional support, check the main project documentation or create an issue in the repository.**
