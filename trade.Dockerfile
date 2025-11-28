# apps/trade/Dockerfile
# Trade execution service for copy trading

# -----------------------
# Base (with corepack/pnpm)
# -----------------------
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# -----------------------
# Builder
# -----------------------
FROM base AS builder
WORKDIR /app

# Install build essentials for native modules (Prisma, pg, etc.)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 python3-dev build-essential ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package.json for trade app
COPY apps/trade/package.json apps/trade/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client (required for CI/CD deployments)
RUN cd apps/trade && npx prisma generate --schema=./prisma/schema.prisma

# Build the trade app using Turbo
RUN pnpm turbo run build --filter=trade...

# -----------------------
# Production / Runtime
# -----------------------
FROM base AS runner
WORKDIR /app

# OpenSSL needed for Prisma
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files for production install
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/trade/package.json ./apps/trade/

# Install production dependencies only (this properly resolves all deps)
RUN pnpm install --frozen-lockfile --prod

# Copy Prisma schema to apps/trade/prisma
COPY --from=builder /app/apps/trade/prisma ./apps/trade/prisma

# Generate Prisma client in runner (after fresh pnpm install)
RUN cd apps/trade && npx prisma generate --schema=./prisma/schema.prisma

# Copy built files
COPY --from=builder /app/apps/trade/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]

