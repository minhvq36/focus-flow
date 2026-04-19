# 1. Created Project Repo Structure
focusflow/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── frontend/                          # React app (Vite)
│   ├── public/
│   │   └── assets/
│   │       └── sprites/               # Garden item sprites
│   │           ├── flowers/
│   │           ├── structures/
│   │           └── decorations/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── TaskList.tsx
│   │   │   │   ├── QuotaBadge.tsx
│   │   │   │   └── MiniGarden.tsx
│   │   │   ├── Focus/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── FocusTimer.tsx
│   │   │   │   ├── TodoList.tsx
│   │   │   │   └── NotesArea.tsx
│   │   │   ├── Garden/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── GardenCanvas.tsx
│   │   │   │   ├── InventoryPanel.tsx
│   │   │   │   └── LevelProgress.tsx
│   │   │   ├── Shop/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── ItemCard.tsx
│   │   │   │   └── SellPanel.tsx
│   │   │   ├── Marketplace/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── ListingCard.tsx
│   │   │   │   └── PriceHistory.tsx
│   │   │   ├── Leaderboard/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── GlobalBoard.tsx
│   │   │   │   └── FriendsBoard.tsx
│   │   │   ├── GardenPublic/
│   │   │   │   └── index.tsx          # /@username
│   │   │   ├── Social/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── FriendsList.tsx
│   │   │   │   └── ActivityFeed.tsx
│   │   │   ├── Search/
│   │   │   │   └── index.tsx
│   │   │   ├── Profile/
│   │   │   │   └── index.tsx
│   │   │   └── Settings/
│   │   │       └── index.tsx
│   │   ├── components/
│   │   │   ├── TaskForm/
│   │   │   │   ├── index.tsx
│   │   │   │   └── TodoBuilder.tsx    # indent-capable checklist builder
│   │   │   ├── RewardModal/
│   │   │   │   ├── index.tsx
│   │   │   │   └── Confetti.tsx
│   │   │   ├── PenaltyModal/
│   │   │   │   └── index.tsx
│   │   │   ├── GardenItem/
│   │   │   │   └── index.tsx          # sprite + healthy/wilted states
│   │   │   └── ui/                    # Generic reusable UI
│   │   │       ├── Button.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Badge.tsx
│   │   │       └── ProgressBar.tsx
│   │   ├── hooks/
│   │   │   ├── useTaskSession.ts      # Timer state machine
│   │   │   ├── useGarden.ts           # Grid state, placement
│   │   │   ├── useRealtime.ts         # Supabase Realtime
│   │   │   ├── useReward.ts           # Reward/penalty effects
│   │   │   └── useSearch.ts           # Debounced ES query
│   │   ├── store/
│   │   │   ├── taskStore.ts           # Zustand
│   │   │   ├── gardenStore.ts
│   │   │   ├── economyStore.ts
│   │   │   └── userStore.ts
│   │   ├── lib/
│   │   │   ├── api.ts                 # Axios instance + interceptors
│   │   │   ├── supabase.ts            # Supabase client
│   │   │   └── stripe.ts              # Stripe.js init
│   │   ├── types/
│   │   │   ├── task.ts
│   │   │   ├── garden.ts
│   │   │   ├── economy.ts
│   │   │   └── social.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # Go API
│   ├── cmd/
│   │   ├── server/
│   │   │   └── main.go                # HTTP server entrypoint
│   │   └── cronjob/
│   │       └── main.go                # Inactive penalty, marketplace expiry
│   ├── internal/
│   │   ├── auth/
│   │   │   ├── middleware.go          # JWT validation
│   │   │   └── supabase.go            # Supabase Auth integration
│   │   ├── task/
│   │   │   ├── handler.go
│   │   │   ├── service.go             # State machine logic
│   │   │   ├── quota.go               # Daily quota check
│   │   │   └── repository.go
│   │   ├── session/
│   │   │   ├── handler.go
│   │   │   └── timer.go               # Redis timer state
│   │   ├── reward/
│   │   │   ├── roll.go                # Seeded RNG, drop rates
│   │   │   ├── pity.go                # Pity counter logic
│   │   │   └── penalty.go             # Give up / inactive penalty
│   │   ├── garden/
│   │   │   ├── handler.go
│   │   │   ├── service.go             # Placement, level unlock
│   │   │   └── repository.go
│   │   ├── inventory/
│   │   │   ├── handler.go
│   │   │   └── repository.go
│   │   ├── shop/
│   │   │   ├── handler.go
│   │   │   └── service.go             # Buy/sell, pricing
│   │   ├── marketplace/
│   │   │   ├── handler.go
│   │   │   ├── service.go             # Listing, escrow
│   │   │   └── repository.go
│   │   ├── economy/
│   │   │   ├── handler.go
│   │   │   ├── service.go             # Currency ops, IAP verify
│   │   │   └── repository.go          # Stored proc wrappers
│   │   ├── social/
│   │   │   ├── handler.go
│   │   │   ├── service.go             # Friends, feed, hearts
│   │   │   └── repository.go
│   │   ├── leaderboard/
│   │   │   ├── handler.go
│   │   │   └── service.go             # Rank computation, cache
│   │   ├── search/
│   │   │   ├── handler.go
│   │   │   └── elasticsearch.go       # Index + query
│   │   ├── ai/
│   │   │   ├── handler.go
│   │   │   ├── recap.go               # Daily recap generation
│   │   │   └── suggest.go             # Todo suggestion
│   │   └── metrics/
│   │       └── prometheus.go          # Metric definitions + export
│   ├── pkg/
│   │   ├── cache/
│   │   │   └── redis.go               # Redis client wrapper
│   │   ├── db/
│   │   │   └── postgres.go            # Supabase/Postgres client
│   │   ├── realtime/
│   │   │   └── supabase.go            # Realtime publisher
│   │   └── rng/
│   │       └── seeded.go              # Deterministic seeded RNG
│   ├── go.mod
│   ├── go.sum
│   └── .env.example
│
└── infra/
    ├── supabase/
    │   ├── config.toml                # Supabase project config
    │   └── migrations/
    ├── prometheus/
    │   └── prometheus.yml
    ├── grafana/
    │   └── dashboards/
    │       ├── ops.json
    │       └── business.json
    ├── elasticsearch/
    │   └── index-mappings/
    │       ├── tasks.json
    │       └── recaps.json
    └── docker-compose.yml

# 2. Init SQL Sandbox
    - public.tasks (continuing -> to complete sqls relative)
    - public.users (ny)
    - task_daily_quote (ny)
    - garden_items (ny)
    - transaction (ny)
