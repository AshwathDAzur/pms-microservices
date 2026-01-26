# =========================
# Build Stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# =========================
# Production Stage
# =========================
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Environment variables (can be overridden by docker-compose)
ARG PORT=5000
ARG ENV=production
ARG PUBLICKEY
ARG LOG_LEVEL=info

ENV PORT=$PORT \
    ENV=$ENV \
    PUBLICKEY=$PUBLICKEY \
    LOG_LEVEL=$LOG_LEVEL

EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/health || exit 1

CMD ["node", "dist/server.js"]
