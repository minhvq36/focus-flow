# FocusFlow - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript (Vite)                            │   │
│  │  - Pages: Dashboard, Focus, Garden, Shop, etc.           │   │
│  │  - Components: Reusable UI components                    │   │
│  │  - Hooks: Custom React hooks for state                   │   │
│  │  - Store: Zustand for global state                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Middleware Layer                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  - Authentication: Supabase Auth                         │   │
│  │  - API: Axios with interceptors                          │   │
│  │  - Realtime: Supabase Realtime subscriptions             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer (Go)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  HTTP API (port 8080)                                    │   │
│  │  - Auth: JWT middleware                                  │   │
│  │  - Task: Task management endpoints                       │   │
│  │  - Garden: Garden system endpoints                       │   │
│  │  - Shop: Shop and economy endpoints                      │   │
│  │  - Social: Friends and activity endpoints                │   │
│  │  - Marketplace: Trading endpoints                        │   │
│  │  - Leaderboard: Ranking endpoints                        │   │
│  │  - Search: Elasticsearch integration                     │   │
│  │  - AI: Recap and suggestions endpoints                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
    ↙           ↓            ↓            ↓           ↘
   ┌─────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐
   │  DB │  │ Cache  │  │ Search │  │Realtime│  │ Metrics  │
   │(PG) │  │(Redis) │  │ (ES)   │  │(Supabase)│ │(Prom)    │
   └─────┘  └────────┘  └────────┘  └────────┘  └──────────┘
```

## Component Architecture

### Frontend

**Pages** (Feature pages with complete UI)
- Dashboard: Main landing page
- Focus: Pomodoro timer and task tracking
- Garden: Plant placement and customization
- Shop: Item purchasing
- Marketplace: Player-to-player trading
- Leaderboard: Rankings
- Social: Friends and activity
- Profile & Settings: User management

**Components** (Reusable UI elements)
- TaskForm: Task creation with checklist builder
- GardenItem: Sprite rendering with states
- RewardModal: Reward animations
- PenaltyModal: Penalty display
- UI Components: Button, Modal, Badge, ProgressBar

**Hooks** (Custom React logic)
- useTaskSession: Timer state management
- useGarden: Grid and placement logic
- useRealtime: Supabase subscriptions
- useReward: Reward/penalty effects
- useSearch: Debounced search

**Store** (Global state with Zustand)
- taskStore: Tasks state
- gardenStore: Garden items
- economyStore: Currency
- userStore: User data

### Backend

**Handlers** (HTTP request handlers)
- Each domain has a handler that processes requests

**Services** (Business logic)
- Each domain has a service with core logic
- Handles validation, calculations, state changes

**Repositories** (Data persistence)
- Each domain has a repository for database operations
- Abstracts database interactions

**Packages** (Shared utilities)
- auth: Authentication and JWT
- db: Database client wrapper
- cache: Redis client wrapper
- realtime: Supabase Realtime
- rng: Seeded random number generation

## Data Flow

### Task Completion Flow

1. User submits completed task in Focus page
2. Frontend calls API: `POST /tasks/:id/complete`
3. Backend validates task ownership and status
4. Service applies reward logic:
   - RNG determines reward item
   - Pity counter updated
   - Economy updated
5. Realtime event published
6. Frontend updates UI with reward animation
7. Garden items updated based on completion

### Marketplace Flow

1. User creates listing: `POST /marketplace/listings`
2. Item held in escrow (inventory marked as reserved)
3. Buyer purchases: `POST /marketplace/listings/:id/purchase`
4. Escrow transferred to seller
5. Item transferred to buyer
6. Both parties notified via Realtime

## Scaling Considerations

- **Database**: Replicas for read scaling
- **Cache**: Redis for session and frequently accessed data
- **Search**: Elasticsearch for complex queries
- **API**: Horizontal scaling with load balancer
- **Realtime**: Supabase handles pub/sub infrastructure
- **Monitoring**: Prometheus + Grafana for observability

## Security

- JWT authentication via Supabase
- CORS configured for frontend domain
- Rate limiting on API endpoints
- Input validation on all endpoints
- Database row-level security policies
- Encrypted sensitive data

## Performance

- Debounced search queries
- Redis caching for leaderboards
- Lazy loading of components
- Image optimization (sprites)
- Database query optimization
- Connection pooling
