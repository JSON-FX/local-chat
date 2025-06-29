# Use Node.js 20 LTS Alpine image for smaller size
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat python3 make g++ sqlite

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
# Try building with retry and better connectivity
RUN npm config set fetch-timeout 120000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install sqlite and python for native dependencies
RUN apk add --no-cache sqlite python3 make g++

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy built files
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Copy application source files needed for runtime
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/init-database.js ./init-database.js
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Create necessary directories and set permissions
RUN mkdir -p /app/data /app/uploads
RUN chown -R nextjs:nodejs /app/data /app/uploads

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh

# Start the application
CMD ["/app/docker-entrypoint.sh"] 