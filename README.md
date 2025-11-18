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
- ✅ Leaderboard page with top traders
- ✅ Trader registration page (`/trader`) with:
  - Aptos wallet connection (OKX, Petra, Martian, Pontem, Fewcha)
  - Professional wallet connection modal
  - Trader registration form (bot name, wallet address)
  - Registration status tracking (pending, approved, rejected)
- ✅ User profile pages (`/profile/[username]`) with:
  - Profile header with avatar, badges, and stats
  - Volume tier system (Bronze, Silver, Gold, etc.)
  - Verified badge with Twitter connection status
  - Statistics display (Volume, PnL, ROI, Trades)
  - Share profile functionality
- ✅ Settings page for user preferences
- ✅ Responsive navigation bar with mobile support
- ✅ Footer with links and social media

**Backend API:**

- ✅ User CRUD operations
- ✅ Wallet management with encryption
- ✅ Trader statistics and leaderboard
- ✅ Trader registration management (separate from leaderboard)
- ✅ Twitter integration service
- ✅ Avatar management
- ✅ JWT authentication guard

**Database:**

- ✅ Prisma ORM with Supabase PostgreSQL
- ✅ User schema with wallet encryption
- ✅ Trader statistics tracking (leaderboard)
- ✅ Trader registration table (separate from leaderboard)
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

Runs on → [http://localhost:3000](http://localhost:3000)

#### ⚙️ Backend (Nest.js API)

```bash
pnpm run dev:api
```

Runs on → [http://localhost:3001/api](http://localhost:3001/api)

---

## 🏗️ Project Structure

```
anthe-labs/
├── apps/
│   ├── web/              # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/      # Pages & Routes
│   │   │   ├── components/  # React Components
│   │   │   └── lib/      # Utilities & API Clients
│   │   └── package.json
│   │
│   └── api/              # Nest.js Backend
│       ├── src/
│       │   ├── users/    # User Management
│       │   ├── wallets/  # Wallet Operations
│       │   ├── traders/  # Trader Statistics (Leaderboard)
│       │   ├── trader-registrations/  # Trader Registration
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
- **Authentication:** JWT (Supabase)
- **Encryption:** AES-256-GCM (for wallet keys)

### Infrastructure

- **Package Manager:** pnpm
- **Monorepo:** Turborepo
- **Database:** Supabase PostgreSQL

---

## 📝 Recent Updates

### Trader Registration & Wallet Integration ✨

- ✅ Trader registration page (`/trader`) implementation
- ✅ Aptos wallet browser extension integration (OKX, Petra, Martian, Pontem, Fewcha)
- ✅ Professional wallet connection modal with wallet detection
- ✅ Trader registration system with bot name and wallet address
- ✅ Separate `TraderRegistration` database table (distinct from leaderboard)
- ✅ Registration status tracking (pending, approved, rejected)
- ✅ State management improvements for navigation and loading
- ✅ Wallet encryption performance analysis and optimization

### Profile Page Branch ✨

- ✅ Complete profile page redesign with professional UI
- ✅ Volume tier system with hover tooltips
- ✅ Verified badge with Twitter connection status
- ✅ Responsive design for mobile and desktop
- ✅ Search functionality with user avatars
- ✅ Statistics display (Volume, PnL, ROI, Trades)
- ✅ Share profile buttons (Twitter, Telegram, Copy Link)

### Previous Updates

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
