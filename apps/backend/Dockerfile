# ==================== STELLAR CUSTODY MVP - BACKEND DOCKERFILE ====================
# 🐳 Multi-stage Docker build for NestJS backend

# ==================== BUILD STAGE ====================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install all dependencies (including dev for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# ==================== PRODUCTION STAGE ====================
FROM node:18-alpine AS production

# Install security updates and dependencies for Prisma
RUN apk update && apk upgrade && \
    apk add --no-cache \
    openssl \
    ca-certificates \
    curl \
    dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Copy Prisma schema and generated client for migrations
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy assets for WhatsApp (stickers, images)
COPY --chown=nestjs:nodejs avatar-stellar-sticker.txt ./
COPY --chown=nestjs:nodejs success.txt ./
COPY --chown=nestjs:nodejs totp.txt ./

# Create logs directory
RUN mkdir -p logs && chown nestjs:nodejs logs

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
