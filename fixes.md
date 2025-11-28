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

## ✅ Final Verification

All 4 Docker images build successfully:

```bash
docker build -f api.Dockerfile -t anthe-api .     # ✅ Success
docker build -f web.Dockerfile -t anthe-web .     # ✅ Success
docker build -f ws.Dockerfile -t anthe-ws .       # ✅ Success
docker build -f trade.Dockerfile -t anthe-trade . # ✅ Success
```

---

## 📋 Recommendations for Development Team

### 1. Add Missing npm Scripts

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

## 📞 Contact

If you encounter any Docker build issues, check:
1. Is your local Node.js version 22+?
2. Did you run `pnpm install` at the root?
3. Did you run `prisma generate` for api and trade?
4. Are there any TypeScript errors? (`pnpm build`)

---

*Document generated during Docker containerization of Anthé Labs platform.*

