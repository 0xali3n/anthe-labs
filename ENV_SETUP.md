# 🔧 Environment Setup Guide

## Quick Setup Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
cd apps/api
pnpm dlx prisma generate
cd ../..

# 3. Start Redis (if not running)
docker start redis-anthe
# OR create new: docker run -d --name redis-anthe -p 6379:6379 redis:latest

# 4. Run all services
pnpm run dev:all
```

---

## 📝 Environment Files to Create

### 1. `apps/api/.env`

```env
# Database (Supabase PostgreSQL - Use Connection Pooling port 6543)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:6543/postgres?pgbouncer=true"

# Supabase Configuration
SUPABASE_URL="https://[YOUR-PROJECT].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"

# Encryption Key (CRITICAL - Must be same as before if you have existing wallets!)
# Generate new: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="[YOUR-32-BYTE-HEX-KEY]"

# Kana Labs API
KANA_API_KEY="[YOUR-KANA-API-KEY]"
KANA_REST="https://perps-tradeapi.kanalabs.io"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# API Configuration
API_URL="http://localhost:4001"
NEXT_PUBLIC_API_URL="http://localhost:4001/api"
PORT=4001
```

### 2. `apps/web/.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"

# API URL
NEXT_PUBLIC_API_URL="http://localhost:4001/api"

# Site URL
NEXT_PUBLIC_SITE_URL="http://localhost:4000"
```

### 3. `apps/ws/.env`

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

---

## 🔑 Where to Get Values

### Supabase (Database & Auth)
1. Go to: https://supabase.com/dashboard
2. Select your project
3. **Database URL**: Settings → Database → Connection Pooling → Copy "Connection string" (use port 6543)
4. **API Keys**: Settings → API → Copy:
   - `URL` → `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### Kana Labs API Key
1. Go to: Kana Labs Dashboard
2. Get your API key from settings
3. Use: `KANA_API_KEY="your-key-here"`

### Encryption Key
**⚠️ IMPORTANT**: If you have existing wallets in the database, you MUST use the SAME encryption key, otherwise you won't be able to decrypt them!

If you need to generate a new one (only if starting fresh):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `apps/api/.env` exists with all variables
- [ ] `apps/web/.env.local` exists with all variables
- [ ] `apps/ws/.env` exists with all variables
- [ ] Redis is running: `docker ps | grep redis`
- [ ] Prisma client generated: `ls apps/api/node_modules/.prisma/client`
- [ ] All dependencies installed: `pnpm install` completed successfully

---

## 🚀 Start Services

```bash
# Option 1: All services together
pnpm run dev:all

# Option 2: Individual terminals
# Terminal 1:
pnpm run dev:web

# Terminal 2:
pnpm run dev:api

# Terminal 3:
pnpm run dev:ws
```

---

## 🐛 Common Issues

### "ENCRYPTION_KEY is required"
- Make sure `apps/api/.env` has `ENCRYPTION_KEY` set
- Must be at least 16 characters

### "Kana API key not configured"
- Add `KANA_API_KEY` to `apps/api/.env` and `apps/ws/.env`
- Restart the server after adding

### "Redis connection failed"
- Start Redis: `docker start redis-anthe`
- Or create: `docker run -d --name redis-anthe -p 6379:6379 redis:latest`

### "Prisma Client not found"
- Run: `cd apps/api && pnpm dlx prisma generate`

### Port already in use
- Change `PORT=4001` in `apps/api/.env` to a different port
- Update `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` accordingly

