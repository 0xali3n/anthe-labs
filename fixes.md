# Docker Build Fixes Documentation

> **Date:** November 28, 2024  
> **Purpose:** Document all fixes applied to enable successful Docker builds for CI/CD deployment

---

## 🚨 Critical: Node.js Version Update

### Red Flag: Node.js 16 is End-of-Life (EOL)

| Issue | Details |
|-------|---------|
| **Previous Version** | Node.js 16.15.0 |
| **EOL Date** | September 11, 2023 |
| **Security Risk** | No longer receiving security updates |
| **New Version** | Node.js 22 (LTS) |

**Action Taken:** All Dockerfiles now use `node:22-bookworm-slim` (Debian 12) as the base image.

```dockerfile
FROM node:22-bookworm-slim AS base
```

**Why This Matters:**
- Node 16 has known security vulnerabilities that will never be patched
- Many modern packages require Node 18+ 
- pnpm 9.x requires Node 18.12 or higher
- TypeScript 5.x works best with Node 18+

---

## 🔄 Why It Works Locally But Not in Docker

### Understanding the Difference

| Aspect | Local Development | Docker Build |
|--------|-------------------|--------------|
| **Mode** | `pnpm dev` (development) | `pnpm build` (production) |
| **Pre-rendering** | Disabled | Enabled (static generation) |
| **Type Checking** | Lenient (transpile-only) | Strict (full compilation) |
| **Dependencies** | Already installed globally | Fresh install from scratch |
| **Prisma Client** | Generated once, cached | Must generate every build |
| **node_modules** | Persistent on disk | Rebuilt in isolated container |

### Key Insight

When running `pnpm dev` locally:
- TypeScript uses `transpile-only` mode (skips type errors)
- Next.js doesn't pre-render pages
- Prisma client exists from previous `prisma generate` runs
- Native modules use your system's build tools

When running `docker build`:
- TypeScript performs **full type checking** (fails on errors)
- Next.js attempts to **pre-render all pages** (requires Suspense boundaries)
- Prisma client **must be generated** during build
- Native modules need build tools installed in container

---

## 🚨 Critical: Wrong Package Name (dotenv)

### Issue Discovered During EKS Deployment

After deploying to EKS, the `api` service failed with:
```
Error: Cannot find module 'dotenv/config'
```

### Root Cause Analysis

**Location:** `apps/api/package.json`

| Problem | Details |
|---------|---------|
| **Wrong Package** | `"dot-env": "^0.0.1"` was listed in dependencies |
| **Correct Package** | Should be `"dotenv": "^17.2.3"` |
| **Additional Issue** | `dotenv` was in `devDependencies` instead of `dependencies` |

**Why This Happened:**
- `dot-env` is a **completely different package** (only 0.0.1 version, abandoned)
- The code imports `dotenv/config` which requires the `dotenv` package
- `devDependencies` are NOT installed in production (`NODE_ENV=production`)

**Fix Applied:**
```json
{
  "dependencies": {
    "dotenv": "^17.2.3"  // ✅ Moved from devDependencies + fixed name
  },
  "devDependencies": {
    // ❌ Removed "dotenv" from here
    // ❌ Removed "dot-env" typo
  }
}
```

### Why It Worked Locally But Failed in Docker

| Environment | Behavior |
|-------------|----------|
| **Local `pnpm dev`** | All dependencies (including devDependencies) are installed |
| **Docker Production** | Only `dependencies` are available at runtime |

---

## 📦 Missing Items That Were Added

### 1. Prisma Generate Script (API Service)

**Problem:** The `api` service had no `prisma:generate` script in `package.json`.

**Location:** `apps/api/package.json`

**What was missing:**
```json
{
  "scripts": {
    // ❌ No prisma:generate script existed
  }
}
```

**Fix Applied:** Added explicit prisma generate command in Dockerfile:
```dockerfile
# api.Dockerfile
RUN cd apps/api && npx prisma generate --schema=./prisma/schema.prisma
```

### 2. TypeScript Type Definitions (@types/pg)

**Problem:** The `trade` service uses the `pg` (PostgreSQL) package but was missing type definitions.

**Location:** `apps/trade/package.json`

**Error:**
```
src/services/prisma.service.ts(2,22): error TS7016: Could not find a declaration file for module 'pg'.
```

**Fix Applied:**
```json
{
  "devDependencies": {
    "@types/pg": "^8.11.6"  // ✅ Added
  }
}
```

### 3. Next.js Standalone Output Configuration

**Problem:** Next.js wasn't configured for optimized Docker deployment.

**Location:** `apps/web/next.config.ts`

**What was missing:**
```typescript
// ❌ No output configuration
const nextConfig = {};
```

**Fix Applied:**
```typescript
const nextConfig = {
  output: "standalone",  // ✅ Required for Docker
};
```

### 4. Native Module Build Tools in Docker

**Problem:** Native Node.js modules (`bufferutil`, `utf-8-validate`) failed to compile.

**Error:**
```
gyp ERR! node-gyp -v v10.1.0
.../node_modules/utf-8-validate install: Failed
.../node_modules/bufferutil install: Failed
```

**Fix Applied:** Added build tools to Dockerfile:
```dockerfile
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 python3-dev build-essential ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3
```

---

## 🐛 TypeScript Errors Fixed

### 1. Unused Variable: `ivLength` (encryption.service.ts)

**Location:** `apps/trade/src/services/encryption.service.ts`

**Error:**
```
error TS6133: 'ivLength' is declared but its value is never read.
```

**Original Code:**
```typescript
private readonly ivLength = 16; // ❌ Declared but never used
```

**Fix Applied:** Removed the unused variable (IV is read from encrypted data, not created with fixed length).

### 2. Unused Variable: `streamName` (redis.service.ts)

**Location:** `apps/trade/src/services/redis.service.ts`

**Error:**
```
error TS6133: 'streamName' is declared but its value is never read.
```

**Original Code:**
```typescript
const [streamName, entries] = result[0]; // ❌ streamName unused
```

**Fix Applied:**
```typescript
const [, entries] = result[0]; // ✅ Ignore first element
```

### 3. React Suspense Boundary (copytrade/page.tsx)

**Location:** `apps/web/src/app/copytrade/page.tsx`

**Error:**
```
useSearchParams() should be wrapped in a suspense boundary at page "/copytrade"
```

**Why This Happens:**
- `useSearchParams()` is a client-side hook
- Next.js 14+ requires Suspense boundaries for dynamic hooks during static generation
- Works locally because dev mode doesn't pre-render

**Fix Applied:**
```tsx
import { Suspense } from "react";

function CopytradeContent() {
  const searchParams = useSearchParams();
  // ... component logic
}

export default function Copytrade() {
  return (
    <Suspense fallback={<div>...</div>}>
      <CopytradeContent />
    </Suspense>
  );
}
```

---

## 🔧 Dockerfile Fixes Summary

### api.Dockerfile

| Fix | Description |
|-----|-------------|
| Added Python/build-essential | Required for native module compilation |
| Added Prisma generate step | `npx prisma generate --schema=./prisma/schema.prisma` |
| Copy node_modules from builder | Avoids reinstalling dependencies in runner stage |
| Added openssl to runner | Required for Prisma database connections |

### web.Dockerfile

| Fix | Description |
|-----|-------------|
| Added Python/build-essential | Required for `bufferutil`, `utf-8-validate` |
| Standalone output mode | Optimized Next.js build for containers |
| Created non-root user | Security best practice (`nextjs:nodejs`) |

### ws.Dockerfile

| Fix | Description |
|-----|-------------|
| Added Python/build-essential | Required for native module compilation |
| Copy node_modules from builder | Ensures all dependencies available at runtime |

### trade.Dockerfile

| Fix | Description |
|-----|-------------|
| Added Python/build-essential | Required for native module compilation |
| Added Prisma generate step | `npx prisma generate --schema=./prisma/schema.prisma` |
| Copy prisma folder to runner | Required for Prisma client to function |
| Added openssl to runner | Required for Prisma database connections |

---

## 🔗 Critical: pnpm Symlink Issue in Docker

### The Problem

After deploying to EKS, all pods failed with:
```
Error: Cannot find module 'dotenv'
Require stack:
- /app/dist/server.js
```

**Root Cause:** pnpm uses a content-addressable storage with symlinks. Dependencies are stored in `node_modules/.pnpm/` and accessed via symlinks from the app's `node_modules`. When Docker copies `node_modules`, the symlinks don't resolve properly.

### Why It Worked Locally But Failed in Docker

| Environment | How Dependencies Work |
|-------------|----------------------|
| **Local Development** | pnpm creates symlinks that point to `.pnpm/` store - works because entire structure is intact |
| **Docker (old approach)** | `COPY node_modules` copies symlinks but they become broken in the new container |
| **Docker (fixed)** | Use `shamefully-hoist=true` + `node-linker=hoisted` in `.npmrc` to flatten dependencies |

### The Complete Fix (Two Parts)

#### Part 1: `.npmrc` Configuration

Created `.npmrc` at repository root with hoisting settings:
```ini
# Hoist all dependencies to root node_modules for Docker compatibility
# Without this, pnpm creates symlinks that break in Docker COPY
shamefully-hoist=true
node-linker=hoisted
```

#### Part 2: `.dockerignore` Configuration

Created `.dockerignore` to prevent local node_modules from conflicting:
```
# Ignore node_modules - will be installed fresh in Docker
node_modules
**/node_modules

# Ignore build outputs
dist
**/dist
.next
**/.next

# Ignore turbo cache
.turbo
**/.turbo
```

#### Part 3: Updated Dockerfiles

All backend Dockerfiles now:
1. Copy `.npmrc` to enable hoisting
2. Run `pnpm install --frozen-lockfile --prod` in runner stage
3. Generate Prisma client in runner stage (for api/trade)

```dockerfile
# -----------------------
# Production / Runtime
# -----------------------
FROM base AS runner
WORKDIR /app

# Copy package files for production install (including .npmrc for hoisting)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy Prisma schema (needed for prisma generate)
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Install production dependencies only (hoisted = flat node_modules)
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client in production
RUN cd apps/api && npx prisma generate --schema=./prisma/schema.prisma

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
```

### Why This Works

1. **`shamefully-hoist=true`** - Hoists all dependencies to root `node_modules` (like npm/yarn)
2. **`node-linker=hoisted`** - Uses flat node_modules structure instead of symlinks
3. **`.dockerignore`** - Prevents local node_modules from being copied (avoids conflicts)
4. **Fresh install in runner** - Creates proper flat structure in container
5. **Prisma generate in runner** - Generates client after fresh install

### Applied To All Services

| Service | Dockerfile | pnpm Install in Runner | Prisma Generate |
|---------|------------|------------------------|-----------------|
| api | `api.Dockerfile` | ✅ `pnpm install --frozen-lockfile --prod` | ✅ Yes |
| ws | `ws.Dockerfile` | ✅ `pnpm install --frozen-lockfile --prod` | ❌ No |
| trade | `trade.Dockerfile` | ✅ `pnpm install --frozen-lockfile --prod` | ✅ Yes |
| web | `web.Dockerfile` | N/A (uses Next.js standalone output) | N/A |

---

## ✅ Final Verification

All 4 Docker images build successfully:

```bash
docker build -f api.Dockerfile -t anthe-api .     # ✅ Success
docker build -f web.Dockerfile -t anthe-web .     # ✅ Success
docker build -f ws.Dockerfile -t anthe-ws .       # ✅ Success
docker build -f trade.Dockerfile -t anthe-trade . # ✅ Success
```

| Image | Size |
|-------|------|
| `anthe-api:latest` | 441MB |
| `anthe-web:latest` | 111MB |
| `anthe-ws:latest` | 438MB |
| `anthe-trade:latest` | 441MB |

### Module Resolution Tests

All containers pass module resolution tests:

```bash
# Test dotenv
docker run --rm anthe-api node -e "require('dotenv'); console.log('✅ api: dotenv OK')"
docker run --rm anthe-ws node -e "require('dotenv'); console.log('✅ ws: dotenv OK')"
docker run --rm anthe-trade node -e "require('dotenv'); console.log('✅ trade: dotenv OK')"

# Test Prisma
docker run --rm anthe-api node -e "require('@prisma/client'); console.log('✅ api: Prisma OK')"
docker run --rm anthe-trade node -e "require('@prisma/client'); console.log('✅ trade: Prisma OK')"
```

---

## 📋 Recommendations for Development Team

### 1. Check Dependencies Placement

**⚠️ Critical:** Ensure runtime dependencies are in `dependencies`, NOT `devDependencies`:

```json
{
  "dependencies": {
    "dotenv": "^17.2.3"  // ✅ Runtime dependency - MUST be here
  },
  "devDependencies": {
    "@types/node": "^20.0.0"  // ✅ Dev-only - OK to be here
  }
}
```

**Runtime packages that MUST be in `dependencies`:**
- `dotenv` - environment variable loading
- `@prisma/client` - database client
- Any package imported in production code

### 2. Add Missing npm Scripts

Consider adding these scripts to the respective `package.json` files:

**apps/api/package.json:**
```json
{
  "scripts": {
    "prisma:generate": "prisma generate --schema=./prisma/schema.prisma",
    "prisma:migrate": "prisma migrate dev --schema=./prisma/schema.prisma"
  }
}
```

### 2. Run Before Committing

Developers should run before pushing:
```bash
# Full build check (mimics Docker build)
pnpm build

# Generate Prisma clients
cd apps/api && pnpm prisma:generate
cd apps/trade && pnpm prisma:generate
```

### 3. TypeScript Strict Mode

The `trade` service has strict TypeScript settings:
- `noUnusedLocals: true`
- `noUnusedParameters: true`

Ensure all variables declared are actually used, or prefix with `_` to indicate intentionally unused:
```typescript
const [_streamName, entries] = result[0]; // ✅ Prefix with _ if intentionally unused
```

### 4. Next.js 14+ Suspense Requirements

Any page using these hooks **must** have a Suspense boundary:
- `useSearchParams()`
- `usePathname()` (in some cases)
- Any dynamic client-side data fetching

---

## 🔍 Troubleshooting Checklist

If you encounter Docker build or runtime issues, check:

### Build Issues
| Issue | Solution |
|-------|----------|
| Node version mismatch | Ensure local Node.js is v22+ (`node -v`) |
| pnpm install fails | Run `pnpm install` at repository root |
| Prisma client missing | Run `npx prisma generate` in api/ and trade/ |
| TypeScript errors | Run `pnpm build` to check for errors |
| Native module failures | Ensure Python3 and build-essential in Dockerfile |

### Runtime Issues (EKS/Kubernetes)
| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `Cannot find module 'X'` | Package in devDependencies | Move to `dependencies` |
| `Cannot find module 'dotenv/config'` | Wrong package name or missing | Check `dotenv` is in dependencies |
| Prisma connection failed | Missing OpenSSL | Add `openssl` to runner stage |
| Suspense boundary error | Missing Suspense wrapper | Wrap `useSearchParams()` in `<Suspense>` |

### Quick Validation Commands
```bash
# Check all builds work locally
docker build -f api.Dockerfile -t anthe-api .
docker build -f web.Dockerfile -t anthe-web .
docker build -f ws.Dockerfile -t anthe-ws .
docker build -f trade.Dockerfile -t anthe-trade .

# Test container locally before pushing
docker run --rm anthe-api node -e "require('dotenv'); console.log('OK')"
docker run --rm anthe-api node -e "require('@prisma/client'); console.log('OK')"
```

---

## 📁 Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `.npmrc` | Created | Enable hoisting for Docker compatibility |
| `.dockerignore` | Created | Prevent local node_modules conflicts |
| `api.Dockerfile` | Modified | Production install with hoisting |
| `ws.Dockerfile` | Modified | Production install with hoisting |
| `trade.Dockerfile` | Modified | Production install with hoisting |
| `web.Dockerfile` | Modified | Next.js standalone output |
| `apps/api/package.json` | Modified | Fixed dotenv dependency |
| `apps/trade/package.json` | Modified | Added @types/pg |
| `apps/ws/package.json` | Modified | Fixed dotenv dependency |
| `apps/web/next.config.ts` | Modified | Added standalone output |
| `apps/web/src/app/copytrade/page.tsx` | Modified | Added Suspense boundary |
| `apps/trade/src/services/encryption.service.ts` | Modified | Removed unused variable |
| `apps/trade/src/services/redis.service.ts` | Modified | Fixed unused variable |

---

*Document generated during Docker containerization of Anthé Labs platform.*
*Last updated: November 28, 2024*

