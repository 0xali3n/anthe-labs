# Setup Guide - User Database & API Integration

## ✅ What's Been Created

### 1. Database Schema (`apps/api/prisma/schema.prisma`)

- User table with all fields from your old project
- Timestamps, settings, social connections

### 2. NestJS API Structure

- **Prisma Service**: Database connection singleton
- **Auth Guard**: Supabase JWT verification
- **Users Module**: Full CRUD operations
- **Validation**: DTOs with class-validator
- **Security**: CORS, validation pipes, API prefix

### 3. Frontend Integration

- **API Client**: Base HTTP client
- **Users API**: User operations
- **Auto-save**: Users saved on login

## 🔧 Setup Steps

### Step 1: Create Database Table

Run Prisma migration:

```bash
cd apps/api
pnpm dlx prisma migrate dev --name init_users
```

Or if you want to sync with existing Supabase schema:

```bash
cd apps/api
pnpm dlx prisma db pull  # Pulls schema from Supabase
pnpm dlx prisma generate # Generates Prisma client
```

### Step 2: Configure Environment Variables

**Backend (`apps/api/.env`):**

```env
DATABASE_URL="postgresql://user:password@host:6543/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"  # For server-side auth
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

**Frontend (`apps/web/.env.local`):**

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

### Step 3: Generate Prisma Client

```bash
cd apps/api
pnpm dlx prisma generate
```

### Step 4: Run Both Services

**Terminal 1 - Frontend:**

```bash
pnpm dev:web
```

**Terminal 2 - Backend:**

```bash
pnpm dev:api
```

Or run both:

```bash
pnpm dev
```

## 📡 API Endpoints

Base URL: `http://localhost:3001/api`

### Public Endpoints (No Auth)

- `POST /api/users` - Create user
- `POST /api/users/upsert` - Create or update user

### Protected Endpoints (Require Bearer Token)

- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user by ID

## 🔒 Security Features

1. **JWT Authentication**: Supabase tokens verified
2. **Input Validation**: DTOs with class-validator
3. **CORS**: Restricted to frontend origin
4. **Error Handling**: Proper HTTP status codes
5. **Type Safety**: TypeScript throughout

## 🔄 Data Flow

```
User Login (Frontend)
  ↓
Supabase Auth → Session Created
  ↓
Frontend: upsertUser() → POST /api/users/upsert
  ↓
NestJS API: Auth Guard → Verify JWT
  ↓
Users Service → Save to Database
  ↓
Prisma → PostgreSQL (Supabase)
```

## 📝 What Gets Saved

When user logs in, these fields are automatically saved:

- `id` (from Supabase auth)
- `email`
- `full_name` (from Google)
- `avatar_url` (from Google)
- `google_id` (from Google)
- `last_login` (timestamp)

## 🚀 Next Steps

1. Run Prisma migration to create table
2. Add environment variables
3. Start both servers
4. Test login - user should be saved automatically

## ⚠️ Important Notes

- **Backend runs on port 3001** (not 3000)
- **API prefix**: All endpoints start with `/api`
- **Auth required**: Protected endpoints need `Authorization: Bearer <token>` header
- **Service Role Key**: Needed for server-side Supabase operations (optional for now)
