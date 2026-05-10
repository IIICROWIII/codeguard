# CodeGuard

A web platform where programmers practice secure coding. Pick a challenge (e.g. *Fix SQL Injection*), edit code in a Monaco editor, submit, and get AI-powered feedback — detected bugs, OWASP-style vulnerabilities, suggestions, and a 0–100 score. Progress is tracked on a personal dashboard.

The full specification lives in [project.md](project.md). This README is a quick guide to **what's built today** and **how to run it on your machine**.

---

## Status (as of the latest commit)

The **backend** is partially built. Frontend hasn't started.

| Area                | Status         |
|---------------------|----------------|
| Database schema     | Done           |
| Express scaffold    | Done           |
| Challenge API       | Done           |
| Submission API      | Done           |
| AI analyzer (mock)  | Done           |
| Auth (JWT + bcrypt) | Not yet — temporary dev shim in place |
| Dashboard API       | Not yet        |
| Rate limiting / validator hardening | Not yet |
| Frontend (Next.js)  | Not yet        |

The dev shim is a placeholder for real authentication: a single header (`X-Dev-User-Id`) stands in for a JWT until Phase 3 lands. See [Testing without real auth](#testing-without-real-auth-dev-shim) below.

---

## Tech stack

- **Runtime:** Node.js 20 LTS or newer
- **Framework:** Express 4 (CommonJS)
- **Database:** PostgreSQL (we use **Supabase** for hosted Postgres)
- **Driver:** `pg` (with SSL when talking to Supabase)
- **Security:** `helmet`, `cors` — `bcrypt`, `jsonwebtoken`, `express-rate-limit`, `express-validator` will arrive in later phases

---

## Project structure

```
codeGuard/
├── README.md                      # ← you are here
├── project.md                     # full spec + per-session change log
├── .gitignore
├── frontend/                      # empty (Phase 4)
└── backend/
    ├── .env.example               # template — copy to .env
    ├── .eslintrc.json
    ├── .prettierrc.json
    ├── package.json
    ├── README.md                  # backend-only quickstart
    └── src/
        ├── app.js                 # Express app: helmet, cors, json, routes, errors
        ├── server.js              # HTTP listener + graceful shutdown
        ├── config/env.js          # env loader (dotenv) + defaults
        ├── db/
        │   ├── pool.js            # pg Pool singleton (toggles SSL via PGSSL)
        │   ├── migrate.js         # idempotent migration runner
        │   ├── seed.js            # idempotent challenge seeder
        │   ├── migrations/001_init.sql
        │   └── seeds/challenges.js
        ├── middleware/
        │   ├── errorHandler.js    # 404 + central error handler
        │   └── requireAuth.js     # TEMP dev shim (X-Dev-User-Id header)
        ├── routes/                # /health, /challenges, /submissions
        ├── controllers/           # request handlers per resource
        └── services/
            └── aiAnalyzer.js      # mock — same contract as the real provider
```

---

## Prerequisites

- **Node.js 20 LTS or newer** (24 also works) — `node --version`
- **npm 10 or newer** — `npm --version`
- **A Supabase account** — free tier is plenty: <https://supabase.com>

You do **not** need a local Postgres install. Supabase replaces that.

---

## Setup — getting the backend running on your laptop

### 1. Get the code

```bash
git clone <repo-url>
cd codeGuard/backend
```

### 2. Create a Supabase project

1. Sign in at <https://supabase.com> → **New project**.
2. Pick a name, region (any close to you), and **set a database password** — write it down.
3. Wait ~1 minute for the project to provision.

### 3. Grab the connection string

Inside your Supabase project:

1. Click the green **Connect** button at the top of the dashboard. (Or: **Project Settings → Database**.)
2. You'll see several connection strings. **Use one of these two** — both work:
   - **Direct connection** — port `5432` (works if your network has IPv6).
   - **Session pooler** — port `5432` (IPv4-friendly, recommended if Direct fails).
3. **Do not use the Transaction pooler** (port `6543`). Our migration runner uses transactions, which the transaction pooler doesn't support.
4. Click the **URI** tab so you get the `postgresql://...` form.
5. Copy the URI. It contains a `[YOUR-PASSWORD]` placeholder — replace that with the password you set in step 2.

It will look something like:

```
postgresql://postgres:YOUR-PASSWORD@db.<project-ref>.supabase.co:5432/postgres
```

### 4. Create your `.env`

```bash
# from inside backend/
cp .env.example .env
```

Open `backend/.env` and fill in two things:

```ini
DATABASE_URL=postgresql://postgres:YOUR-PASSWORD@db.<project-ref>.supabase.co:5432/postgres
PGSSL=true
```

`PGSSL=true` is **required for Supabase** — they refuse non-SSL connections. The other vars (PORT, JWT secrets, CORS origin) already have safe defaults for local dev.

> The `.env` file is in `.gitignore` and will not be committed. Keep it out of screenshots and shared repos.

### 5. Install dependencies

```bash
npm install
```

Expect ~228 packages, 0 vulnerabilities. ESLint 8 prints a couple of deprecation warnings — harmless.

### 6. Apply the schema

```bash
npm run db:migrate
```

This creates the `users`, `challenges`, `submissions` tables, the `difficulty_level` enum, the indexes on `submissions`, and a `schema_migrations` tracking table. Re-running is safe — already-applied migrations are skipped.

### 7. Seed starter challenges

```bash
npm run db:seed
```

Inserts **8 challenges** (4 security, 2 intermediate, 2 beginner). Idempotent — bails out if any challenge already exists.

### 8. Run the server

```bash
npm run dev      # nodemon, restarts on save
# or
npm start        # plain node
```

You should see:

```
[server] codeguard-backend listening on :4000 (development)
```

### 9. Verify

Open these in a browser (or `curl`):

- <http://localhost:4000/api/health> → `{"status":"ok","service":"codeguard-backend"}`
- <http://localhost:4000/api/health/db> → `{"db":"ok"}` (runs `SELECT 1` against your Supabase)
- <http://localhost:4000/api/challenges> → list of the 8 seeded challenges

If `/api/health/db` returns an error, your `DATABASE_URL` or `PGSSL` is wrong — re-check the connection string.

---

## API reference (current)

Base URL: `http://localhost:4000`

### Public

| Method | Path                                | Description                                 |
|--------|-------------------------------------|---------------------------------------------|
| GET    | `/api/health`                       | Liveness                                    |
| GET    | `/api/health/db`                    | Liveness + DB ping                          |
| GET    | `/api/challenges`                   | List all challenges                         |
| GET    | `/api/challenges?difficulty=security` | Filter by `beginner` / `intermediate` / `security` |
| GET    | `/api/challenges/:id`               | Single challenge **with `starter_code`**    |

### Protected (currently behind dev shim — see next section)

| Method | Path                       | Description                                          |
|--------|----------------------------|------------------------------------------------------|
| POST   | `/api/submissions`         | Body: `{ challenge_id, code }`. Runs analyzer, returns score + feedback. 50KB cap on `code`. |
| GET    | `/api/submissions/me`      | Your submission history (newest first)               |
| GET    | `/api/submissions/:id`     | One submission. 403 if it's not yours.               |

---

## Testing without real auth (dev shim)

Real JWT auth ships in Phase 3. Until then, [`backend/src/middleware/requireAuth.js`](backend/src/middleware/requireAuth.js) is a **temporary** shim: it reads a single header instead of a JWT.

### Step 1 — create a dev user once

You can run this from `psql`, the Supabase SQL Editor, or from Node:

```sql
INSERT INTO users(email, password_hash) VALUES ('dev@local', 'TEMP-not-a-real-hash')
RETURNING id;
```

Copy the returned UUID.

### Step 2 — pass it as `X-Dev-User-Id` on protected calls

```bash
curl -X POST http://localhost:4000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: <paste-the-uuid-here>" \
  -d '{
    "challenge_id": "<uuid-of-a-challenge>",
    "code": "function getUserByEmail(db, email) { return db.query(\"SELECT id FROM users WHERE email = $1\", [email]); }"
  }'
```

Response:

```json
{
  "submission": {
    "id": "...",
    "challenge_id": "...",
    "score": 100,
    "feedback": { "errors": [], "vulnerabilities": [], "suggestions": [], "score": 100 },
    "submitted_at": "2026-..."
  }
}
```

Submitting unsafe code (e.g. `'... WHERE email = ' + email`) returns a lower score with a populated `vulnerabilities` array.

### Tools for hitting the API

- **Browser** — easiest for `GET` calls.
- **curl** — see examples above.
- **Thunder Client** (free VS Code extension) — best dev UX, save requests as a collection.
- **Postman / Insomnia** — also fine.

---

## What's NOT built yet

Tracked in detail in [project.md](project.md) under *Build Phases* and the *Session Log*.

- **Phase 3 — Auth.** Register / login / logout, bcrypt(12), JWT access (15 min) + httpOnly refresh cookie (7 d). Replaces the dev shim *in place* — the `req.user` shape stays the same so controllers don't change.
- **Phase 4 — Frontend.** Next.js App Router, Monaco editor, all pages.
- **Phase 6 — Dashboard.** `GET /api/dashboard/stats` (solved count, avg score, recent activity).
- **Phase 7 — Security hardening.** `express-rate-limit` on `/api/auth/*`, `express-validator` on user-submitted bodies.
- **Phase 8 — Playwright tests.**
- **Phase 9 — Deployment.** Frontend → Vercel, Backend → Railway.

---

## Common issues

| Symptom                                                   | Fix                                                              |
|-----------------------------------------------------------|------------------------------------------------------------------|
| `[migrate] failed: SASL: ... password authentication`     | Wrong password in `DATABASE_URL`. Reset the DB password in Supabase → Project Settings → Database → Reset password. |
| `[migrate] failed: ... no pg_hba.conf entry / SSL`        | Set `PGSSL=true` in `.env`.                                      |
| `EADDRINUSE :::4000`                                      | Another process is on port 4000. Either kill it or change `PORT` in `.env`. |
| `relation "challenges" does not exist`                    | You skipped `npm run db:migrate`. Run it.                        |
| `/api/submissions` returns 401 even with a header         | The UUID in `X-Dev-User-Id` doesn't exist in the `users` table. Insert a dev user (see above). |

---

## Scripts (run from `backend/`)

| Command              | Purpose                                |
|----------------------|----------------------------------------|
| `npm run dev`        | Start with nodemon                     |
| `npm start`          | Start in production mode               |
| `npm run lint`       | ESLint over `src/`                     |
| `npm run lint:fix`   | ESLint with autofix                    |
| `npm run format`     | Prettier write over `src/`             |
| `npm run db:migrate` | Apply pending SQL migrations           |
| `npm run db:seed`    | Insert starter challenges (idempotent) |
