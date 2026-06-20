# SPEC-BE.md — FocusFlow v2 Backend Specification

> Go API server architecture, service layer, business logic, and API endpoints

---

## 1. Architecture Overview

```
[React Frontend] ─── HTTP/WebSocket ──→ [Go API Server]
                                           │
                                           ├─ Service Layer (business logic)
                                           ├─ Repository Layer (DB access)
                                           ├─ Cache Layer (Redis)
                                           └─ External Services (Stripe, Anthropic, etc.)
```

### Tech Stack
- **Language:** Go 1.21+
- **Framework:** Chi (HTTP router) or similar lightweight
- **Database:** Supabase PostgreSQL + migrations
- **Cache:** Redis (task timer state, rate limiting, reward cache)
- **Search:** Elasticsearch (task history, recap search)
- **Auth:** Supabase Auth (JWT tokens, OAuth)
- **Realtime:** Supabase Realtime (WebSocket for feed, leaderboard updates)
- **AI:** Anthropic API (daily recap, task suggestions)
- **Payments:** Stripe (IAP gold purchases)
- **Monitoring:** Prometheus + Grafana

---

## 2. Go Project Structure

```
/cmd
  /server              ← HTTP API server entrypoint
  /cronjob             ← scheduled background jobs
    /main.go           ← run inactive penalty, marketplace cleanup

/internal
  /auth                ← JWT middleware, Supabase Auth client
    /middleware.go
    /supabase.go
  
  /task                ← Task CRUD, state machine
    /handler.go        ← POST/GET endpoints
    /service.go        ← create, start, pause, resume, submit, give_up logic
    /repository.go     ← DB queries
  
  /session             ← Task timer state (Redis-backed)
    /handler.go
    /timer.go          ← track elapsed time, pause/resume
  
  /reward              ← Reward roll, penalty logic, pity counter
    /handler.go        ← POST /submit-task endpoint
    /roll.go           ← deterministic RNG for drop table
    /pity.go           ← pity counter logic (200 guarantee)
    /penalty.go        ← remove/wilt items from garden
  
  /garden              ← Garden grid layout, item placement
    /handler.go        ← GET garden, POST placement
    /service.go        ← level unlock, grid validation
    /repository.go     ← queries
  
  /inventory           ← User item storage
    /handler.go        ← GET items, POST place
    /service.go        ← item acquisition, cleanup
    /repository.go
  
  /shop                ← Buy/sell items, pricing
    /handler.go        ← POST /buy, POST /sell
    /service.go        ← price calculation, balance validation
    /repository.go
  
  /marketplace         ← Legendary P2P listings, escrow
    /handler.go        ← POST /list, GET /listings, POST /buy
    /service.go        ← listing validation, escrow, transaction
    /repository.go
  
  /economy             ← Currency transactions, audit log
    /handler.go        ← GET balance, GET transactions
    /service.go        ← credit/debit, transaction recording
    /repository.go
  
  /social              ← Friends, feed, garden visit, hearts
    /handler.go        ← POST /friend-request, GET /friends, POST /like-garden
    /service.go        ← friend logic, feed generation
    /repository.go
  
  /leaderboard         ← Ranking computation, caching
    /handler.go        ← GET /global, GET /friends
    /service.go        ← score calculation, caching logic
    /repository.go
  
  /search              ← Elasticsearch integration
    /handler.go        ← GET /search?q=...
    /elasticsearch.go  ← index/query building
  
  /ai                  ← Daily recap, task suggestions
    /handler.go        ← GET /recap?date=...
    /recap.go          ← AI summary generation
    /suggest.go        ← task breakdown suggestions
  
  /metrics             ← Prometheus export
    /prometheus.go     ← /metrics endpoint

/pkg
  /cache               ← Redis client wrapper
    /redis.go          ← CRUD for timer, pity counter, rate limits
  
  /db                  ← Supabase/Postgres client
    /postgres.go       ← connection pool, transaction helpers
  
  /realtime            ← Supabase Realtime publisher
    /supabase.go       ← publish feed events, leaderboard updates
  
  /rng                 ← Seeded deterministic RNG
    /seeded.go         ← seed-based random for reward drops
```

---

## 3. Configuration Setup & Dependency Injection

### 3.1 Environment Variables

**Required in `.env` or production environment:**

```env
# Server
ENV=development|production
PORT=8080

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/focus_flow

# Auth (Supabase)
SUPABASE_URL=https://xxxxx.supabase.co

# Cache (Redis)
REDIS_URL=redis://localhost:6379

# Search (Elasticsearch)
ELASTICSEARCH_URL=http://localhost:9200

# AI (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLIC_KEY=pk_live_...

# Monitoring (Prometheus)
PROMETHEUS_ENABLED=true

# Realtime (Supabase)
SUPABASE_ANON_KEY=...
```

### 3.2 Config Struct (pkg/config/config.go)

**Current Implementation:**
```go
type Config struct {
    Env         string  // development | production
    Port        string  // default: 8080
    DatabaseURL string  // PostgreSQL connection string (required)
    SupabaseURL string  // Supabase JWKS endpoint (required)
}
```

**Extended Config (To Be Implemented):**
```go
type Config struct {
    // Server
    Env         string
    Port        string
    
    // Database
    DatabaseURL string
    MaxPoolConns int     // configurable from env (default: 10)
    
    // Cache
    RedisURL    string
    
    // Search
    ElasticsearchURL string
    
    // Auth
    SupabaseURL string
    SupabaseKey string // anon key for direct access
    
    // AI
    AnthropicKey string
    
    // Payments
    StripeSecretKey string
    StripePublicKey string
    
    // Realtime
    SupabaseRealtimeURL string
    
    // Monitoring
    PrometheusEnabled bool
}
```

### 3.3 Wire Setup (cmd/server/wire.go)

Wire is used for dependency injection. Build as:
```bash
go install github.com/google/wire/cmd/wire@latest
wire ./cmd/server
```

**Dependencies to wire:**
- `*pgxpool.Pool` (from db.NewPool)
- `*redis.Client` (from cache.NewRedis)
- `*elasticsearch.Client` (from search.NewElasticsearch)
- Service layer: TaskService, RewardService, GardenService, etc.
- HTTP handlers: TaskHandler, RewardHandler, etc.

### 3.4 Implementation Status

**✅ Completed:**
- [x] `cmd/server/main.go` - HTTP server with Chi router
- [x] `cmd/server/routes.go` - Router setup with health endpoint
- [x] `pkg/config/config.go` - Env loading (Env, Port, DatabaseURL, SupabaseURL)
- [x] `pkg/db/postgres.go` - PostgreSQL connection pool with pgxpool
- [x] `internal/auth/` - JWT middleware + Supabase JWKS
- [x] `internal/task/` - **Full Task CRUD implementation**:
  - [x] handler.go - All task endpoints (list, create, pause, submit, give-up, resume, notes CRUD)
  - [x] service.go - Business logic with state machine
  - [x] repository.go - DB queries with nested todos (JSONB), quota enforcement
  - [x] models.go - Types and validation
  - [x] routes.go - All routes registered
- [x] `pkg/apperr/` - Custom error types with DB error codes (Z0001-Z0008)
- [x] `pkg/response/` - Standardized response wrapper
- [x] `pkg/logger/` - Logger setup

**⏳ Partial / Needs Work:**
- [ ] `pkg/config/config.go` - Redis, Elasticsearch, Anthropic, Stripe config added but not used yet
- [ ] `cmd/server/wire.go` - Not implemented (services created directly in routes for now)
- [ ] CORS - Hardcoded to localhost:5173 (needs .env for prod)

**✅ Completed (Full Implementation):**
- [x] `internal/garden/` - handler.go (all placement endpoints), service.go (GetUserGardenList, GetUserGardenByID, PlaceItem, PlaceItemsBatch, RemoveItemsBatch), repository.go (batch operations with CTE)
- [x] `internal/reward/` - roll.go (tier-based RNG, exp calculation), models.go, penalty.go (SelectPenaltyItem)
- [x] `internal/economy/` - handler.go (3 endpoints), service.go (GetWallet, GetShopItems, GetSellableItems), repository.go (wallet & shop queries), models.go (all DTO types)

**❌ Not Yet Started (Stubs only):**
- [ ] `internal/session/` - Skeleton only, no Redis integration for timer state
- [ ] `internal/shop/` - BuyItem, SellItem logic not implemented
- [ ] `internal/marketplace/` - Models exist, logic empty
- [ ] `internal/social/` - Models exist (feed.go, friends.go, leaderboard.go), logic empty
- [ ] `internal/search/` - Elasticsearch integration not started
- [ ] `internal/ai/` - Anthropic integration not started
- [ ] `cmd/cronjob/` - Skeleton structure, not implemented (see Section 8)
- [ ] `pkg/cache/redis.go` - Redis client (not wired)
- [ ] `pkg/realtime/supabase.go` - Supabase Realtime (not wired)
- [ ] `pkg/metrics/` - Prometheus integration

---

## 4. Core Services

### 4.1 Task Service

**State Machine:**
```
[Active] (created & timer running) ──┬─→ Paused ─→ Active (resume)
                                     ├─→ [Submitted] (reward flow)
                                     └─→ [Given Up] (penalty flow, if penalty mode ON)
```

**Key Operations:**

#### CreateTask
- **Input:** user_id, title, todos[], registered_duration_min, penalty_mode (boolean: enable/disable per-task penalty)
- **Logic:**
  1. Validate todos non-empty and max 50 items
  2. Validate title (1-255 chars) and duration_min (25-480 min, cannot exceed 480 at creation)
  3. Create task with status='active', started_at=NOW() (auto-starts immediately)
  4. penalty_mode is snapshot from client (stored per-task)
  5. Insert into DB (status='active')
  6. Trigger auto-increments task_daily_quotas
  7. If quota exceeded → transaction rolls back, return 409 Conflict
- **Output:** task_id, redirect to Focus screen
- **Note:** Migration 004 automatically sets started_at=NOW() on task creation (timer auto-starts)

#### PauseTask
- **Input:** task_id
- **Logic:**
  1. Fetch task, validate status='active'
  2. Calculate delta = NOW() - started_at
  3. Accumulate: actual_duration_sec += delta
  4. Set started_at = NULL (timer paused)
  5. Set status = 'paused'
  6. Update DB
- **Output:** updated task, 200 OK
- **Note:** Separate endpoint from ResumeTask. Only pauses active tasks.

#### ResumeTask
- **Input:** task_id
- **Logic:**
  1. Fetch task, validate status='paused'
  2. Set started_at = NOW() (resume timer)
  3. Set status = 'active'
  4. Update DB
- **Output:** updated task, 200 OK
- **Note:** Only resumes paused tasks.

#### ResetTask
- **Input:** task_id
- **Logic:**
  1. Fetch task, validate status='active'
  2. Set started_at = NOW() (reset timer to current time)
  3. Set actual_duration_sec = 0 (clear accumulated time)
  4. Keep status='active'
  5. Update DB
- **Output:** success message, 200 OK
- **Note:** Clears elapsed time back to 0. Only works in active state. Timer restarts from 0.

#### ToggleStar
- **Input:** task_id
- **Logic:**
  1. Fetch task, validate user_id ownership
  2. Toggle is_starred: is_starred = NOT is_starred
  3. Update DB
- **Output:** new is_starred value (boolean), 200 OK
- **Note:** Starred tasks appear at top of task list. Toggle-able anytime (active, paused, or completed).

#### SubmitTask
- **Input:** task_id
- **Logic:**
  1. Fetch task, validate status='active' or 'paused' (can submit anytime)
  2. Auto-mark all todos as done (regardless of current state)
  3. Finalize actual_duration_sec:
     - If started_at IS NOT NULL: actual_duration_sec += (NOW() - started_at)
     - Set started_at = NULL
  4. Set completed_at = NOW(), status='submitted'
  5. Update DB, clear Redis timer state
  6. Trigger reward flow (→ RewardService.RollReward)
- **Output:** reward modal data (item dropped, silver earned, 200 OK)
- **Note:** Submit allowed from active or paused state. All todos auto-marked done on submission (no validation for checked status).

#### GiveUpTask
- **Input:** task_id, confirm=true
- **Logic:**
  1. Fetch task, validate status='active' (and started_at IS NOT NULL)
  2. task.penalty_mode is already captured from user_private at task creation time
  3. Set status='given_up', completed_at=NOW()
  4. If task.penalty_mode=true:
     - Trigger PenaltyService.ApplyPenalty (remove/wilt items)
  5. Update DB, clear Redis state
- **Output:** penalty modal data (items affected)
- **Note:** penalty_mode is snapshot at task creation, used at give-up time (not user's current setting)

#### ExtendTask
- **Input:** task_id, add_minutes (min 1, max 120 per extend)
- **Logic:**
  1. Fetch task, validate status='active' or 'paused'
  2. registered_duration_min += add_minutes
  3. Validate total registered_duration_min does not exceed 999 minutes
  4. Update DB
- **Output:** success message
- **Note:** Each extend must be 1-120 minutes. Total cannot exceed 999 minutes.

#### UpdateTodos (Debounced Autosave)
- **Input:** task_id, todos[]
- **Logic:**
  1. Fetch task, validate status='active' or 'paused'
  2. Update task.todos = new todos[] in DB
  3. Return success message
- **Output:** success message, 200 OK
- **Note:** Called from frontend on ~1 sec idle (debounced). No validation of todos state. This is just persistence.

#### AddTaskNote
- **Input:** task_id, content
- **Logic:**
  1. Insert into task_notes with content
  2. Timestamp auto-set to NOW()
- **Output:** note_id, 201 Created

#### UpdateTaskNote
- **Input:** note_id, content
- **Logic:**
  1. Fetch note, validate user_id ownership
  2. Update task_notes.content, updated_at=NOW()
  3. Update DB
- **Output:** updated note, 200 OK

#### DeleteTaskNote
- **Input:** note_id
- **Logic:**
  1. Fetch note, validate user_id ownership
  2. Delete from task_notes
- **Output:** 204 No Content

#### GetTaskHistory
- **Input:** user_id, date_range, status_filter
- **Logic:**
  1. Query tasks WHERE user_id=?, deleted_at IS NULL
  2. Filter by status, date range
  3. Eager-load todos, notes, completed_at
  4. Sort by created_at DESC
- **Output:** tasks[], count

---

### 4.2 Reward Service

**Tier-Based Drop Table (by user level):**
```
Tier 1 (level 1-4):   Common 69.99% | Uncommon 20% | Rare 7% | Epic 2.5% | Legendary 0.5% | Eternal 0.01%
Tier 2 (level 5-9):   Common 57.99% | Uncommon 22% | Rare 12% | Epic 7.5% | Legendary 0.5% | Eternal 0.01%
Tier 3 (level 10-14): Common 43.99% | Uncommon 22% | Rare 18% | Epic 15.5% | Legendary 0.5% | Eternal 0.01%
Tier 4 (level 15-19): Common 27.99% | Uncommon 22% | Rare 22% | Epic 27.5% | Legendary 0.5% | Eternal 0.01%
Tier 5 (level 20+):   Common 16.49% | Uncommon 20% | Rare 25% | Epic 38% | Legendary 0.5% | Eternal 0.01%
```

**Silver Reward by User Level:**
```
Level 1-4:   60-120 silver
Level 5-9:   150-250 silver
Level 10-14: 280-420 silver
Level 15-19: 450-650 silver
Level 20+:   700-1,200 silver
```

**EXP Per Task (by level):**
- Level 1: 10 EXP (1 task to level 2)
- Level 2-3: 20 EXP per task
- Level 4-7: 35 EXP per task
- Level 8-11: 55 EXP per task
- Level 12-16: 75 EXP per task
- Level 17+: 85 + (level-17)×5 EXP per task

**Key Operations:**

#### RollReward
- **Input:** task_id, user_id, user_level
- **Logic:**
  1. Get tier from user_level
  2. Seeded RNG with seed = `${task_id}:${user_id}:${timestamp_ns}` (HMAC-SHA256 mixing)
  3. Roll rarity from tier table using weighted distribution (basis points = 10000)
  4. Attempt to select random item at rolled rarity:
     - If no item at rarity → fallback to lower rarity (loop: Legendary→Epic→Rare→Uncommon→Common)
  5. Roll silver amount from level-based range
  6. Calculate EXP from ExpPerTask(level)
  7. Create reward_rolls audit record (roll_type='reward')
  8. Insert item into inventory (status='in_bag')
  9. Update user_wallets: silver_balance += silver, exp += exp
  10. Trigger level up if total_exp crosses threshold
- **Output:** {rolled_rarity, item_rarity, item_id, silver, exp, seed}

---

### 4.3 Penalty Service

**Apply Penalty Logic:**
- **Input:** task_id, user_id
- **Logic:**
  1. Query garden placements for user (all items regardless of health)
  2. If no items → no effect
  3. Random select 1 item (weighted toward lower rarity)
  4. Delete placement, update inventory.status='in_bag', create penalty audit record
  5. Publish realtime event (for UI update)
- **Output:** removed_item (single item or null if no items)

**Inactive Penalty (cronjob, daily):**
- **Logic:**
  1. Query users WHERE last_login < 7 days ago AND not_penalized_today
  2. For each user:
     - Get all healthy garden items (across all levels)
     - Calculate wilt_count = ceil(healthy_count / 4)
     - Random select wilt_count items
     - Set health_status='wilted' for each
     - Create audit log
  3. Mark as penalized_today (prevent double penalty)
- **Frequency:** Once daily (cronjob)

---

### 4.4 Garden Service

**Key Operations:**

#### GetUserGardenList
- **Input:** user_id
- **Logic:**
  1. Query all user_gardens joined with gardens table
  2. Sort by garden_index ASC
- **Output:** GardenListItem[] with fields: id, garden_id, garden_index, expansion_level, is_expandable, can_expand

#### GetUserGardenByID
- **Input:** user_id, user_garden_id
- **Logic:**
  1. Validate user_garden_id belongs to user
  2. Fetch user_garden with garden metadata (grid_size, garden_index, expansion_level, is_expandable)
  3. Fetch all placements for this garden
  4. Calculate current_grid_size from base_size + expansion_level × 5
- **Output:** GardenResponse with placements, grid info, watering status

#### PlaceItem (Single)
- **Input:** user_id, user_garden_id, inventory_id, grid_x, grid_y, rotation (0/90/180/270)
- **Logic:**
  1. Wrapper around PlaceItemsBatch with single item
  2. Delegates to batch logic
- **Output:** PlacementResponse with placement details, 201 Created
- **Errors:** ValidationError (overlap, out of bounds), NotFoundError (garden/inventory)

#### PlaceItemsBatch
- **Input:** user_id, user_garden_id, items[] (inventory_id, grid_x, grid_y, rotation)
- **Logic:**
  1. Start transaction, lock user_garden (FOR UPDATE)
  2. Get current grid size from base_size + expansion_level
  3. Fetch inventory items map (O(k))
  4. Fetch existing placements bounding boxes (O(k))
  5. For each item in batch (in-memory validation O(k)):
     a. Check duplicate within request
     b. Validate inventory exists & not already placed
     c. Calculate effective dimensions (width, height) based on rotation
     d. Bounds check: item within grid
     e. Overlap check: item vs existing + items in batch
     f. On success: add to createParams, update currentStateBoxes
     g. On failure: add to results with error reason
  6. Batch insert placements + update inventory status to 'placed' (pgx.Batch, 1 round-trip)
  7. Commit transaction
- **Output:** MultiPlaceResponse with results[] (per-item success/error/placement data), 201 Created
- **Errors:** NotFoundError (garden), DuplicateError (race condition 23505)

#### RemoveItemsBatch
- **Input:** user_id, user_garden_id, inventory_ids[]
- **Logic:**
  1. Sanitize input: remove duplicate IDs
  2. Start transaction, lock user_garden (FOR UPDATE)
  3. Execute CTE query:
     a. Filter valid_inventory: must belong to user, status != 'on_market'
     b. Delete garden_placements for valid_inventory
     c. Update inventory status to 'in_bag'
     d. Return deleted inventory_ids
  4. Commit transaction
- **Output:** MultiRemoveResponse with successful_inventory_ids[], 200 OK
- **Errors:** NotFoundError (garden)
  3. Validate wallet has enough silver
  4. Debit silver
  5. Increment garden.expansion_level
  6. Create economy_transaction audit record
- **Output:** updated garden, new_grid_size

#### GetGardenStats
- **Input:** user_id, garden_index
- **Output:**
  ```json
  {
    "total_items": 48,
    "garden_value_silver": 1250000,
    "legendary_count": 3,
    "by_rarity": {
      "common": 25,
      "uncommon": 15,
      "rare": 5,
      "epic": 2,
      "legendary": 3
    }
  }
  ```

---

### 4.5 Shop Service (❌ Not Yet Started - Buy/Sell logic)

**Implemented Read Operations:**
- `GetShopItems()` - Fetch all purchasable items from items table (is_purchasable=true, silver_price NOT NULL)
- `GetSellableItems(user_id)` - Fetch user's inventory items that can be sold back

**Key Operations (TODO):**

#### BuyItem
- **Input:** user_id, item_id, quantity=1
- **Logic:**
  1. Fetch item, validate is_purchasable=true
  2. Validate item.silver_price NOT NULL or item.gold_price NOT NULL
  3. Calculate total cost
  4. Validate wallet balance
  5. Debit wallet
  6. Create inventory entries (quantity copies)
  7. Record economy_transaction (spend_silver or spend_gold)
- **Output:** inventory_id[], 201 Created

#### SellItem
- **Input:** user_id, inventory_id
- **Logic:**
  1. Fetch inventory, validate user_id match
  2. Validate item.buyback_silver OR item.buyback_gold not NULL
  3. If rarity='legendary':
     - Credit 1 gold (not silver)
  4. Else:
     - Credit buyback_silver = item.silver_price × 0.5 (rounded down)
  5. Delete inventory record
  6. Record economy_transaction (earn_silver or earn_gold)
- **Output:** 200 OK

#### BuyWatering
- **Input:** user_id, quantity=1
- **Logic:**
  1. Cost = 50 silver per watering can
  2. Validate wallet balance
  3. Debit wallet
  4. Create inventory entries (type='consumable' or similar)
  5. Record transaction
- **Output:** inventory_ids[]

#### UseWatering
- **Input:** user_id, placement_id
- **Logic:**
  1. Validate placement.health_status='wilted'
  2. Check user has watering inventory available
  3. Delete watering inventory
  4. Set placement.health_status='healthy', wilted_at=NULL
  5. Record transaction (use_consumable)
- **Output:** 200 OK

---

### 4.6 Marketplace Service

**Key Operations:**

#### ListLegendary
- **Input:** user_id, inventory_id, price_gold
- **Logic:**
  1. Validate inventory_id belongs to user
  2. Fetch item, validate rarity='legendary'
  3. Validate price_gold >= 5
  4. Validate inventory.is_placed = false (can't sell placed items)
  5. Create marketplace_listing with status='active'
  6. Record economy_transaction (list_legendary)
- **Output:** listing_id, 201 Created

#### GetListings
- **Input:** limit=20, offset=0, sort_by='price|newest'
- **Logic:**
  1. Query marketplace_listings WHERE status='active'
  2. Eager-load seller profile, item details
  3. Sort and paginate
- **Output:** listings[]

#### BuyFromMarketplace
- **Input:** user_id, listing_id
- **Logic:**
  1. Fetch listing, validate status='active'
  2. Check buyer has enough gold
  3. Calculate fee = ceil(price × 0.1) (min 1 gold)
  4. Total cost = price + fee
  5. Start transaction:
     a. Debit buyer.gold_balance (total)
     b. Credit seller.gold_balance (price only, fee goes to app/burned)
     c. Transfer inventory to buyer (update user_id)
     d. Set listing.status='sold', sold_at=NOW()
     e. Record economy_transactions (buy and sell)
  6. Commit transaction
  7. Publish realtime event (listing sold)
- **Output:** updated listing, 200 OK

---

### 4.7 Leaderboard Service

**Garden Value Calculation:**
```
garden_value = Σ(item.silver_price × health_factor for placed items)
             + Σ(market_price × 10000 for legendary)

health_factor = 1.0 if healthy, 0 if wilted
market_price = latest legendary transaction price (default 5 gold = 50000 silver)
```

**Key Operations:**

#### ComputeGlobalLeaderboard
- **Input:** limit=100
- **Logic:**
  1. Query users with their gardens
  2. For each user:
     - Calculate garden_value for each level
     - Sum total value
     - Count legendary (healthy)
  3. Sort by value DESC, then legendary count DESC
  4. Cache in Redis for 5 minutes (expensive query)
- **Output:** leaderboard_entry[] (rank, user, value, legendary_count)

#### ComputeFriendsLeaderboard
- **Input:** user_id, limit=20
- **Logic:**
  1. Get user's friend list (both directions)
  2. For each friend:
     - Calculate garden value (same as above)
  3. Sort DESC
- **Output:** leaderboard_entry[]

#### GetUserRank
- **Input:** user_id
- **Logic:**
  1. Calculate user's garden value
  2. Count users with higher value
  3. Return rank (1-indexed)
- **Output:** rank, value, position_in_global_100

---

### 4.8 Social Service

**Key Operations:**

#### SendFriendRequest
- **Input:** user_id, target_user_id
- **Logic:**
  1. Validate target exists and not self
  2. Check no pending request already
  3. Create friendship record with status='pending'
  4. Send notification to target
- **Output:** 201 Created

#### AcceptFriendRequest
- **Input:** user_id, friendship_id
- **Logic:**
  1. Validate friendship.addressee_id = user_id
  2. Set status='accepted'
  3. Publish realtime event
- **Output:** 200 OK

#### RejectFriendRequest
- **Input:** friendship_id
- **Logic:**
  1. Delete friendship record
- **Output:** 204 No Content

#### GetFriendsList
- **Input:** user_id
- **Logic:**
  1. Query friendships WHERE (requester_id=user_id OR addressee_id=user_id) AND status='accepted'
  2. Eager-load friend profiles
- **Output:** friends[]

#### LikeGarden
- **Input:** user_id, target_user_id, garden_index
- **Logic:**
  1. Check like doesn't already exist
  2. Insert into garden_hearts
  3. Increment user profile heart count (cache?)
- **Output:** 201 Created

#### UnlikeGarden
- **Input:** user_id, target_user_id, garden_index
- **Logic:**
  1. Delete from garden_hearts
- **Output:** 204 No Content

#### GetSocialFeed
- **Input:** user_id
- **Logic:**
  1. Query feed_events from friends WHERE created_at > 7 days ago
  2. Types: level_up, legendary_drop, top10_rank, streak_milestone
  3. Sort by created_at DESC, limit 50
- **Output:** feed_events[]

---

### 4.9 Search Service

**Key Operations:**

#### SearchTasks
- **Input:** user_id, query, date_from, date_to, limit=20
- **Logic:**
  1. Query Elasticsearch for tasks matching user_id
  2. Full-text search on title, todos, notes
  3. Filter by date range
  4. Highlight matched snippets
- **Output:** tasks[] with highlights

#### IndexTask
- **Input:** task_id, task object
- **Logic:**
  1. Build Elasticsearch document with nested todos and notes
  2. Index with user_id as filter field
- **Triggered on:** task creation, task notes added

---

### 4.10 AI Service

**Key Operations:**

#### GenerateDailyRecap
- **Input:** user_id, date
- **Logic:**
  1. Query tasks WHERE user_id=? AND completed_at matches date
  2. Summarize: total tasks, completed count, given_up count, silver earned
  3. Call Anthropic API with prompt:
     ```
     Summarize this productivity day:
     - Completed: [N] tasks, Given up: [M]
     - Tasks: [titles]
     - Notes: [all notes concatenated]
     - Silver earned: [amount]
     - Legendary drops: [count]
     
     Generate a motivational, brief recap (max 100 words)
     Also suggest 2-3 improvements for tomorrow
     ```
  4. Parse response, store in daily_recaps table
- **Output:** recap_text, ai_suggestions[]

#### SuggestTaskBreakdown
- **Input:** task_title
- **Logic:**
  1. Call Anthropic API:
     ```
     Suggest a checklist breakdown for: "[task_title]"
     Format: JSON array of {text, estimated_subtask_time_min}
     Keep list 3-7 items, realistic for focus session
     ```
  2. Parse response
- **Output:** suggested_todos[] with time estimates

---

## 5. API Endpoints

### 4.1 Task Management

```
POST   /api/tasks/:id/pause      Toggle pause/resume timer
POST   /api/tasks/:id/extend     { add_minutes }
PATCH  /api/tasks/:id/todos      { todos[] }
POST   /api/tasks/:id/submit     Submit task (can submit from active or paused)
POST   /api/tasks/:id/give-up    Give up task
DELETE /api/tasks/:id             Soft-delete task
POST   /api/tasks/:id/notes      { content }  Create note
PATCH  /api/tasks/:id/notes/:nid { content }  Update note
DELETE /api/tasks/:id/notes/:nid             Delete note
GET    /api/tasks/:id/notes      Get all notes
```

### 4.2 Garden Management

```
GET    /api/garden/                     Get user's all gardens (list)
GET    /api/garden/{id}                 Get garden by user_garden_id (detailed view)
POST   /api/garden/{id}/placements      Place single item on grid
POST   /api/garden/{id}/placements/batch Place multiple items (batch) on grid
DELETE /api/garden/{id}/placements      Remove multiple items (batch) from grid

(✓ Implemented | ✗ Planned | ○ Not Yet Started)
```

### 4.3 Inventory & Shop (Economy)

```
✅ IMPLEMENTED:
GET    /api/economy/wallet              Get silver/gold balance
GET    /api/economy/shop/buy            Get purchasable items (shop catalog)
GET    /api/economy/shop/sell           Get sellable items from inventory

⏳ TODO:
POST   /api/economy/shop/buy            Buy item from shop (silver)
POST   /api/economy/shop/sell           Sell item back to shop
POST   /api/consumables/watering/buy    Buy watering cans
POST   /api/consumables/watering/use    Use watering can on placement
```

### 4.4 Marketplace

```
GET    /api/marketplace/listings        List legendary for sale
POST   /api/marketplace/listings        Create new listing
GET    /api/marketplace/listings/:id    Get listing detail
POST   /api/marketplace/listings/:id/buy Buy legendary
DELETE /api/marketplace/listings/:id    Cancel listing
```

### 4.5 Economy (Transactions & Conversion)

```
⏳ TODO:
GET    /api/economy/transactions        Get transaction history
POST   /api/economy/convert             Convert gold to silver (1 gold = 10k silver)
```

### 4.6 Social

```
POST   /api/friends/request             Send friend request
POST   /api/friends/accept/:id          Accept request
DELETE /api/friends/reject/:id          Reject request
GET    /api/friends                     Get friends list
POST   /api/gardens/:owner/:index/like  Like a garden
DELETE /api/gardens/:owner/:index/like  Unlike
GET    /api/leaderboard/global          Get global top 100
GET    /api/leaderboard/friends         Get friends ranking
GET    /api/leaderboard/me              Get own rank
GET    /api/social/feed                 Get social feed
```

### 4.7 Search & Analytics

```
GET    /api/search?q=                   Full-text search on tasks
GET    /api/recaps/:date                Get daily recap (or generate if missing)
POST   /api/ai/suggest-todos            Suggest task checklist
GET    /api/metrics                     Prometheus metrics
```

---

## 6. Rate Limiting & Quotas

| Endpoint | Limit | Window |
|---|---|---|
| POST /tasks | per plan | per day (3/10/16) |
| POST /tasks/:id/extend | unlimited | - |
| POST /shop/buy | 50 | per day |
| POST /marketplace/listings | 5 | per day |
| GET /search | 30 | per minute |
| Others | 100 | per minute |

---

## 7. Error Handling

```json
{
  "error": "QUOTA_EXCEEDED",
  "message": "Daily task limit reached (3/3)",
  "retry_after_seconds": 86400
}
```

**HTTP Status Codes:**
- `400 Bad Request` — invalid input
- `401 Unauthorized` — missing/expired JWT
- `403 Forbidden` — user doesn't own resource
- `404 Not Found` — resource doesn't exist
- `409 Conflict` — quota exceeded, business logic violation
- `429 Too Many Requests` — rate limited
- `500 Internal Server Error` — server error

**Database Error Codes (PostgreSQL `errcode`):**
| Code | Trigger | Detail |
|---|---|---|
| **Z0001** | `handle_new_auth_user()` | System initialization error: Starter garden not found on registration |
| **Z0002** | `fn_tasks_protect_system_fields()` | Immutable field error: `created_at` cannot be modified after creation |
| **Z0003** | `fn_tasks_protect_system_fields()` | System-managed fields cannot be modified directly (penalty_mode, status, started_at, actual_duration_sec, completed_at, deleted_at) |
| **Z0004** | `fn_enforce_task_quota()` | Quota exceeded: Daily task limit exceeded (task limit depends on plan: free=3, pro=10, premium=16) |
| **Z0005** | `fn_enforce_task_note_limit()` | Ownership error: Task not owned by user (user does not own this task) |
| **Z0006** | `fn_enforce_task_note_limit()` | Resource limit exceeded: Task note limit exceeded (max 5 notes per task) |
| **Z0007** | `fn_submit_task_reward()` | Resource not found: User wallet not found (wallet record missing in user_wallets) |
| **Z0008** | `fn_submit_task_reward()` | Invalid state: Task already submitted or not found |

**API-Level Error Contract (minimal):**
```json
{
  "error": "Z0004",
  "message": "Daily task quota exceeded",
  "detail": "User has exceeded the daily task limit (3 tasks/day). Used: 3, Limit: 3"
}
```
Backend translates DB errors to user-friendly messages with original `errcode` in response for debugging.

---

## 8. Background Jobs (Cronjob Service) — ❌ NOT YET IMPLEMENTED

**Planned to run every 24 hours (midnight UTC):**
1. **Inactive Penalty**
   - Query users WHERE last_login < 7 days ago
   - Wilt 1/4 of their healthy garden items
   - Create feed notifications

2. **Marketplace Cleanup**
   - Query listings WHERE created_at > 30 days ago AND status='active'
   - Auto-cancel expired listings
   - Notify sellers

3. **Daily Recap Generation** (optional, on-demand)
   - Generate recap for users who log in today
   - Store in daily_recaps table

**Status:** Skeleton structure exists at `cmd/cronjob/main.go` but implementation not started.

---

## 9. Monitoring & Observability

### Prometheus Metrics
- `task_submissions_total` — counter, by status (submitted/given_up)
- `task_duration_histogram` — histogram, by rarity
- `reward_drops_total` — counter, by rarity
- `garden_value_histogram` — histogram
- `wallet_transactions_total` — counter, by type
- `api_latency_histogram` — by endpoint
- `db_query_latency_histogram` — by table
- `cache_hits_total` — by key pattern
- `elasticsearch_query_latency_histogram`

### Grafana Dashboards
- **Ops Dashboard:** API latency, error rates, cache hits, DB slow queries
- **Business Dashboard:** DAU, tasks/day, legendary drop rate, marketplace volume, revenue projection

---

## 10. Security Checklist

- [ ] All write endpoints require JWT auth (Supabase)
- [ ] RLS policies on sensitive tables (user_private, user_wallets)
- [ ] Rate limiting on all endpoints
- [ ] SQL injection prevention (parameterized queries only)
- [ ] CORS configured for frontend domain
- [ ] Stripe webhook signature verification
- [ ] Anthropic API key in environment secrets
- [ ] Redis password protected
- [ ] Database password in AWS Secrets Manager
- [ ] Audit logs for financial transactions (economy_transactions)
- [ ] Input validation on all endpoints
