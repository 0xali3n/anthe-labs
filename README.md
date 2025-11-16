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
- ✅ Twitter integration service
- ✅ Avatar management
- ✅ JWT authentication guard

**Database:**

- ✅ Prisma ORM with Supabase PostgreSQL
- ✅ User schema with wallet encryption
- ✅ Trader statistics tracking
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

Create a `.env` file in the root directory with the following variables:

#### Frontend (`.env` in root or `apps/web/.env`):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

#### Backend (`.env` in `apps/api/`):

```env
# Database
DATABASE_URL="postgresql://user:password@host:6543/postgres"

# Supabase (for JWT verification)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS (optional)
ALLOWED_ORIGINS=http://localhost:3000

# Twitter OAuth (optional, for Twitter integration)
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_CALLBACK_URL=http://localhost:3000/twitter-callback

# Encryption (for wallet private keys)
ENCRYPTION_KEY=your_32_character_encryption_key
```

> **Important:**
>
> - Get your Supabase credentials from [Supabase Dashboard](https://app.supabase.com)
> - Generate a secure 32-character encryption key for wallet encryption
> - Replace all placeholder values with your actual credentials

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

3. **Run Migrations (if any):**

```bash
pnpm dlx prisma migrate dev
```

> **Note:** The database schema is managed through Prisma. Make sure your Supabase database is accessible via the `DATABASE_URL` in your `.env` file.

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

#### 🔁 Run Both (Monorepo mode)

```bash
pnpm dev
```

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
│       │   ├── traders/  # Trader Statistics
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
- **Deployment:** Ready for Vercel (Frontend) + Railway/Render (Backend)

---

## 📝 Recent Updates

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

## 📚 Additional Documentation

- [User Account Flow](./USER_ACCOUNT_FLOW.md) - Complete user creation and wallet setup flow
- [Tier System Design](./TIER_SYSTEM_DESIGN.md) - Volume tier thresholds and design

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🚧 Roadmap

- [ ] Copy Trading execution engine
- [ ] Grid Bots implementation
- [ ] AI-powered trading bots
- [ ] Social feed for traders
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)

---

**Built with ❤️ on Aptos Blockchain**
