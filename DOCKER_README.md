# 🐳 STELLAR CUSTODY MVP - DOCKER SETUP

## 🚀 Quick Start

### **1. Start Application**
```bash
./docker-run.sh up
```

### **2. Access Services**
- **🎯 Backend API**: http://localhost:3001
- **📚 Swagger Docs**: http://localhost:3001/api  
- **❤️ Health Check**: http://localhost:3001/health

### **3. Test API**
```bash
# Check health
curl http://localhost:3001/health

# View Swagger documentation
open http://localhost:3001/api
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `./docker-run.sh up` | Start all services |
| `./docker-run.sh down` | Stop all services |
| `./docker-run.sh logs` | View application logs |
| `./docker-run.sh status` | Check services status |
| `./docker-run.sh db` | Access PostgreSQL shell |
| `./docker-run.sh redis` | Access Redis shell |
| `./docker-run.sh clean` | Remove all data (destructive) |

## 🗄️ Database Management

### **Setup Database Schema**
```bash
# Access database
./docker-run.sh db

# In PostgreSQL shell:
\l                          # List databases
\c stellar_custody_db       # Connect to database
\dt                         # List tables (after Prisma migration)
```

### **Apply Prisma Migrations**
```bash
# From backend directory
cd apps/backend
npx prisma db push
```

## 📊 Redis Management

### **Access Redis**
```bash
# Access Redis shell
./docker-run.sh redis

# In Redis shell:
KEYS *                      # List all keys
GET challenge:tx123         # Get challenge data
FLUSHALL                    # Clear all data
```

## 🔧 Troubleshooting

### **Services Won't Start**
```bash
# Check Docker is running
docker info

# Check logs
./docker-run.sh logs

# Check service status
./docker-run.sh status
```

### **Database Connection Issues**
```bash
# Check PostgreSQL logs
docker logs stellar-postgres

# Test connection
docker exec stellar-postgres pg_isready -U stellar_custody
```

### **Reset Everything**
```bash
# Stop and clean all data
./docker-run.sh clean

# Start fresh
./docker-run.sh up
```

## 🌐 Network Configuration

The application uses a custom Docker network `stellar-custody-network` for secure communication between services:

- **postgres**: Database server (internal: 5432, external: 5432)
- **redis**: Cache server (internal: 6379, external: 6379)  
- **backend**: API server (internal: 3001, external: 3001)

## 📦 Volumes

Persistent data storage:
- **stellar_postgres_data**: Database files
- **stellar_redis_data**: Redis persistence

## 🔐 Environment Variables

All environment variables are configured in `docker-compose.yml` with production-ready defaults:

- **HSM DINAMO**: 187.33.9.132:4433 (production server)
- **WhatsApp API**: ZuckZapGo integration
- **Stellar Network**: Testnet configuration
- **Smart Contract**: Pre-deployed contract address

## ✅ Health Checks

All services include health checks:
- **PostgreSQL**: `pg_isready` check
- **Redis**: Connection test
- **Backend**: HTTP health endpoint

## 🎯 Ready for Development

After running `./docker-run.sh up`, your complete Stellar Custody MVP backend is ready for:

- ✅ **API Testing**: Full Swagger documentation
- ✅ **Guardian Management**: 3-guardian system
- ✅ **Transaction Processing**: Multi-sig with OCRA-like
- ✅ **WhatsApp Integration**: Notifications with images/stickers
- ✅ **HSM Integration**: DINAMO hardware security
- ✅ **Stellar Blockchain**: Testnet integration

**🚀 Happy coding!**
