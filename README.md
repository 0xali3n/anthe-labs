# 🧠 Anthe Labs – Copytrade Platform

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
- `apps/trade/.env` - Trade execution service configuration

**Required environment variables:**

**API Service (`apps/api/.env`):**

- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `KANA_API_KEY` - Kana Labs API key
- `KANA_REST` - Kana Labs REST API URL (default: `https://perps-tradeapi.kana.trade`)
- `ENCRYPTION_KEY` - AES-256-GCM encryption key (32+ characters)
- `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: `6379`)
- `JWT_SECRET` - JWT secret for authentication

**Trade Service (`apps/trade/.env`):**

- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `KANA_API_KEY` - Kana Labs API key
- `KANA_REST` - Kana Labs REST API URL (default: `https://perps-tradeapi.kana.trade`)
- `ENCRYPTION_KEY` - AES-256-GCM encryption key (must match API service)
- `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: `6379`)

**WebSocket Service (`apps/ws/.env`):**

- `KANA_API_KEY` - Kana Labs API key
- `KANA_REST` - Kana Labs REST API URL (default: `https://perps-tradeapi.kana.trade`)
- `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: `6379`)

### 3️⃣ Database Setup

Generate Prisma clients for both API and Trade services:

```bash
# Generate Prisma client for API service
cd apps/api
pnpm prisma generate

# Generate Prisma client for Trade service
cd ../trade
pnpm prisma:generate
```

Or generate both at once from root:

```bash
cd apps/api && pnpm prisma generate && cd ../trade && pnpm prisma:generate
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
pnpm run dev:trade  # Trade execution service
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
- Simplified bot start form (address only, no allocation input)
- Smart ratio allocation mode (automatic position size matching)
- Minimum balance requirement (10 USDT) to start bots
- Open positions table with live data and refresh button
- Trade history with full order details and refresh button
- Single running bot limit
- PNL and Trades display (Coming Soon placeholder)
- **Automatic position closing**: When stopping a bot, all open positions are automatically closed using Kana Labs API
- **Close all positions**: Uses `placeMultipleOrders` for efficient parallel position closing
- **Premium navigation**: Arrow key and button navigation for stopped bots with smooth scrolling
- **Clean UI**: Hidden scrollbar with professional arrow button controls

### Wallet & Deposit System

- Auto-deposit when balance > 1 USDT
- Trading account balance tracking
- Withdrawal from trading account
- **Withdrawal restriction**: Cannot withdraw while running bots exist
- Kana Labs API integration (kana.trade domain)
- APT airdrop on first deposit (0.05 APT)
- Gas-optimized transactions
- **Position closing API**: Close individual or all positions using `placeMarketOrder` with 100% close direction
- **Parallel position closing**: Optimized closing of multiple positions using `placeMultipleOrders`

### Leaderboard & Profiles

- Top traders with PNL/ROI sorting
- User profile pages with stats
- Volume tier system
- Direct copy trade integration

### Feedback System

- User feedback submission (title and message)
- Feedback history display
- Secure storage with RLS policies

### Media Kit & Brand Assets

- Professional media kit page with downloadable logos and brand assets
- Download functionality for all brand assets (PNG format)
- Responsive grid layout with minimal, clean design
- Footer navigation integration

### Contact Page

- Professional contact page with premium styling
- Visible email address display (anthefinance@gmail.com)
- Social media links (Twitter, LinkedIn, Telegram)
- Response time information
- Background pattern matching site design

### WebSocket Service

- Real-time order monitoring
- Percentage calculation for all order types
- Optimized Redis stream format (pre-calculated tradeSide, direction, orderType)
- Redis stream storage
- Automatic reconnection

### Trade Execution Service

- Listens to Redis streams for new orders
- Fetches subscriber list for each trader
- **Smart ratio calculation**: Balance × Percentage × Leverage / Price
- **Close order logic**: Uses 100% of user's current position size
- Parallel processing for multiple trades and subscribers
- Per-account transaction queuing (prevents mempool conflicts)
- Market and Limit order support
- Gas-optimized transactions (maxGasAmount: 10000, gasUnitPrice: 100)
- Automatic stream entry deletion after successful processing

---

## 🏗️ Project Structure

```
anthe-labs/
├── apps/
│   ├── web/          # Next.js Frontend
│   ├── api/          # Nest.js Backend API
│   ├── ws/           # WebSocket Service (order monitoring)
│   └── trade/        # Trade Execution Service
└── packages/         # Shared Packages
```

---

## 🛠️ Tech Stack

**Frontend:** Next.js 14, TailwindCSS, Supabase Auth  
**Backend:** Nest.js, Prisma, PostgreSQL (Supabase)  
**Infrastructure:** Redis, Docker, Turborepo

---

## 📝 Recent Updates

### UI/UX Improvements ✨

- ✅ Simplified bot start form (removed allocation input, just address + start)
- ✅ PNL and Trades show "Coming Soon" placeholder instead of dummy values
- ✅ Added refresh buttons for Open Positions and Trade History sections
- ✅ Minimum balance check (10 USDT) before starting bots
- ✅ Withdrawal restriction: Cannot withdraw while running bots exist

### Trade Execution Service ✨

- ✅ Complete trade execution logic implementation
- ✅ Smart ratio calculation: `Balance × Percentage × Leverage / Price`
- ✅ Close order logic: Uses 100% of user's current position size (fetched from API)
- ✅ Per-account transaction queuing (prevents "Transaction already in mempool" errors)
- ✅ Parallel processing for multiple trades and subscribers
- ✅ Market and Limit order support
- ✅ Automatic Redis stream entry deletion after processing
- ✅ Comprehensive error handling and logging
- ✅ Gas-optimized transactions

### Copy Trade Page Redesign ✨

- ✅ Horizontal full-width bot cards with compact details
- ✅ Integrated Open Positions table (real-time data)
- ✅ Copy Trade History section with full trade details
- ✅ Real API integration for positions and trade history
- ✅ Fee column in trade history
- ✅ Proper order type mapping (Long, Short, Exit Long, Exit Short)
- ✅ Parallel API calls for optimal performance

### Copy Trade Page Navigation Enhancements ✨

- ✅ Arrow key navigation (Left/Right) for horizontal scrolling of stopped bots
- ✅ Premium left and right arrow buttons at container edges
- ✅ Hidden scrollbar for clean, professional UI
- ✅ Dynamic arrow visibility based on scroll position
- ✅ Smooth scrolling animations with card-width-based navigation
- ✅ Responsive arrow positioning (mobile/desktop optimized)
- ✅ Premium button styling with gradient backgrounds, shadows, and hover effects
- ✅ Icon animations on hover (translate effects)
- ✅ Scroll position tracking with resize event handling

### Code Cleanup & Optimization ✨

- ✅ Removed all debug console logs
- ✅ Created shared utility modules (marketUtils, authUtils, formatUtils)
- ✅ Modularized API calls - no code duplication
- ✅ Removed debug pages and endpoints for production
- ✅ Cleaned up unnecessary code and imports
- ✅ Modular architecture for trade service (order-execution, stream-processor services)

### Wallet & Deposit Management ✨

- ✅ Kana Labs API integration (deposit/withdraw) - using kana.trade domain
- ✅ Auto-deposit when balance > 1 USDT
- ✅ Trading balance display in navbar
- ✅ Gas-optimized transactions
- ✅ APT airdrop on first deposit
- ✅ Bot lifecycle integration (auto-deposit/withdraw)

### WebSocket Service ✨

- ✅ Real-time order monitoring
- ✅ Percentage calculation for all order types
- ✅ Optimized Redis stream format (pre-calculated tradeSide, direction, orderType)
- ✅ Redis stream storage
- ✅ Automatic reconnection with backoff

### Copy Trade System ✨

- ✅ Bot creation/management UI
- ✅ Smart ratio allocation mode
- ✅ Redis syncing for active subscriptions

### Feedback Feature ✨

- ✅ User feedback submission form
- ✅ Feedback history with timestamps
- ✅ Row Level Security (RLS) policies
- ✅ Simple read/write operations
- ✅ Footer navigation link

### Leaderboard Enhancements ✨

- ✅ Trader details modal with live positions and trade history
- ✅ Details button on each trader card
- ✅ Pagination for trade history (10 trades per page)
- ✅ Real-time data refresh functionality

### Profile Page Enhancements ✨

- ✅ Data update timer showing time until next refresh (40th minute of each hour IST)
- ✅ Professional countdown display

### SEO & Metadata ✨

- ✅ Sitemap.xml auto-generation (all main pages)
- ✅ Structured data (JSON-LD) for Organization and WebSite
- ✅ Updated robots.txt with proper crawl directives
- ✅ Open Graph and Twitter Card metadata
- ✅ Professional SEO descriptions and titles
- ✅ Fixed canonical URLs (auto-generated per page)
- ✅ Correct favicon configuration (using logo.png)
- ✅ Google Analytics integration (G-189XLPG1XZ)
- ✅ Microsoft Clarity integration (uqorc6dezx)
- ✅ Consolidated SEO documentation
- ✅ Added Media Kit and Contact pages to sitemap
- ✅ Brand name standardization: "Anthé" → "Anthe" (SEO optimization)
- ✅ Site URL standardized to `https://anthe.io` across all pages

### Position Management & Bot Lifecycle ✨

- ✅ Close position API using Kana Labs `placeMarketOrder` with `direction: true` (100% close)
- ✅ Close all positions functionality using `placeMultipleOrders` for multiple positions
- ✅ Automatic position closing when stopping copy trade bots
- ✅ Parallel processing for closing multiple positions (optimized performance)
- ✅ Integrated into copytrade page "stop bot" functionality
- ✅ Removed blocking transaction waits for improved speed

### Media Kit & Contact Pages ✨

- ✅ Professional media kit page with downloadable brand assets
- ✅ Responsive grid layout with minimal, clean design
- ✅ Download functionality for all logo and favicon files
- ✅ Redesigned contact page with premium styling
- ✅ Visible email address display (anthefinance@gmail.com)
- ✅ Footer navigation links for both pages
- ✅ Consistent background patterns matching site design

---

## 🔐 Security

- ✅ AES-256-GCM encryption for private keys
- ✅ JWT-based API authentication
- ✅ Supabase Row Level Security (RLS)
- ✅ Server-side transaction signing
- ✅ Non-custodial wallet architecture

---

**Built with ❤️ on Aptos Blockchain**
