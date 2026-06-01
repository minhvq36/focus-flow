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
id                  uuid PK → auth.users(id) [CASCADE delete]
display_name        varchar(50) NOT NULL CHECK (char_length(trim(display_name)) >= 1)
bio                 varchar(255)
avatar_url          text
active_frame_id     uuid FK → frames(id) [SET NULL on delete]
level               int DEFAULT 1 CHECK (level > 0)  -- calculated from user_wallets.total_exp
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
updated_at          timestamptz
```

**Note:** Penalty mode is stored per-task (`penalty_mode` field in tasks table) sent by client during task creation. User-level default preference can be stored in frontend localStorage. Currently, each task has its own penalty_mode snapshot sent at creation time.

**Purpose:** Stores sensitive user data (email) and subscription plan. Never queried in public endpoints.

**Triggers:**
- `trg_update_user_private_modtime` — auto-update `updated_at`

#### `user_wallets` (currency & experience balances)
```sql
user_id             uuid PK → users(id) [CASCADE delete]
silver_balance      bigint DEFAULT 0 CHECK >= 0
gold_balance        int DEFAULT 0 CHECK >= 0
total_exp           int DEFAULT 0 CHECK >= 0  -- cumulative EXP, used to calculate user.level
updated_at          timestamptz
```

**Rules:**
- Silver earned only from task completion (cannot buy with real money)
- Gold earned from IAP only
- 1 gold = 10,000 silver (one-way conversion)
- total_exp increases per task submission, level calculated via LevelFromExp(total_exp)

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
todos               jsonb NOT NULL DEFAULT []  -- array of {id, text, done, children[]}
                                                   -- nested structure: max depth 5, max 50 total items
                                                   -- synced via PATCH /api/tasks/:id/todos (debounced)
penalty_mode        boolean DEFAULT false      -- snapshot of user.penalty_mode at creation
is_starred          boolean NOT NULL DEFAULT false  -- user can pin task to top of list
status              text DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'submitted', 'given_up'))
registered_duration_min  int NOT NULL CHECK (BETWEEN 25 AND 999)  -- create: max 480, can extend to 999
actual_duration_sec int DEFAULT 0 CHECK >= 0
started_at          timestamptz                -- NULL when paused/submitted/reset
created_at          timestamptz
updated_at          timestamptz
completed_at        timestamptz                -- set when submitted
deleted_at          timestamptz                -- soft delete, not restored in current phase
```

**Constraints:**
- `CHECK task_must_have_todos` — jsonb_array_length(todos) > 0

**Triggers:**
- `trg_update_tasks_modtime` — auto-update `updated_at`
- `trg_pre_insert_task_quota` — enforce daily task limit, increment `task_daily_quotas`

**Indexes:**
- `idx_tasks_user_active` — (user_id) WHERE deleted_at IS NULL AND status='active'

**Logic Notes:**
- Task created with status='active' and `started_at` = NOW() (timer auto-starts immediately)
- When paused, `actual_duration_sec` += (NOW() - started_at), then `started_at` = NULL
- When reset, `actual_duration_sec` = 0 and `started_at` = NOW() (timer restarts from 0)
- When submitted/given_up, finalize `actual_duration_sec` and set `completed_at`
- `penalty_mode` is a per-task snapshot sent by client during task creation (can differ from user's default preference)
- `is_starred` allows user to pin tasks to top of list in task list view
- `deleted_at` used for soft delete; restore feature not implemented in current phase
- **Todo Structure:**
  - Nested array format: `{id, text, done, children: [{id, text, done, children}, ...]}`
  - Max nesting depth: 5 levels
  - Max total todos per task: 50
  - All todos at a given level are unordered

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
content             text NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 12000)
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
- `grid_size`: base grid dimensions stored in DB (5×5 for level 1, increments per level, max 25×25 base for level 20)
- `is_expandable`: whether users can expand this garden (only true for level 20)
- `unlock_condition`: JSON conditions to unlock this garden level (e.g., `{"min_level": 5}` or null for always available)
- Grid size at level N is determined by garden_index; expansions applied via `user_gardens.expansion_level`

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
  - `wilted` — item lost luster (from inactive 7+ days), doesn't count toward value
- `wilted_at` tracks when item was wilted (only for inactive penalty, not from give-up)
- Give up task with penalty mode ON deletes placement (inventory moves back to 'in_bag')
- Inactive penalty (7+ days) wilts items (never deletes)

**Triggers:**
- `trg_after_garden_placement_change` — syncs `inventory.status` when placement inserted/deleted
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
                    CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'eternal'))
asset_key           varchar(255) NOT NULL
height              int DEFAULT 1 CHECK > 0
width               int DEFAULT 1 CHECK > 0
silver_price        int DEFAULT NULL CHECK > 0  -- shop buy price (silver)
gold_price          int DEFAULT NULL CHECK > 0  -- reserved for future use
buyback_silver      int DEFAULT NULL CHECK > 0  -- shop sell-back price (silver)
buyback_gold        int DEFAULT NULL CHECK > 0  -- reserved for future use
is_purchasable      boolean DEFAULT true
can_wilt            boolean DEFAULT false        -- only true for flowers/plants
unlock_condition    jsonb DEFAULT NULL
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
status              varchar(20) DEFAULT 'in_bag'  -- 'in_bag' | 'placed' | 'on_market'
acquired_at         timestamptz DEFAULT now()
```

**Logic:**
- `status` tracks item location:
  - `in_bag` — item in user's inventory (not placed in garden)
  - `placed` — item currently placed in a garden
  - `on_market` — item listed on marketplace (Legendary P2P only)
- User can have multiple copies of same item
- Synced automatically via trigger when `garden_placements` changed

---

### 1.6 Avatar Cosmetics

#### `frames` (master catalog)
```sql
id                  uuid PK
name                varchar(255) NOT NULL
asset_url           text NOT NULL              -- CSS border or SVG
silver_price        int DEFAULT NULL CHECK > 0
gold_price          int DEFAULT NULL CHECK > 0
is_purchasable      boolean DEFAULT true
unlock_condition    jsonb DEFAULT NULL
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

### ✅ Completed Migrations
- `001_utils.sql` — utility functions (fn_set_updated_at)
- `002_init_cores.sql` — items, frames, gardens, plan_quotas lookup tables
- `003_init_users.sql` — users, user_private, user_wallets tables with triggers
- `004_init_tasks.sql` — tasks table with state machine and protection triggers
- `005_init_quotas.sql` — task_daily_quotas table and quota enforcement trigger
- `006_init_task_notes.sql` — task_notes table (append-only audit trail)
- `007_init_inventory.sql` — inventory table with item tracking
- `008_init_gardens_and_placements.sql` — user_gardens and garden_placements tables
- `009_init_reward_rolls.sql` — reward_rolls table for drop history and pity counter tracking
- `999_rls.sql` — Row-Level Security policies (status: **not verified** — needs testing)

### ⏳ Seed Data (Not Yet Implemented)
- Items catalog (flowers, structures, decorations)
- Frame cosmetics
- 20 garden level templates
- Placeholder user accounts for testing
