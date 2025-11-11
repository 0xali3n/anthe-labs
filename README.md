
## 🧠 Anthé Labs – Copytrade  Platform

A modern **Next.js + Nest.js (Turborepo)** project powered by **Supabase** and **Prisma**, built for smart copytrading automation.

---

### 🚀 Quick Setup

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/0xali3n/anthe-labs.git
cd anthe-labs
```

#### 2️⃣ Install Dependencies

```bash
pnpm install
```

> (If you don’t have pnpm)

```bash
npm install -g pnpm
```

#### 3️⃣ Environment Setup

* Copy `.env.example` → `.env`
* Add your Supabase database URL:

  ```
  DATABASE_URL="postgresql://<user>:<password>@<host>:6543/postgres"
  ```
* Set your server port (optional):

  ```
  PORT=3001
  ```

---

### 🧩 Run the Apps

#### 🖥 Frontend (Next.js)

```bash
pnpm --filter web dev
```

Runs on → [http://localhost:3000](http://localhost:3000)

#### ⚙️ Backend (Nest.js API)

```bash
pnpm --filter api start:dev
```

Runs on → [http://localhost:3001](http://localhost:3001)

#### 🔁 Run Both (Monorepo mode)

```bash
pnpm dev
```

---

### 🗄 Database (Supabase + Prisma)

```bash
cd apps/api
pnpm dlx prisma generate
```

> Use `pnpm dlx prisma db pull` if you want to sync schema with Supabase later.

---

### ✅ Project Stack

* **Frontend:** Next.js + TailwindCSS
* **Backend:** Nest.js + Prisma
* **Database:** Supabase (PostgreSQL)
* **Icons:** lucide-react
* **Package Manager:** pnpm
* **Architecture:** Turborepo Monorepo

---


