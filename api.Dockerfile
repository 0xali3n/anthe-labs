# apps/api/Dockerfile
# NestJS API with Prisma and Turborepo build

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

# Install build essentials for node-gyp / native modules (Prisma, pg, etc.)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 python3-dev build-essential ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package.json for api app
COPY apps/api/package.json apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client (required for CI/CD deployments)
RUN cd apps/api && npx prisma generate --schema=./prisma/schema.prisma

# Build the api app using Turbo
RUN pnpm turbo run build --filter=api...

# -----------------------
# Production / Runtime
# -----------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# OpenSSL needed for Prisma
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist

# Copy Prisma schema and generated client
COPY --from=builder /app/apps/api/prisma ./prisma

# Copy node_modules from builder (includes all dependencies and Prisma client)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main.js"]
