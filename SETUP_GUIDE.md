# 🚀 Complete Setup Guide

## Step 1: Install Dependencies

```bash
# From root directory
pnpm install
```

## Step 2: Environment Files

### `apps/api/.env`

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:6543/postgres?pgbouncer=true"

# Supabase
SUPABASE_URL="https://[YOUR-PROJECT].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"

# Encryption (REQUIRED - Generate a new one if you don't have it)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="[YOUR-32-BYTE-HEX-KEY]"

# Kana Labs API
KANA_API_KEY="[YOUR-KANA-API-KEY]"
KANA_REST="https://perps-tradeapi.kanalabs.io"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# API URL
API_URL="http://localhost:4001"
NEXT_PUBLIC_API_URL="http://localhost:4001/api"

# Port
PORT=4001
```

### `apps/web/.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"

# API URL
NEXT_PUBLIC_API_URL="http://localhost:4001/api"

# Site URL
NEXT_PUBLIC_SITE_URL="http://localhost:4000"
```

### `apps/ws/.env`

```env
# Kana Labs API
KANA_API_KEY="[YOUR-KANA-API-KEY]"
KANA_REST="https://perps-tradeapi.kanalabs.io"
KANA_WS="wss://perpetuals-indexer-ws.kana.trade/ws/"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Environment
NODE_ENV="development"
```

## Step 3: Generate Prisma Client

```bash
cd apps/api
pnpm dlx prisma generate
```

## Step 4: Start Redis (Required!)

### Using Docker:

```bash
docker run -d --name redis-anthe -p 6379:6379 redis:latest
```

### Or start existing container:

```bash
docker start redis-anthe
```

## Step 5: Run Services

### All services together:

```bash
pnpm run dev:all
```

### Or individually:

```bash
# Terminal 1 - Web
pnpm run dev:web

# Terminal 2 - API
pnpm run dev:api

# Terminal 3 - WebSocket
pnpm run dev:ws
```

## 🔑 Important Notes:

1. **ENCRYPTION_KEY**: If you lost your old key, you'll need to generate a new one. **WARNING**: This means you won't be able to decrypt existing wallets! If you have existing users, you MUST use the same key.

2. **DATABASE_URL**: Use the pooled connection (port 6543) from Supabase dashboard → Settings → Database → Connection Pooling

3. **KANA_API_KEY**: Get this from Kana Labs dashboard

4. **Supabase Keys**: Get from Supabase dashboard → Settings → API

## 🐛 Troubleshooting:

- **Prisma errors**: Run `pnpm dlx prisma generate` in `apps/api`
- **Redis connection errors**: Make sure Redis is running (`docker ps` to check)
- **Port conflicts**: Change PORT in `.env` files
- **Encryption errors**: Make sure ENCRYPTION_KEY is at least 16 characters
