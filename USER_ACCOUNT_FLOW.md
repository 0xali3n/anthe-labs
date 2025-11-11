# 🔄 Complete User Account & Wallet Creation Flow

## 📋 Table of Contents

1. [High-Level Flow Diagram](#high-level-flow-diagram)
2. [Detailed Step-by-Step Flow](#detailed-step-by-step-flow)
3. [Frontend Flow](#frontend-flow)
4. [Backend (NestJS) Flow](#backend-nestjs-flow)
5. [Encryption Process](#encryption-process)
6. [How to Decrypt Private Keys](#how-to-decrypt-private-keys)
7. [Database Schema](#database-schema)

---

## 🎯 High-Level Flow Diagram

```
┌─────────────┐
│   User      │
│  Signs In   │
│ with Google │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│                                                         │
│  1. Supabase OAuth → Google Login                      │
│  2. Get JWT Token from Supabase Session                │
│  3. Call POST /api/users/upsert with JWT               │
│     - Sends: user data (id, email, name, etc.)         │
└──────┬─────────────────────────────────────────────────┘
       │
       │ HTTP POST with JWT Token
       │ Authorization: Bearer <token>
       ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND (NestJS API)                       │
│                                                         │
│  1. AuthGuard verifies JWT token                       │
│  2. Extract userId from verified token                 │
│  3. UsersService.upsert()                              │
│     ├─ Create/Update user in database                  │
│     └─ Auto-create wallet if needed                     │
│         ├─ Check if wallet exists                      │
│         ├─ If NO: Generate new Aptos wallet            │
│         ├─ Encrypt private key (AES-256-GCM)          │
│         └─ Store in database                           │
│  4. Return user data + wallet_address                  │
└──────┬─────────────────────────────────────────────────┘
       │
       │ JSON Response: { success, user: { ..., wallet_address } }
       ▼
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│                                                         │
│  1. Receive response with wallet_address               │
│  2. Display wallet address in UI                       │
│  3. User sees their Aptos wallet address               │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Encryption Process (Detailed)

### Generate Aptos Wallet

```
┌─────────────────────────────────────────────────────────┐
│ Generate New Aptos Wallet                               │
│                                                         │
│  import { Account } from '@aptos-labs/ts-sdk';          │
│                                                         │
│  const account = Account.generate();                    │
│  ┌─────────────────────────────────────┐                │
│  │ account.accountAddress              │                │
│  │ → "0x7babbeb6eb927024c20315..."    │  (Public)      │
│  │                                     │                │
│  │ account.privateKey                  │                │
│  │ → "0x1234567890abcdef..."          │  (SECRET!)     │
│  └─────────────────────────────────────┘                │
│                                                         │
│  ⚠️ Private key NEVER leaves backend!                    │
└─────────────────────────────────────────────────────────┘
```

### Encrypt Private Key

```
┌─────────────────────────────────────────────────────────┐
│ EncryptionService.encrypt(privateKey)                   │
│                                                         │
│  Input: "0x1234567890abcdef..." (plaintext private key)│
│                                                         │
│  Process:                                               │
│  ┌─────────────────────────────────────────────┐       │
│  │ 1. Get ENCRYPTION_KEY from environment       │       │
│  │    ENCRYPTION_KEY="your-secret-key-here"    │       │
│  └─────────────────────────────────────────────┘       │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────┐       │
│  │ 2. Derive Master Key (PBKDF2)                │       │
│  │                                              │       │
│  │    crypto.pbkdf2Sync(                        │       │
│  │      ENCRYPTION_KEY,                         │       │
│  │      'aptos-wallet-salt',  // Fixed salt     │       │
│  │      100000,                // 100k iters   │       │
│  │      32,                     // 256 bits    │       │
│  │      'sha256'                                │       │
│  │    )                                          │       │
│  │                                              │       │
│  │    → masterKey (32-byte Buffer)              │       │
│  └─────────────────────────────────────────────┘       │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────┐       │
│  │ 3. Generate Random IV (Initialization Vector)│      │
│  │                                              │       │
│  │    crypto.randomBytes(16)                   │       │
│  │    → iv (unique for each encryption)        │       │
│  └─────────────────────────────────────────────┘       │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────┐       │
│  │ 4. Encrypt with AES-256-GCM                  │      │
│  │                                              │       │
│  │    cipher = crypto.createCipheriv(           │       │
│  │      'aes-256-gcm',                          │       │
│  │      masterKey,                              │       │
│  │      iv                                     │       │
│  │    )                                         │       │
│  │                                              │       │
│  │    encrypted = cipher.update(               │       │
│  │      privateKey, 'utf8', 'hex'              │       │
│  │    ) + cipher.final('hex')                  │       │
│  │                                              │       │
│  │    tag = cipher.getAuthTag()                 │       │
│  │    → Authentication tag (tamper detection)    │       │
│  └─────────────────────────────────────────────┘       │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────┐       │
│  │ 5. Format Output                             │       │
│  │                                              │       │
│  │    Format: "iv:tag:encryptedData"            │       │
│  │    (all hex encoded)                         │       │
│  │                                              │       │
│  │    Example:                                  │       │
│  │    "a1b2c3d4...:e5f6g7h8...:i9j0k1l2..."    │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  Output: Encrypted private key (safe to store)         │
└─────────────────────────────────────────────────────────┘
```

### Step 13: Store in Database

```
┌─────────────────────────────────────────────────────────┐
│ Store Wallet in Database                                 │
│                                                         │
│  prisma.wallet.create({                                 │
│    user_id: "user-uuid",                               │
│    address: "0x7babbeb6...",  // Public address        │
│    encrypted_private_key: "iv:tag:encrypted",           │
│    network: "mainnet"                                   │
│  })                                                     │
│                                                         │
│  Database (Supabase PostgreSQL):                        │
│  ┌─────────────────────────────────────────────┐       │
│  │ wallets table                                │       │
│  │                                              │       │
│  │ id: uuid                                     │       │
│  │ user_id: uuid (FK → users.id)               │       │
│  │ address: "0x7babbeb6..."                     │       │
│  │ encrypted_private_key: "a1b2c3:tag:enc..."  │       │
│  │ network: "testnet"                           │       │
│  │ created_at: timestamp                       │       │
│  │ updated_at: timestamp                       │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  ✅ Private key is encrypted                            │
│  ✅ Never stored in plaintext                           │
│  ✅ Safe to store in database                           │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Complete Sequence Diagram

```
User          Frontend          Supabase          Backend API        Database
 │               │                 │                  │                  │
 │─── Click Sign In ──────────────>│                  │                  │
 │               │                 │                  │                  │
 │<── Redirect to Google ──────────│                  │                  │
 │               │                 │                  │                  │
 │─── Authorize ───────────────────>│                  │                  │
 │               │                 │                  │                  │
 │<── Redirect with code ───────────│                  │                  │
 │               │                 │                  │                  │
 │               │─── Exchange code for JWT ──────────>│                  │
 │               │<── JWT Token ─────────────────────│                  │
 │               │                 │                  │                  │
 │               │─── POST /api/users/upsert ───────────────────────────>│
 │               │     Authorization: Bearer <JWT>    │                  │
 │               │     Body: { id, email, ... }       │                  │
 │               │                 │                  │                  │
 │               │                 │                  │─── Verify JWT ────>│
 │               │                 │<── User verified ────────────────────│
 │               │                 │                  │                  │
 │               │                 │                  │─── Upsert user ───>│
 │               │                 │                  │<── User created ────│
 │               │                 │                  │                  │
 │               │                 │                  │─── Check wallet ──>│
 │               │                 │                  │<── Not found ───────│
 │               │                 │                  │                  │
 │               │                 │                  │─── Generate wallet │
 │               │                 │                  │    Encrypt key     │
 │               │                 │                  │                  │
 │               │                 │                  │─── Store wallet ──>│
 │               │                 │                  │<── Wallet saved ────│
 │               │                 │                  │                  │
 │               │<── Response ───────────────────────────────────────────│
 │               │     { success, user: { ..., wallet_address } }         │
 │               │                 │                  │                  │
 │               │─── Display wallet address ─────────>│                  │
 │               │     "0x7bab...53e6"                │                  │
```

---

## 📚 Quick Reference

### File Locations

**Frontend:**

- `apps/web/src/components/UserButton.tsx` - Displays wallet
- `apps/web/src/lib/usersApi.ts` - API calls
- `apps/web/src/lib/supabaseClient.ts` - Supabase client

**Backend:**

- `apps/api/src/users/users.service.ts` - User & wallet creation
- `apps/api/src/wallets/wallets.service.ts` - Wallet generation
- `apps/api/src/encryption/encryption.service.ts` - Encryption/decryption
- `apps/api/src/auth/auth.guard.ts` - JWT verification
