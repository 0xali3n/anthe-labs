# Supabase Setup Guide - SQL Editor Approach

## ✅ Best Practice: Create Table in Supabase SQL Editor

This approach is **recommended** when working with Supabase because:
- ✅ Supabase manages migrations
- ✅ You can see changes in Supabase dashboard
- ✅ Easier to manage with Supabase's tools
- ✅ Better for team collaboration

---

## 📝 Step-by-Step Instructions

### Step 1: Create Table in Supabase SQL Editor

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **"New query"**
4. Copy and paste the SQL from `apps/api/prisma/supabase-setup.sql`
5. Click **"Run"** (or press Ctrl+Enter)

✅ **Table created!** You can verify in **Table Editor** → `users` table

---

### Step 2: Sync Prisma Schema (After Creating Table)

After creating the table in Supabase, sync Prisma to match:

```bash
cd apps/api
pnpm dlx prisma db pull
```

This will:
- Read your Supabase database schema
- Update `schema.prisma` to match
- Generate Prisma client

---

### Step 3: Generate Prisma Client

```bash
cd apps/api
pnpm dlx prisma generate
```

---

## 🔒 Security: Row Level Security (RLS)

The SQL script includes RLS policies:

- ✅ Users can only read/update their own data
- ✅ Service role has full access (for your NestJS API)
- ✅ Prevents unauthorized access

**Important:** If RLS blocks your API, you have two options:

1. **Use Service Role Key** (Recommended for API)
   - Add to `apps/api/.env`:
     ```env
     SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
     ```
   - This bypasses RLS (use carefully!)

2. **Adjust RLS Policies**
   - Modify policies in Supabase dashboard
   - Or update the SQL script before running

---

## 📊 Alternative: Prisma Migrate (If You Prefer)

If you prefer Prisma migrations:

```bash
cd apps/api
pnpm dlx prisma migrate dev --name init_users
```

Then sync to Supabase (if needed).

---

## 🎯 Recommended Flow

1. ✅ Create table in Supabase SQL Editor ← **You're here**
2. ✅ Sync Prisma: `prisma db pull`
3. ✅ Generate client: `prisma generate`
4. ✅ Test API endpoints

---

## 🔍 Verify Table Creation

After running SQL, check:

1. **Supabase Dashboard** → Table Editor → `users` table exists
2. **Supabase Dashboard** → Authentication → Policies → RLS enabled
3. **Run API**: `GET /api/health/db` should return success

---

## ⚠️ Important Notes

- **Never run migrations directly on production** without testing
- **Backup database** before running SQL (if production)
- **RLS policies** may need adjustment based on your use case
- **Service Role Key** is powerful - keep it secret!

