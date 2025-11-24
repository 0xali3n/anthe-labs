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
  - Balance display with refresh on tab focus
  - Optimized authentication state management
- ✅ Footer with links and social media
- ✅ Global background effects:
  - Animated sparkles
  - Subtle grid pattern
  - Consistent gradient across all pages

**Backend API:**

- ✅ User CRUD operations
- ✅ Wallet management with encryption
- ✅ Trader statistics and leaderboard
- ✅ Trader registration management (separate from leaderboard)
- ✅ Copy Trade Bots management:
  - Create, read, update, delete copy trade bots
  - Bot status management (running/stopped)
  - Allocation and mode tracking
  - PNL and trade statistics
  - User-specific bot queries
  - Redis syncing for active subscriptions
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

#### Backend ( `apps/web/.env.local`):

#### Frontend ( `apps/api/.env`):

---

### 4️⃣ Database Setup (Supabase + Prisma)

1. **Generate Prisma Client:**

```bash
cd apps/api
pnpm dlx prisma generate
```

2. **Sync Schema with Supabase (if needed):**

```bash
pnpm dlx prisma db pull
```

---

### 5️⃣ Run the Apps

#### 🖥 Frontend (Next.js)

```bash
pnpm run dev:web
```

Runs on → [http://localhost:4000](http://localhost:4000)

#### ⚙️ Backend (Nest.js API)

```bash
pnpm run dev:api
```

Runs on → [http://localhost:4001/api](http://localhost:4001/api)

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
│   └── api/              # Nest.js Backend
│       ├── src/
│       │   ├── users/    # User Management
│       │   ├── wallets/  # Wallet Operations
│       │   ├── traders/  # Trader Statistics (Leaderboard)
│       │   ├── trader-registrations/  # Creator Registration
│       │   ├── copy-trade-bots/  # Copy Trade Bot Management
│       │   ├── redis/    # Redis Service & Integration
│       │   ├── twitter/  # Twitter Integration
│       │   └── avatars/  # Avatar Management
│       ├── prisma/       # Database Schema
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
- **Encryption:** AES-256-GCM (for wallet keys)

### Infrastructure

- **Package Manager:** pnpm
- **Monorepo:** Turborepo
- **Database:** Supabase PostgreSQL
- **Cache/Queue:** Redis (Docker)

---

## 📝 Recent Updates

### Redis Integration & Bot Syncing ✨ (Current Branch)

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
