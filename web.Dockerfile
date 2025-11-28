# apps/web/Dockerfile
# Next.js app with Turborepo build

# -----------------------
# Base (with corepack/pnpm)
# -----------------------
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# -----------------------
# Dependencies
# -----------------------
FROM base AS deps
WORKDIR /app

# Install build essentials for native modules (bufferutil, utf-8-validate, sharp)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 python3-dev build-essential ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all package.json files for workspace resolution
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# -----------------------
# Builder
# -----------------------
FROM base AS builder
WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY . .

# Build the web app using Turbo
ENV NEXT_TELEMETRY_DISABLED=1

# Dummy env vars for Next.js static generation (real values provided at runtime)
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder-supabase-key
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key

RUN pnpm turbo run build --filter=web...

# -----------------------
# Production / Runtime
# -----------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

# Next.js standalone server
CMD ["node", "apps/web/server.js"]

