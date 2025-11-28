# apps/ws/Dockerfile
# WebSocket service for monitoring Kana Labs orders

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

# Install build essentials for any native modules
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 python3-dev build-essential ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package.json for ws app
COPY apps/ws/package.json apps/ws/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the ws app using Turbo
RUN pnpm turbo run build --filter=ws...

# -----------------------
# Production / Runtime
# -----------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built files
COPY --from=builder /app/apps/ws/dist ./dist

# Copy node_modules from builder (includes all dependencies)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/server.js"]

