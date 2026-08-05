# Backend Dockerfile — Multi-stage build for Node.js + TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ─── Production stage ───
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built source
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
