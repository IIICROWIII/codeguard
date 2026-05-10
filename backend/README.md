# CodeGuard Backend

Express API for the CodeGuard secure-coding practice platform.

## Requirements

- Node.js 20 LTS
- PostgreSQL 14+

## Setup

```bash
cp .env.example .env       # then edit values
npm install
npm run db:migrate         # apply schema
npm run db:seed            # insert starter challenges
npm run dev                # start with nodemon on PORT (default 4000)
```

## Scripts

| Command            | Purpose                                |
|--------------------|----------------------------------------|
| `npm run dev`      | Start with nodemon                     |
| `npm start`        | Start in production mode               |
| `npm run lint`     | ESLint over `src/`                     |
| `npm run format`   | Prettier write over `src/`             |
| `npm run db:migrate` | Apply pending SQL migrations         |
| `npm run db:seed`  | Insert starter challenges (idempotent) |

## Sanity check

Once running, hit:
- `GET /api/health`     — service liveness
- `GET /api/health/db`  — confirms Postgres connectivity

## Layout

```
src/
├── app.js              # Express app (middleware + routes)
├── server.js           # HTTP entrypoint + graceful shutdown
├── config/env.js       # Loads + validates env vars
├── db/
│   ├── pool.js         # pg Pool singleton
│   ├── migrate.js      # Migration runner (schema_migrations table)
│   ├── seed.js         # Idempotent challenge seeder
│   ├── migrations/     # Numbered .sql files
│   └── seeds/          # JS seed data
├── middleware/         # Cross-cutting middleware
├── routes/             # Express routers
├── controllers/        # Route handlers (Phase 3+)
└── services/           # Business logic, e.g. aiAnalyzer.js (Phase 5)
```
