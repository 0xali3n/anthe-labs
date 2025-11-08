## 🧠 Anthé Labs – Copytrade Platform

A modern **Next.js + Nest.js (Turborepo)** project powered by **Supabase** and **Prisma**, built for smart copytrading automation.

---

## 📋 Overview

This PR implements:

- ✅ User authentication with Supabase (Google OAuth)
- ✅ Automatic Aptos wallet generation for users
- ✅ Secure wallet encryption (AES-256-GCM)
- ✅ Backend API with NestJS
- ✅ Frontend integration with Next.js
- ✅ User settings page with profile editing
- ✅ Avatar selection (Google photo or custom avatars)
- ✅ Twitter OAuth integration (connect/disconnect)

---

## 🚀 Quick Start (For Review)

### 1️⃣ Install Dependencies

```bash
pnpm install
```

### 2️⃣ Environment Variables

**Backend (`apps/api/.env`):**

- `.env` file will be shared separately (contains all required variables)

**Frontend (`apps/web/.env.local`):**

- `.env.local` file will be shared separately (contains all required variables)

### 3️⃣ Generate Prisma Client

```bash
cd apps/api
pnpm dlx prisma generate
```

### 4️⃣ Run the Apps

```bash
# Run both frontend and backend
pnpm dev
```

Or run separately:

```bash
# Terminal 1 - Frontend
pnpm --filter web dev
# Runs on → http://localhost:3000

# Terminal 2 - Backend
pnpm --filter api start:dev
# Runs on → http://localhost:3001/api
```

---

## 🏗️ Architecture

### Frontend (Next.js)

- **Location**: `apps/web/`
- **Framework**: Next.js 16 (App Router)
- **Styling**: TailwindCSS
- **Auth**: Supabase client-side authentication

### Backend (NestJS)

- **Location**: `apps/api/`
- **Framework**: NestJS 11
- **Database**: Prisma ORM → Supabase PostgreSQL
- **Auth**: JWT verification with Supabase

### Key Features

- **User Authentication**: Google OAuth via Supabase
- **Wallet Generation**: Automatic Aptos wallet creation on user signup
- **Encryption**: AES-256-GCM for private key storage
- **Security**: Private keys never exposed to frontend
- **User Settings**: Profile editing, avatar selection, Twitter integration

---

## 📁 Project Structure

```
anthe/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   ├── components/    # React components
│   │   │   └── lib/            # Utilities & API clients
│   │   └── .env.local          # Frontend env vars
│   │
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── users/          # User management
│       │   ├── wallets/        # Wallet operations
│       │   ├── auth/           # JWT authentication
│       │   ├── encryption/     # AES-256-GCM encryption
│       │   ├── twitter/        # Twitter OAuth integration
│       │   └── prisma/          # Prisma service
│       ├── prisma/
│       │   ├── schema.prisma    # Database schema
│       │   └── wallets-setup.sql # SQL for wallets table
│       └── .env                 # Backend env vars
│
└── README.md                   # This file
```

---

## 🔄 User Flow

1. User signs in with Google → Supabase OAuth
2. Frontend calls `/api/users/upsert` with JWT token
3. Backend verifies JWT → Creates/updates user in database
4. Backend automatically generates Aptos wallet (if new user)
5. Private key is encrypted (AES-256-GCM) and stored
6. Wallet address returned to frontend → Displayed in UI

**Detailed flow**: See `USER_ACCOUNT_FLOW.md` for complete technical documentation.

---

## 🔐 Security Features

- ✅ **JWT Authentication**: All protected endpoints verify Supabase JWT tokens
- ✅ **Input Validation**: DTOs with `class-validator` prevent injection attacks
- ✅ **CORS Protection**: Environment-based origin whitelist
- ✅ **Encryption**: AES-256-GCM for private keys (never exposed to frontend)
- ✅ **Row Level Security**: RLS enabled in Supabase for wallet data
- ✅ **Backend-only**: Wallet generation happens only on server-side

---

## 📡 API Endpoints

**Base URL**: `http://localhost:3001/api`

### Protected Endpoints (Require JWT)

- `POST /api/users/upsert` - Create or update user (auto-creates wallet)
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update user profile (display name, username, avatar)
- `GET /api/wallets/me` - Get current user's wallet
- `GET /api/twitter/connect` - Get Twitter OAuth URL
- `GET /api/twitter/callback` - Twitter OAuth callback
- `POST /api/twitter/disconnect` - Disconnect Twitter account

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 + TailwindCSS + TypeScript
- **Backend**: NestJS 11 + Prisma + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth, PKCE flow)
- **Blockchain**: Aptos SDK
- **Encryption**: AES-256-GCM (Node.js crypto)
- **Package Manager**: pnpm
- **Architecture**: Turborepo Monorepo

---

## 📝 Notes

- Database tables (`users` and `wallets`) are already created in Supabase
- Environment variables will be shared separately
- All sensitive keys are stored in `.env` files (not committed)
- Encryption key is required for wallet operations

---
