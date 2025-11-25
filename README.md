# 🧠 Anthé Labs – Copytrade Platform

A modern **Next.js + Nest.js (Turborepo)** project powered by **Supabase** and **Prisma**, built for smart copytrading automation on Aptos blockchain.

---

## 📊 Project Status

### ✅ Completed & Working Features

**Authentication & User Management:**

- ✅ Google OAuth authentication via Supabase
- ✅ Twitter OAuth integration for account verification
- ✅ User account creation with encrypted wallet storage
- ✅ User profile management (name, username, bio)
- ✅ Avatar selection and management
- ✅ Secure wallet creation with encryption

**Pages & UI:**

- ✅ Landing page with features showcase
- ✅ Leaderboard page with premium UI design:
  - Top traders display with animated PNL counters
  - Sorting by PNL, ROI, Volume, or Trades
  - Premium card design with gradients and hover effects
  - Direct copy trade integration from leaderboard
  - "Create Your Own Bot" card
- ✅ **Deposit/Withdraw Modal:**
  - Deposit tab with QR code and wallet address
  - Real-time wallet balance checking
  - Auto-deposit when balance > 1 USDT
  - Trading account balance display
  - Withdraw tab for trading account withdrawals
  - Refresh balance functionality
  - Detailed console logging for debugging
  - Manual deposit amount input
- ✅ Copy Trade Management (`/copytrade`):
  - Premium modal popup for bot creation
  - Aptos wallet address validation
  - Smart ratio allocation mode
  - Allocation slider with percentage display
  - Platform fees information with tooltips
  - Running and stopped bots sections with segmented tabs
  - Bot cards with ID, metrics, and status badges
  - Single running bot limit enforcement
  - Bot restart functionality with pre-filled form
  - Direct integration from leaderboard and profile pages
- ✅ Bot Details Page (`/copytrade/details/[botid]`):
  - Comprehensive bot information display
  - Parameters section (target address, status, mode, allocation)
  - Performance metrics (Total PNL, Realized/Unrealized PNL, Trades, Volume)
  - Open positions table with symbol logos and currency labels
  - Copy trade history table with symbol logos
  - Premium table styling matching trade history design
- ✅ Creator Registration page (`/trader`) with:
  - Aptos wallet connection (OKX, Petra, Martian, Pontem, Fewcha)
  - Professional wallet connection modal
  - Creator registration form (bot name, wallet address)
  - Registration status tracking (pending, approved, rejected)
- ✅ User profile pages (`/profile/[username]`) with:
  - Profile header with avatar, badges, and stats
  - Volume tier system (Bronze, Silver, Gold, etc.)
  - Verified badge with Twitter connection status
  - Statistics display (Volume, PnL, ROI, Trades)
  - Share profile functionality
  - Direct copy trade integration
- ✅ Settings page for user preferences
- ✅ Responsive navigation bar with mobile support:
  - Creator registration link
  - Trading balance display with refresh on tab focus
  - Deposit button with auto-deposit functionality
  - Optimized authentication state management
- ✅ Footer with links and social media
- ✅ Global background effects:
  - Animated sparkles
  - Subtle grid pattern
  - Consistent gradient across all pages
- ✅ Wallet Debug Page (`/wallet-debug`):
  - Test deposit functionality
  - Balance checking (wallet and trading account)
  - Manual deposit amount testing
  - Private key export (encrypted)
  - Comprehensive logging for debugging

**Backend API:**

- ✅ User CRUD operations
- ✅ Wallet management with encryption
- ✅ **Wallet & Deposit Management:**
  - Encrypted private key storage (AES-256-GCM)
  - USDT balance fetching from blockchain
  - Kana Labs API integration for trading account deposits
  - Auto-deposit functionality (triggers when balance > 1 USDT)
  - Trading account balance tracking
  - Wallet account balance checking
  - Deposit to Kana trading account with gas optimization
  - Withdrawal from Kana trading account
  - APT airdrop on first deposit (0.05 APT)
  - Gas wallet management for airdrops
- ✅ Trader statistics and leaderboard
- ✅ Trader registration management (separate from leaderboard)
- ✅ Copy Trade Bots management:
  - Create, read, update, delete copy trade bots
  - Bot status management (running/stopped)
  - Allocation and mode tracking
  - PNL and trade statistics
  - User-specific bot queries
  - Redis syncing for active subscriptions
  - Auto-deposit on bot start/restart
  - Auto-withdrawal on bot stop
- ✅ Redis integration:
  - Redis service with connection management
  - Set operations (SADD, SREM, SCARD)
  - Automatic syncing of bot start/stop events
  - Active trader profiles tracking
  - Subscriber management per trader
- ✅ Twitter integration service
- ✅ Avatar management
- ✅ JWT authentication guard
- ✅ Row Level Security (RLS) policies for copy trade bots

**Database:**

- ✅ Prisma ORM with Supabase PostgreSQL
- ✅ User schema with wallet encryption
- ✅ Trader statistics tracking (leaderboard)
- ✅ Trader registration table (separate from leaderboard)
- ✅ Copy Trade Bots table:
  - User association
  - Trader address tracking
  - Allocation amount and percentage
  - Trading mode (smart_ratio, fixed_amount, advanced)
  - Status tracking (running, stopped)
  - Performance metrics (PNL, total trades)
  - Timestamps (created, started, stopped)
- ✅ Avatar and profile data storage

---

## 🚀 Quick Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/0xali3n/anthe-labs.git
cd anthe-labs
```

### 2️⃣ Install Dependencies

```bash
pnpm install
```

> **Note:** If you don't have pnpm installed:
>
> ```bash
> npm install -g pnpm
> ```

---

### 3️⃣ Environment Setup

#### WebSocket Service (`apps/ws/.env`):

#### Backend API (`apps/api/.env`):

#### Frontend (`apps/web/.env.local`):

### 4️⃣ Database Setup (Supabase + Prisma)

1. **Generate Prisma Client:**

```bash
cd apps/api
pnpm dlx prisma generate
```

---

### 5️⃣ Start Redis (Required Before Running Services)

**⚠️ Important:** Redis must be running before starting any services!

#### Option 1: Using Docker (Recommended)

**First Time Setup:**

1. **Create and Run Redis Container:**

```bash
docker run -d --name redis-anthe -p 6379:6379 redis:latest
```

**After First Setup:**

- **Start Redis:** Use Docker Desktop UI or run:

```bash
docker start redis-anthe
```

- **Stop Redis:**

```bash
docker stop redis-anthe
```

- **View Redis Logs:**

Use RedisInsight Application

---

### 6️⃣ Run the Services

#### 🚀 Run All Services Together

```bash
pnpm run dev:all
```

This will start all three services in parallel:

- Web (Next.js) on port 4000
- API (Nest.js) on port 4001
- WebSocket Service on default port

#### 🖥 Run Services Individually

**Frontend (Next.js):**

```bash
pnpm run dev:web
```

Runs on → [http://localhost:4000](http://localhost:4000)

**Backend API (Nest.js):**

```bash
pnpm run dev:api
```

Runs on → [http://localhost:4001/api](http://localhost:4001/api)

**WebSocket Service:**

```bash
pnpm run dev:ws
```

Monitors order history and pushes to Redis stream

---

## 🏗️ Project Structure

```
anthe-labs/
├── apps/
│   ├── web/              # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/      # Pages & Routes
│   │   │   │   ├── copytrade/  # Copy Trade Management
│   │   │   │   │   └── details/[botid]/  # Bot Details Page
│   │   │   ├── components/  # React Components
│   │   │   └── lib/      # Utilities & API Clients
│   │   │       ├── useAuth.ts  # Centralized Auth Hook
│   │   │       └── copyTradeBotsApi.ts  # Copy Trade API Client
│   │   └── package.json
│   │
│   ├── api/              # Nest.js Backend
│   │   ├── src/
│   │   │   ├── users/    # User Management
│   │   │   ├── wallets/  # Wallet Operations
│   │   │   ├── traders/  # Trader Statistics (Leaderboard)
│   │   │   ├── trader-registrations/  # Creator Registration
│   │   │   ├── copy-trade-bots/  # Copy Trade Bot Management
│   │   │   ├── redis/    # Redis Service & Integration
│   │   │   ├── twitter/  # Twitter Integration
│   │   │   └── avatars/  # Avatar Management
│   │   ├── prisma/       # Database Schema
│   │   └── package.json
│   │
│   └── ws/               # WebSocket Order History Monitor
│       ├── src/
│       │   ├── services/  # Order processing & Redis integration
│       │   │   ├── orderHistoryService.ts  # Main order monitoring service
│       │   │   └── redis.service.ts  # Redis stream operations
│       │   ├── config/    # Configuration management
│       │   ├── constants/ # Application constants
│       │   ├── types/     # TypeScript type definitions
│       │   ├── utils/     # Logger and utilities
│       │   └── server.ts  # Service entry point
│       └── package.json
│
├── packages/             # Shared Packages
└── package.json          # Root Package (Turborepo)
```

---

## 🛠️ Tech Stack

### Frontend

- **Framework:** Next.js 14+ (App Router)
- **Styling:** TailwindCSS
- **Icons:** lucide-react
- **State Management:** React Hooks
- **Authentication:** Supabase Auth

### Backend

- **Framework:** Nest.js
- **ORM:** Prisma
- **Database:** Supabase (PostgreSQL)
- **Cache/Queue:** Redis (ioredis)
- **Authentication:** JWT (Supabase)
- **Encryption:** (for wallet keys)

### Infrastructure

- **Package Manager:** pnpm
- **Monorepo:** Turborepo
- **Database:** Supabase PostgreSQL
- **Cache/Queue:** Redis (Docker)

---

## 📝 Recent Updates

### Wallet & Deposit Management System ✨ (Latest)

- ✅ **Kana Labs API Integration:**
  - Deposit to trading account functionality
  - Withdrawal from trading account (all markets support)
  - Trading balance fetching (`getProfileBalanceSnapshot`)
  - Wallet account balance checking (`getWalletAccountBalance`)
  - Gas-optimized transactions (maxGasAmount: 15000, gasUnitPrice: 100)

- ✅ **Auto-Deposit Feature:**
  - Automatic deposit when wallet balance > 1 USDT
  - Triggers on deposit modal open
  - Checks both Kana API and blockchain balances
  - Uses minimum balance to prevent insufficient funds errors
  - Detailed step-by-step logging in browser console

- ✅ **Deposit/Withdraw Modal:**
  - Deposit tab with QR code and wallet address display
  - Real-time balance fetching and display
  - Auto-deposit threshold: 1 USDT
  - Withdraw tab for trading account withdrawals
  - Refresh balance button
  - Trading balance display in navbar

- ✅ **Bot Lifecycle Integration:**
  - Auto-deposit on bot start/restart
  - Auto-withdrawal on bot stop (withdraws all available balance)
  - Market ID 14 (APT-USD) for withdrawals
  - Balance verification before transactions

- ✅ **APT Airdrop System:**
  - 0.05 APT airdrop on first deposit
  - Gas wallet management
  - Automatic detection of first deposit
  - Private key parsing (supports multiple formats)

- ✅ **Security & Encryption:**
  - AES-256-GCM encryption for private keys
  - Secure private key storage in database
  - Server-side transaction signing
  - No private key exposure to frontend

### WebSocket Service Optimization & Percentage Calculation ✨

- ✅ **Order History Monitoring Service:**
  - Real-time order monitoring via Kana Labs WebSocket
  - Profile address resolution from wallet addresses
  - Automatic reconnection with exponential backoff
  - Deduplication to prevent duplicate orders in Redis
  - In-memory transaction tracking (5-minute TTL)
  - Redis stream-based order storage

- ✅ **Percentage Calculation System:**
  - **Order Types 1-4 (Open/Increase Positions):**
    - Fetches user balance from `getProfileBalanceSnapshot` API
    - Calculates: `percentage = (user_trade / user_real_balance) * 100`
    - Where: `user_trade = order_value / leverage` and `user_real_balance = balance + user_trade`
  - **Order Types 5-6 (Decrease Positions):**
    - Fetches positions from `getPositions` API
    - Calculates: `percentage = (ws_order_size / total_size) * 100`
    - Where: `total_size = ws_order_size + available_order_size`
  - **Order Types 7-8 (Close Positions):**
    - Sets percentage to 100% directly (no calculation needed)
  - All percentages stored in Redis stream with order data

- ✅ **API Integrations:**
  - `getProfileBalanceSnapshot` - Fetches user balance (requires wallet address)
  - `getPositions` - Fetches open positions (requires wallet address)
  - `getProfileAddress` - Resolves profile address from wallet address
  - All APIs use mainnet endpoint: `https://perps-tradeapi.kana.trade`

- ✅ **Code Optimizations:**
  - Removed unused code (syncAddressesFromRedis, transactionVersionExists, unused constants)
  - Improved error handling and state management
  - Better WebSocket connection lifecycle management
  - Optimized order processing with batch deduplication
  - Enhanced logging with detailed calculation displays

- ✅ **Port Configuration:**
  - Web app: Port 4000 (changed from 3000)
  - API: Port 4001 (changed from 3001)
  - All services bind to localhost to avoid permission issues
  - Updated CORS and API URLs throughout codebase

- ✅ **Redis Integration:**
  - Orders stored in Redis stream: `orders:stream`
  - Transaction version deduplication (checks last 100 entries)
  - Efficient stream operations with XADD and XREVRANGE
  - Redis pub/sub for real-time communication between API and WS service

### Redis Integration & Bot Syncing ✨

- ✅ Redis service implementation with ioredis
- ✅ Set operations (SADD, SREM, SCARD) for subscription tracking
- ✅ Automatic Redis syncing for copy-trade bots:
  - `syncStartBot()` - Syncs when bot starts:
    - Adds user to `subs:profile:<traderAddress>` set
    - Adds trader to `profiles:active` set
  - `syncStopBot()` - Syncs when bot stops:
    - Removes user from trader's subscriber set
    - Removes trader from active profiles if no subscribers remain
- ✅ Idempotent Redis operations (safe to call multiple times)
- ✅ Error handling (Redis errors don't break Postgres operations)
- ✅ Integration with CopyTradeBotsService (create/update methods)
- ✅ Redis keys structure:
  - `subs:profile:<traderAddress>` - Set of user addresses subscribing to trader
  - `profiles:active` - Set of trader addresses with active subscribers

### Copy Trade Management System ✨

- ✅ Complete copy trade management implementation
- ✅ Premium modal popup for bot creation with compact design
- ✅ Aptos wallet address validation (real-time with visual feedback)
- ✅ Smart ratio allocation mode with explanation
- ✅ Allocation slider with percentage and amount display
- ✅ Platform fees information with hover tooltips
- ✅ Running and stopped bots sections with premium segmented tabs
- ✅ Bot cards with:
  - 5-8 digit bot ID generation
  - Status badges with icons
  - Performance metrics (PNL, trades)
  - Details and stop/restart buttons
- ✅ Single running bot limit enforcement
- ✅ Bot restart functionality with pre-filled form data
- ✅ Bot details page (`/copytrade/details/[botid]`):
  - Comprehensive bot information
  - Performance metrics dashboard
  - Open positions table with symbol logos
  - Copy trade history table with symbol logos and currency labels
- ✅ Database integration:
  - `CopyTradeBot` table with full schema
  - Row Level Security (RLS) policies
  - Prisma schema and migrations
- ✅ Direct integration:
  - Copy trade from leaderboard (pre-fills trader address)
  - Copy trade from user profiles
  - Create custom bot from leaderboard
- ✅ Premium UI/UX improvements:
  - Consistent styling across all pages
  - Global background effects (sparkles, grid pattern)
  - Improved typography and spacing
  - Enhanced card designs with gradients
  - Micro-interactions and hover effects

### Authentication & State Management Improvements ✨

- ✅ Centralized authentication with `useAuth` hook
- ✅ Optimized session management and persistence
- ✅ Tab visibility handling for auth state refresh
- ✅ Singleton Supabase client pattern
- ✅ Improved loading states and error handling
- ✅ Balance refresh on tab focus

### UI/UX Polish & Premium Design ✨

- ✅ Leaderboard page redesign:
  - Premium card styling
  - Centered layout and alignment
  - Improved typography and spacing
  - Consistent color scheme
- ✅ Creator Registration rebranding:
  - Changed "Trader" to "Creator" throughout
  - Updated navigation and buttons
  - Clearer terminology (traders = users, creators = bot creators)
- ✅ Global background effects:
  - Animated sparkles
  - Subtle grid pattern
  - Consistent gradient across pages
- ✅ Table improvements:
  - Symbol logos (BTC, ETH, APT)
  - Currency labels below size values
  - Premium table styling
  - Consistent column headers

### Previous Updates

- ✅ Trader registration page (`/trader`) implementation
- ✅ Aptos wallet browser extension integration
- ✅ Profile page redesign with professional UI
- ✅ Volume tier system with hover tooltips
- ✅ User authentication flow with Google OAuth
- ✅ Wallet creation and encryption
- ✅ Leaderboard page implementation
- ✅ Settings page with user preferences
- ✅ Twitter OAuth integration
- ✅ Avatar selection system
- ✅ Mobile-responsive navigation

---

## 🔐 Security Features

- ✅ Encrypted wallet private key storage
- ✅ JWT-based API authentication
- ✅ Supabase Row Level Security (RLS)
- ✅ Input validation and sanitization
- ✅ CORS protection
- ✅ Non-custodial wallet architecture

---

**Built with ❤️ on Aptos Blockchain**
