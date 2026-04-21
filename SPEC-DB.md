# SPEC-DB.md — FocusFlow v2 Database Schema

> PostgreSQL/Supabase database schema, constraints, and relationships

---

## 1. Core Tables

### 1.1 Authentication & Users

#### `auth.users` (managed by Supabase Auth)
- Standard Supabase auth table
- Stores email, OAuth providers, JWT tokens

#### `users` (public profile)
```sql
id                  uuid PK
display_name        varchar(255) NOT NULL (2+ chars)
bio                 varchar(255)
avatar_url          text
active_frame_id     uuid FK → frames(id) [SET NULL on delete]
created_at          timestamptz
updated_at          timestamptz
```

**Triggers:**
- `trg_update_users_modtime` — auto-update `updated_at` on any update

#### `user_private` (private user data, NOT exposed in public queries)
```sql
user_id             uuid PK → users(id) [CASCADE delete]
email               varchar(255) UNIQUE NOT NULL
plan_type           text DEFAULT 'free' → plan_quotas(plan_type)
penalty_mode        boolean DEFAULT true    -- user-level penalty setting
updated_at          timestamptz
```

**Purpose:** Stores sensitive user data (email), subscription plan, and penalty mode setting. Never queried in public endpoints.

**Triggers:**
- `trg_update_user_private_modtime` — auto-update `updated_at`

#### `user_wallets` (currency balances)
```sql
user_id             uuid PK → users(id) [CASCADE delete]
silver_balance      bigint DEFAULT 0 CHECK >= 0
gold_balance        int DEFAULT 0 CHECK >= 0
updated_at          timestamptz
```

**Rules:**
- Silver earned only from task completion (cannot buy with real money)
- Gold earned from IAP only
- 1 gold = 10,000 silver (one-way conversion)

**Triggers:**
- `trg_update_user_wallets_modtime`

---

### 1.2 Plan Quotas (Lookup)

#### `plan_quotas` (static reference table)
```sql
plan_type           text PK
daily_task_limit    int NOT NULL
```

**Data:**
```
free     → 3 tasks/day
pro      → 10 tasks/day
premium  → 16 tasks/day
```

---

### 1.3 Tasks & Sessions

#### `tasks`
```sql
id                  uuid PK
user_id             uuid NOT NULL → users(id) [CASCADE delete]
title               text NOT NULL (non-empty)
todos               jsonb NOT NULL DEFAULT []  -- array of {id, text, checked, indent}
                                                   -- synced via PATCH /api/tasks/:id/todos (debounced)
penalty_mode        boolean DEFAULT false      -- snapshot of user.penalty_mode at creation
status              text DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'submitted', 'given_up'))
registered_duration_min  int NOT NULL CHECK > 0
actual_duration_sec int DEFAULT 0 CHECK >= 0
started_at          timestamptz                -- NULL when paused/submitted
created_at          timestamptz
updated_at          timestamptz
completed_at        timestamptz                -- set when submitted
deleted_at          timestamptz
```

**Constraints:**
- `CHECK task_must_have_todos` — jsonb_array_length(todos) > 0

**Triggers:**
- `trg_update_tasks_modtime` — auto-update `updated_at`
- `trg_pre_insert_task_quota` — enforce daily task limit, increment `task_daily_quotas`

**Indexes:**
- `idx_tasks_user_active` — (user_id) WHERE deleted_at IS NULL AND status='active'

**Logic Notes:**
- Task created with status='active' but `started_at` IS NULL (timer not running)
- When user clicks "Start", `started_at` = NOW()
- When paused, `actual_duration_sec` += (NOW() - started_at), then `started_at` = NULL
- When submitted/given_up, finalize `actual_duration_sec` and set `completed_at`
- `penalty_mode` captured at task creation from user.penalty_mode (never changes after)

#### `task_daily_quotas` (auto-increment via trigger)
```sql
user_id             uuid FK → users(id) [CASCADE delete]
target_date         date DEFAULT current_date
usage_count         int DEFAULT 0 CHECK >= 0
PRIMARY KEY         (user_id, target_date)
```

**Purpose:** Tracks how many tasks user has started today. Increment happens in `fn_enforce_task_quota()` trigger before INSERT on tasks.

#### `task_notes` (audit trail, append-only)
```sql
id                  uuid PK
task_id             uuid NOT NULL → tasks(id) [CASCADE delete]
user_id             uuid NOT NULL → users(id) [CASCADE delete]
content             text NOT NULL (non-empty)
created_at          timestamptz
updated_at          timestamptz
```

**Index:**
- `idx_task_notes_task_id` — (task_id DESC)

**Logic:**
- User can append notes during Focus session
- Notes are immutable after creation (audit trail)
- Updated_at only changes if note edited (rare), not on creation

---

### 1.4 Garden System

#### `gardens` (core template - no user_id)
```sql
id                  uuid PK
garden_index        int NOT NULL CHECK BETWEEN 1 AND 20
grid_size           int NOT NULL DEFAULT 5 CHECK > 0
is_expandable       boolean NOT NULL DEFAULT false
unlock_condition    jsonb DEFAULT NULL
created_at          timestamptz
```

**Logic:**
- Core resource table: defines garden templates for each level (1-20)
- `grid_size`: base grid dimensions (5×5 for level 1, increments per level, max 25×25 base for level 20)
- `is_expandable`: whether users can expand this garden (only true for level 20)
- `unlock_condition`: JSON conditions to unlock this garden level (e.g., `{"min_level": 5}` or null for always available)
- Grid size calculated at level N: (5 + N) × (5 + N), with expansions applied via `user_gardens.expansion_level`

#### `user_gardens` (user ownership & progression)
```sql
id                  uuid PK
user_id             uuid NOT NULL → users(id) [CASCADE delete]
garden_id           uuid NOT NULL → gardens(id) [CASCADE delete]
expansion_level     int NOT NULL DEFAULT 0 CHECK >= 0
created_at          timestamptz
updated_at          timestamptz
UNIQUE              (user_id, garden_id)
```

**Logic:**
- User-specific record linking a user to a garden level they own
- `expansion_level` tracks how many times user expanded (only for garden_index=20)
  - Expanded grid size: (base + 5×expansion_level) × (base + 5×expansion_level)
- User automatically gets `garden_id=1` on signup
- When all slots filled at level N → backend creates new `user_gardens` record for level N+1

**Triggers:**
- `trg_update_user_gardens_modtime`

#### `garden_placements`
```sql
id                  uuid PK
user_garden_id      uuid NOT NULL → user_gardens(id) [CASCADE delete]
inventory_id        uuid NOT NULL UNIQUE → inventory(id) [CASCADE delete]
grid_x              int NOT NULL CHECK >= 0
grid_y              int NOT NULL CHECK >= 0
rotation            smallint DEFAULT 0 CHECK IN (0, 90, 180, 270)
health_status       varchar DEFAULT 'healthy' CHECK IN ('healthy', 'wilted')
wilted_at           timestamptz DEFAULT NULL
placed_at           timestamptz DEFAULT now()
updated_at          timestamptz
UNIQUE              (user_garden_id, grid_x, grid_y)
```

**Logic:**
- Each garden placement occupies one grid cell (1×1)
- `user_garden_id` references `user_gardens`, isolating placements by user+garden
- `inventory_id` UNIQUE globally prevents item placed twice across all gardens
- `health_status`: 
  - `healthy` (default) — item displays normally, counts toward garden value
  - `wilted` — item lost luster (from penalty or inactive 7 days), doesn't count toward value
- `wilted_at` tracks when item was wilted
- Legendary items can only be wilted (never removed)
- Common→Epic items removed permanently when penalized

**Triggers:**
- `trg_after_garden_placement_change` — syncs `inventory.is_placed` when placement inserted/deleted
- `trg_update_garden_placements_modtime`

---

### 1.5 Items & Inventory

#### `items` (master catalog, static)
```sql
id                  uuid PK
name                varchar(255) NOT NULL
type                varchar(50) NOT NULL
                    CHECK (type IN ('flower', 'structure', 'decoration', 'path'))
rarity              varchar(50) NOT NULL
                    CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'))
asset_key           varchar(255) NOT NULL
height              int DEFAULT 1 CHECK > 0
width               int DEFAULT 1 CHECK > 0
silver_price        int DEFAULT NULL CHECK > 0  -- shop buy price (silver)
gold_price          int DEFAULT NULL CHECK > 0  -- reserved for future use
buyback_silver      int DEFAULT NULL CHECK > 0  -- shop sell-back price (silver)
buyback_gold        int DEFAULT NULL CHECK > 0  -- reserved for future use
is_purchasable      boolean DEFAULT true
can_wilt            boolean DEFAULT false        -- only true for flowers/plants
created_at          timestamptz
```

**Logic:**
- `silver_price` NULL → item not for sale
- Common→Rare can be purchased by silver
- Epic cannot be purchased (only obtained as reward)
- Legendary cannot be purchased (only obtained as reward, traded via marketplace)
- `buyback_silver` = typically 50% of silver_price
- `can_wilt` TRUE for flowers/plants, FALSE for structures/decorations

#### `inventory` (user-owned items)
```sql
id                  uuid PK
user_id             uuid NOT NULL → users(id) [CASCADE delete]
item_id             uuid NOT NULL → items(id) [RESTRICT delete]
is_placed           boolean DEFAULT false      -- optimization for UI filtering
acquired_at         timestamptz DEFAULT now()
```

**Logic:**
- `is_placed` is optimized column (prevents SELECT JOIN for filtering)
- Synced automatically via trigger when `garden_placements` changed
- User can have multiple copies of same item

---

### 1.6 Avatar Cosmetics

#### `frames` (master catalog)
```sql
id                  uuid PK
name                varchar(255) NOT NULL
asset_url           text NOT NULL              -- CSS border or SVG
silver_price        int DEFAULT NULL CHECK > 0
gold_price          int DEFAULT NULL CHECK > 0
created_at          timestamptz
```

**Logic:**
- Avatar frames are purely cosmetic borders around user profile avatar
- Purchasable via shop using silver

#### `user_frames` (ownership tracking)
```sql
id                  uuid PK
user_id             uuid NOT NULL → users(id) [CASCADE delete]
frame_id            uuid NOT NULL → frames(id) [RESTRICT delete]
acquired_at         timestamptz DEFAULT now()
UNIQUE              (user_id, frame_id)
```

**Logic:**
- User can own multiple frames, only one active at a time
- Active frame stored in `users.active_frame_id`

---

## 2. Reward & Economy Tables (Planned)

### 2.1 Reward Tracking
```sql
reward_rolls (
  id uuid PK,
  task_id uuid FK → tasks(id),
  user_id uuid FK → users(id),
  seed text,                      -- deterministic RNG seed
  rarity_result varchar,          -- common|uncommon|rare|epic|legendary
  item_id uuid FK → items(id),
  silver_amount int,
  created_at timestamptz
)
```

### 2.2 Economy Audit Trail
```sql
economy_transactions (
  id uuid PK,
  user_id uuid FK → users(id),
  type varchar,                   -- earn_silver|spend_silver|earn_gold|spend_gold|iap
  amount bigint,
  reference_id uuid,              -- task_id, marketplace_listing_id, etc
  note text,
  created_at timestamptz
)
```

---

## 3. Social & Marketplace Tables (Planned)

### 3.1 Friendships
```sql
friendships (
  id uuid PK,
  requester_id uuid FK → users(id),
  addressee_id uuid FK → users(id),
  status varchar,                 -- pending|accepted
  created_at timestamptz,
  UNIQUE(requester_id, addressee_id)
)
```

### 3.2 Legendary P2P Marketplace
```sql
marketplace_listings (
  id uuid PK,
  seller_id uuid FK → users(id),
  inventory_id uuid FK → inventory(id),
  price_gold int CHECK >= 5,
  status varchar,                 -- active|sold|cancelled
  listed_at timestamptz,
  sold_at timestamptz,
  UNIQUE(inventory_id, status='active')
)
```

### 3.3 Social Feed Events
```sql
feed_events (
  id uuid PK,
  user_id uuid FK → users(id),
  event_type varchar,             -- level_up|legendary_drop|top10|streak_milestone
  payload jsonb,
  created_at timestamptz
)
```

### 3.4 Garden Hearts (Likes)
```sql
garden_hearts (
  id uuid PK,
  user_id uuid FK → users(id),    -- liker
  target_user_id uuid FK → users(id),  -- garden owner
  garden_index int,
  created_at timestamptz,
  UNIQUE(user_id, target_user_id, garden_index)
)
```

---

## 4. Analytics Tables (Planned)

### 4.1 Daily Recaps
```sql
daily_recaps (
  id uuid PK,
  user_id uuid FK → users(id),
  date date UNIQUE,
  content text,                   -- AI-generated summary
  tasks_completed int,
  tasks_given_up int,
  silver_earned bigint,
  items_earned jsonb,
  ai_suggestions jsonb,
  created_at timestamptz
)
```

---

## 5. Key Constraints & Validations

### Task Constraints
- User can start max N tasks per day (from `plan_quotas`)
- Each task must have ≥1 todo item
- Task duration must be > 0 minutes
- Actual elapsed time must be ≥ 0 seconds

### Garden Constraints
- User has exactly 1 garden per level (1-20)
- Each placement occupies 1 grid cell
- No overlapping placements (unique garden_id, grid_x, grid_y)
- Item placed globally once (unique inventory_id across all placements)

### Wallet Constraints
- Silver/gold balances never negative
- Silver cannot be purchased (only earned)
- Gold purchased via IAP only

### Marketplace Constraints
- Only Legendary items can be listed
- Minimum price: 5 gold
- 10% transaction fee (rounded up, min 1 gold)

---

## 6. Triggers & Functions

### Auto-Timestamp Updates
- `fn_set_updated_at()` — sets `updated_at = now()` on any UPDATE

### Task Quota Enforcement
- `fn_enforce_task_quota()` — validates daily task limit before INSERT on tasks
  - Checks user's plan and compares against `task_daily_quotas`
  - Raises exception if quota exceeded

### Garden Placement Sync
- `fn_sync_inventory_placement()` — syncs `inventory.is_placed` when `garden_placements` changes
  - INSERT: set `is_placed = true`
  - DELETE: set `is_placed = false`
  - UPDATE: sync both old and new inventory

---

## 7. Indexing Strategy

### High-Priority Indexes
- `tasks (user_id) WHERE deleted_at IS NULL AND status='active'` — for daily task list
- `task_notes (task_id DESC)` — for audit trail queries
- `garden_placements (garden_id)` — for rendering garden grid
- `inventory (user_id, is_placed)` — for available items filtering
- `user_private (email)` — already PK on user_id

### Low-Priority (Future)
- `friendships (requester_id, addressee_id)` — for friend search
- `marketplace_listings (seller_id, status)` — for seller's active listings
- `feed_events (user_id, created_at DESC)` — for social feed pagination

---

## 8. Security & RLS

### Row-Level Security (RLS)
- `users` → public profile, readable by all
- `user_private` → readable by owner only
- `user_wallets` → readable by owner only
- `tasks` → readable/writable by owner only
- `inventory` → readable/writable by owner only
- `gardens` → readable by all (for public garden view), writable by owner only
- `garden_placements` → readable by all (for public garden view), writable by owner only
- `garden_hearts` → readable by all, writable by authenticated users

### API Authentication
- All write operations require JWT token (Supabase Auth)
- Public garden views don't require auth (read-only)

---

## 9. Migration Status

### ✅ Migrated
- `000_utils.sql` — utility functions (fn_set_updated_at)
- `20260419132646_init_tasks.sql` — tasks table
- `20260419174325_init_task_notes.sql` — task_notes table
- `20260419174401_init_quotas.sql` — plan_quotas, task_daily_quotas, fn_enforce_task_quota
- `20260419191228_init_users.sql` — users, user_private, user_wallets, frames, user_frames
- `20260420044947_init_items_and_inventory.sql` — items, inventory
- `20260420113443_init_gardens_and_placements.sql` — gardens, garden_placements

### ⏳ Planned
- `add_penalty_mode_to_user_private.sql` — penalty_mode column
- `init_friendships.sql`
- `init_marketplace.sql`
- `init_economy_transactions.sql`
- `init_reward_rolls.sql`
- `init_daily_recaps.sql`
- `init_feed_events.sql`
