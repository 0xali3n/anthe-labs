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
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./

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
FROM base AS runner
WORKDIR /app

# OpenSSL needed for Prisma, Python/build-essential for native modules
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      openssl ca-certificates python3 build-essential \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHON=/usr/bin/python3

# Copy package files for production install
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy Prisma schema (needed for prisma generate)
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Install production dependencies only (this properly resolves all deps with hoisting)
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client in production (required after fresh install)
RUN cd apps/api && npx prisma generate --schema=./prisma/schema.prisma

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]

