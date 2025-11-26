# 🧠 Anthé Labs – Copytrade Platform

A modern **Next.js + Nest.js (Turborepo)** project for smart copytrading automation on Aptos blockchain.

---

## 🚀 Quick Setup

### 1️⃣ Install Dependencies

```bash
pnpm install
```

### 2️⃣ Environment Setup

Create `.env` files in:

- `apps/api/.env` - Backend API configuration
- `apps/web/.env.local` - Frontend configuration
- `apps/ws/.env` - WebSocket service configuration

### 3️⃣ Database Setup

```bash
cd apps/api
pnpm prisma generate
```

### 4️⃣ Start Redis

```bash
docker run -d --name redis-anthe -p 6379:6379 redis:latest
```

Or start existing container:

```bash
docker start redis-anthe
```

### 5️⃣ Run Services

**All services:**

```bash
pnpm run dev:all
```

**Individual services:**

```bash
pnpm run dev:web    # Frontend (port 4000)
pnpm run dev:api    # Backend API (port 4001)
pnpm run dev:ws     # WebSocket service
```

---

## ✨ Features

### Authentication & User Management

- Google OAuth via Supabase
- Twitter OAuth for verification
- Encrypted wallet storage (AES-256-GCM)
- User profiles with avatars

### Copy Trade Management

- Create/start/stop copy trade bots
- Smart ratio & fixed amount allocation modes
- Real-time PNL tracking
- Open positions table with live data
- Trade history with full order details
- Single running bot limit

### Wallet & Deposit System

- Auto-deposit when balance > 1 USDT
- Trading account balance tracking
- Withdrawal from trading account
- Kana Labs API integration
- APT airdrop on first deposit (0.05 APT)
- Gas-optimized transactions

### Leaderboard & Profiles

- Top traders with PNL/ROI sorting
- User profile pages with stats
- Volume tier system
- Direct copy trade integration

### WebSocket Service

- Real-time order monitoring
- Percentage calculation for all order types
- Redis stream storage
- Automatic reconnection

---

## 🏗️ Project Structure

```
anthe-labs/
├── apps/
│   ├── web/          # Next.js Frontend
│   ├── api/          # Nest.js Backend
│   └── ws/           # WebSocket Service
└── packages/         # Shared Packages
```

---

## 🛠️ Tech Stack

**Frontend:** Next.js 14, TailwindCSS, Supabase Auth  
**Backend:** Nest.js, Prisma, PostgreSQL (Supabase)  
**Infrastructure:** Redis, Docker, Turborepo

---

## 📝 Recent Updates

### Copy Trade Page Redesign ✨

- ✅ Horizontal full-width bot cards with compact details
- ✅ Integrated Open Positions table (real-time data)
- ✅ Copy Trade History section with full trade details
- ✅ Real API integration for positions and trade history
- ✅ Fee column in trade history
- ✅ Proper order type mapping (Long, Short, Exit Long, Exit Short)
- ✅ Parallel API calls for optimal performance

### Code Cleanup & Optimization ✨

- ✅ Removed all debug console logs
- ✅ Created shared utility modules (marketUtils, authUtils, formatUtils)
- ✅ Modularized API calls - no code duplication
- ✅ Removed debug pages and endpoints for production
- ✅ Cleaned up unnecessary code and imports

### Wallet & Deposit Management ✨

- ✅ Kana Labs API integration (deposit/withdraw)
- ✅ Auto-deposit when balance > 1 USDT
- ✅ Trading balance display in navbar
- ✅ Gas-optimized transactions
- ✅ APT airdrop on first deposit
- ✅ Bot lifecycle integration (auto-deposit/withdraw)

### WebSocket Service ✨

- ✅ Real-time order monitoring
- ✅ Percentage calculation for all order types
- ✅ Redis stream storage
- ✅ Automatic reconnection with backoff

### Copy Trade System ✨

- ✅ Bot creation/management UI
- ✅ Smart ratio allocation mode
- ✅ Redis syncing for active subscriptions

---

## 🔐 Security

- ✅ AES-256-GCM encryption for private keys
- ✅ JWT-based API authentication
- ✅ Supabase Row Level Security (RLS)
- ✅ Server-side transaction signing
- ✅ Non-custodial wallet architecture

---

**Built with ❤️ on Aptos Blockchain**
