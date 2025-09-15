-- ==================== STELLAR CUSTODY MVP - DATABASE INITIALIZATION ====================
-- 🗄️ PostgreSQL initialization script

-- Ensure database exists
CREATE DATABASE stellar_custody_db;

-- Grant all privileges to stellar_custody user
GRANT ALL PRIVILEGES ON DATABASE stellar_custody_db TO stellar_custody;

-- Set up extensions (if needed)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE '✅ Stellar Custody MVP database initialized successfully';
    RAISE NOTICE '🔐 Database: stellar_custody_db';
    RAISE NOTICE '👤 User: stellar_custody';
    RAISE NOTICE '⚡ Ready for Prisma migrations';
END $$;
