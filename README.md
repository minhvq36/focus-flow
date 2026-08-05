# FocusFlow

> Task-based productivity app where every completed task grows a virtual garden.
> **Your productivity, in full bloom.**

![Go](https://img.shields.io/badge/Go-1.25-00ADD8) ![React](https://img.shields.io/badge/React-19-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E) ![PixiJS](https://img.shields.io/badge/PixiJS-8-E91E63)

---

## Overview

Most to-do apps fail at retention: users start strong and quit after two weeks because nothing pulls them back. Badges and streaks are too shallow to build a real habit.

FocusFlow turns each finished task into a tangible reward. Completing a task rolls a random garden item (server-side RNG), silver, and EXP. The user places items on an isometric garden grid that grows across 20 levels — a visual record of real work. Giving up a task can cost an item, so the garden also carries the weight of what was abandoned.

This is a full-stack side project built solo, covering product spec, database design, a Go REST API, a WebGL-rendered frontend, and deployment.

---

## Features

**Task engine**
- Task lifecycle state machine: `active` → `paused` / `submitted` / `given_up`
- Timer with pause/resume/reset/extend, crash- and refresh-safe (no heartbeat required)
- Nested todo checklists, per-task notes (CRUD), starred tasks, title/todo editing
- Daily task quota per plan tier, enforced at the database level

**Garden & rewards**
- Isometric garden grid rendered with PixiJS (WebGL), with camera pan, zoom and hit-testing
- Single and batch item placement / removal
- Reward roll on task submit: rarity (6 tiers, level-scaled drop tables), silver, EXP
- Penalty flow on give-up, with every roll persisted for auditability

**Economy**
- Silver/gold wallet with transactional balance updates and a full transaction audit log
- Shop: buy and sell items, buyback pricing, inventory bag

**Account & profile**
- Supabase Auth: email/password, Google OAuth, password reset, Cloudflare Turnstile captcha
- Public profile: display name (profanity-filtered), bio, avatar upload + crop, avatar frames
- i18n (EN/VI), light & dark theme

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4, shadcn/ui, PixiJS 8 |
| State / data | TanStack Query, Zustand, React Hook Form + Zod |
| Backend | Go 1.25, chi router, pgx/v5, go-playground/validator |
| Database | PostgreSQL (Supabase) — RLS, triggers, stored functions, pg_cron |
| Auth | Supabase Auth (JWT verified against JWKS), Cloudflare Turnstile |
| Infra | Docker Compose, GitHub Actions, Vercel (web), Fly.io (API) |

---

## Architecture

```
React SPA (Vercel)
      │  JWT (Supabase Auth)
      ▼
Go API (chi)  ──►  PostgreSQL / Supabase   users, tasks, garden, economy
      │                                     RLS + triggers + pg_cron
      └──────────►  Supabase Auth (JWKS)   token verification
```

Each backend domain follows the same layering — `routes → handler → service → repository` — wired through explicit dependency injection, so a module can be read top to bottom without jumping across the codebase.

```
focus-flow/
├── backend/
│   ├── cmd/server/            entrypoint, route registration, DI wiring
│   ├── internal/
│   │   ├── auth/              JWT middleware (JWKS)
│   │   ├── task/              task CRUD, state machine, timer, notes
│   │   ├── reward/            drop tables, seeded RNG, penalty
│   │   ├── garden/            grid layout, placements, level unlock
│   │   ├── inventory/         item bag
│   │   ├── economy/           wallet, shop, transaction audit
│   │   └── profile/           public profile, display name, avatar
│   └── pkg/                   config, db, logger, apperr, request/response, profanity
├── frontend/
│   └── src/
│       ├── pages/             tasks, focus, garden, profile, auth
│       ├── components/        ui primitives, layout, auth forms
│       ├── lib/               api client, supabase, storage
│       └── store/             zustand stores
├── infra/
│   ├── supabase/migrations/   versioned SQL schema
│   ├── prometheus/ grafana/   monitoring config
│   └── docker-compose.yml
└── .github/workflows/         CI + deploy pipelines
```

---

## Engineering Highlights

**Stateless, tamper-resistant timer.** Instead of polling or a heartbeat, a running task stores `started_at` plus accumulated `actual_duration_sec`. Elapsed time is derived as `actual_duration_sec + (NOW() - started_at)`, so closing the tab or losing connection costs nothing — the client re-derives the clock on reload, and the server validates submitted durations.

**Business rules pushed into the database.** Daily task quota, note limits, immutability of system-owned columns, input sanitisation on insert, and inventory state reset on placement delete are all enforced by PostgreSQL triggers. Row Level Security isolates every user's data; backend-only tables enable RLS with no policy at all, which blocks the public PostgREST surface outright.

**Auditable server-side RNG.** Reward rarity is rolled server-side from a level-scaled weight table using `crypto/rand` seeded with task and user identifiers. Every roll is written to `reward_rolls`, so drop rates can be verified after the fact and the client can never influence an outcome.

**Canvas over DOM for the garden.** A level-20 garden reaches 900+ tiles; a DOM grid at that size janks. The garden is a single PixiJS WebGL surface with its own isometric projection, camera and hit-testing, keeping interaction smooth as the grid scales.

**Economy integrity.** Wallet mutations run inside transactions with non-negative balance constraints, and each one writes an immutable row to `economy_transactions` — balances are always reconstructable from the ledger.

---

## API

All routes below `/api` require an `Authorization: Bearer <supabase-jwt>` header.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `GET` `POST` | `/api/tasks` | List / create tasks |
| `GET` | `/api/tasks/quota/today` | Remaining daily task slots |
| `GET` | `/api/tasks/{id}` | Task detail |
| `PATCH` | `/api/tasks/{id}/todos` `/title` | Update checklist / title |
| `POST` | `/api/tasks/{id}/pause` `/resume` `/reset` `/extend` | Timer control |
| `POST` | `/api/tasks/{id}/submit` `/giveup` | Complete task (reward) / abandon (penalty) |
| `POST` | `/api/tasks/{id}/star` | Toggle pin |
| `GET` `POST` `PATCH` `DELETE` | `/api/tasks/{id}/notes` | Task notes CRUD |
| `GET` | `/api/garden` `/api/garden/{id}` | Garden list / detail with placements |
| `POST` `DELETE` | `/api/garden/{id}/placements` | Place / remove items (single & batch) |
| `GET` | `/api/inventory/bag` | Unplaced items |
| `GET` | `/api/economy/wallet` | Silver & gold balance |
| `GET` `POST` | `/api/economy/shop/buy` `/sell` | Shop catalogue and transactions |
| `GET` `PATCH` `POST` | `/api/profile` | Profile, bio, avatar, display name |

---

## Getting Started

### Prerequisites

`Go 1.25+` · `Node.js 20+` · `Docker` · `Supabase CLI`

### 1. Database

```bash
cd infra
supabase link --project-ref <your-project-ref>
supabase db push
```

### 2. Backend

```bash
cd backend
# create .env with DATABASE_URL, SUPABASE_URL, PORT (see below)
go mod download
go run ./cmd/server       # http://localhost:8080
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev               # http://localhost:5173
```

### 4. Supporting services (optional)

```bash
cd infra
docker compose up -d      # redis, elasticsearch, prometheus, grafana
```

### Environment variables

```bash
# backend/.env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://<project-ref>.supabase.co
PORT=8080

# frontend/.env.local
VITE_API_URL=http://localhost:8080
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_TURNSTILE_SITE_KEY=            # optional, must match Supabase captcha setting
```

---

## CI/CD

GitHub Actions runs on every push and pull request to `main` and `develop`:

```
frontend   npm ci → npm run lint → npm run build
backend    go mod download → go fmt → go vet → go build
```

The frontend deploys to Vercel with a custom ignored-build step so unrelated commits don't trigger a rebuild; the Go API deploys to Fly.io. Schema changes ship as versioned SQL migrations through the Supabase CLI.

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Auth, task engine, timer, quota, notes | Done |
| 2 | Garden grid, inventory, reward & penalty rolls | Done |
| 3 | Economy, shop, wallet ledger | Done |
| 4 | Redis-backed session cache, inactive-user cronjob | In progress |
| 5 | Social layer: friends, feed, garden hearts, leaderboard | Planned |
| 6 | Legendary P2P marketplace, Stripe IAP & subscriptions | Planned |
| 7 | Elasticsearch task search, AI daily recap, Prometheus + Grafana | Planned |

Full product specification: [`SPEC.md`](SPEC.md) · design notes in [`SPEC-BE.md`](SPEC-BE.md), [`SPEC-FE.md`](SPEC-FE.md), [`SPEC-DB.md`](SPEC-DB.md).

---

## Author

**Quoc Minh** — [github.com/minhvq36](https://github.com/minhvq36) · minhvq36@gmail.com
