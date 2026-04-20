# SPEC.md — FocusFlow v2

> Task-based Productivity App with Garden Gamification & Social Layer  
> Solo-buildable · React + Go + Redis + Supabase + Prometheus + Grafana + Elasticsearch

---

## 1. Vision & Problem Statement

**Vấn đề:** To-do app quá khô khan, không tạo được động lực dài hạn. Người dùng bắt đầu hăng hái rồi bỏ sau 2 tuần vì không có gì "kéo họ lại". Gamification hời hợt (chỉ badge, streak) không đủ để tạo habit thực sự.

**Giải pháp:** FocusFlow biến mỗi task hoàn thành thành một viên gạch xây khu vườn ảo. Vườn hoa trực quan hóa toàn bộ công sức của bạn — đẹp khi chăm chỉ, héo úa khi lười biếng. Kết hợp với mạng xã hội vườn hoa, người dùng có thêm động lực từ cộng đồng.

**Target User:** Individual users (B2C thuần) — freelancer, student, remote worker, người muốn xây dựng thói quen làm việc tốt hơn. Không còn multi-tenant/team.

**Tagline:** _"Your productivity, in full bloom."_

---

## 2. Core Concepts

### 2.1 Task-Based (không phải Project-Based)
FocusFlow là công cụ **hành động**, không phải quản lý dự án. Mỗi đơn vị là một **Task** — có checklist, có thời lượng, có kết quả rõ ràng. Phân tích project, roadmap, dependency → dùng tool khác. FocusFlow chỉ trả lời: _"Tôi cần làm gì, và tôi sẽ làm nó trong bao lâu?"_

### 2.2 Garden as Progress Visualization
Vườn hoa là bản đồ nỗ lực của người dùng. Mỗi hoa, cổng, đường đi trong vườn là kết quả của công việc thực sự. Vườn không thể mua hoàn toàn bằng tiền — phần lớn phải earn qua task.

### 2.3 Reward/Penalty System (optional penalty)
- **Thưởng:** Hoàn thành task → nhận hoa (random) + bạc.
- **Phạt (optional, user chọn bật/tắt):** Give up task → hoa trong vườn bị ảnh hưởng.
- Penalty mode được chọn lúc onboarding và có thể thay đổi trong Settings. Khi tắt, give up task chỉ mất lượt task trong ngày, không ảnh hưởng vườn.

---

## 3. Task System

### 3.1 Tạo Task

User fill form trước khi bắt đầu:

| Field | Mô tả |
|---|---|
| **Tiêu đề** | Tên task |
| **Todo List** | Danh sách checkbox, hỗ trợ indent (checkbox con). Tối thiểu 1 item |
| **Thời lượng** | Chọn trước: 15 / 25 / 45 / 60 / 90 / 120 phút (hoặc custom) |

Sau khi fill xong → bấm **"Start Task"** → vào màn hình Focus. Ghi chú được thêm vào trong Focus screen (append-only audit trail).

### 3.2 Màn Hình Focus (Minimalist)

Màn hình cực tối giản, không có gì gây distraction:

```
┌─────────────────────────────────────┐
│  [Tên task]                          │
│                                      │
│         ⏱  0:00 → 45:00             │  ← Đồng hồ đếm tiến từ 0, có thanh progress
│                                      │
│  [ ] Todo item 1                     │
│  [ ] Todo item 2                     │
│      [ ] Sub-item 2.1  (indent)      │
│  [ ] Todo item 3                     │
│  [+ Add todo]  [🗑 xóa todo đang chọn]│  ← Thêm/xóa todo (min 1 item)
│                                      │
│  � Notes:                           │  ← Append-only audit trail (scrollable)
│  ┌──────────────────────────────────┐│
│  │ 14:32 Bắt đầu research logic...  ││
│  │ 15:15 Phát hiện race condition   ││
│  │ [+ Add note]                     ││
│  └──────────────────────────────────┘│
│                                      │
│  [⏸ Pause]  [⏩ +15 min]            │
│                                      │
│  [✅ Submit]  [🏳 Give Up]  [⏺ Pause Task] │
└─────────────────────────────────────┘
```

**Chi tiết các nút:**

- **Pause / Resume:** Dừng đồng hồ, vẫn ở màn hình focus.
- **+15 min (Extend):** Thêm 15 phút vào thời lượng còn lại. Không giới hạn số lần extend.
- **Pause Task:** Dừng task, lưu trạng thái (đồng hồ pausing, todo state, notes audit trail). User thoát về màn hình chính. Task xuất hiện trong list với badge "Paused — tiếp tục?". Có thể resume bất cứ lúc nào.
- **Submit Task:** Kiểm tra tất cả todo đã check. Nếu còn todo chưa check → hiện modal cảnh báo danh sách chưa xong, không cho submit. Khi tất cả checked → submit thành công → trigger reward flow.
- **Give Up:** Confirm dialog "Bạn chắc chắn muốn bỏ task này?" → Xác nhận → task về trạng thái `given_up` → trigger penalty flow (nếu penalty mode ON).

### 3.3 Task States

```
active (created & waiting to start) → paused → active (resume)
                                           └→ submitted (✅ completed)
                                           └→ given_up  (🏳 penalty)
```

**Note:** Task không có `draft` state. Khi tạo task form → task được lưu vào DB ngay với status `active` (nhưng `started_at = NULL`, tức đồng hồ chưa chạy). Khi user bấm "Start Task" → `started_at` được set = NOW().

### 3.4 Daily Task Limits (by Plan)

| Plan | Task/ngày |
|---|---|
| Free | 3 |
| Pro ($4/tháng) | 10 |
| Premium ($9/tháng) | 16 |

> "Task" tính là task được **Start** (chuyển sang `active`). Pause rồi resume không tốn thêm slot. Task `given_up` vẫn tốn slot — đây là một phần của cơ chế phạt nhẹ dù penalty mode OFF.

### 3.5 Timer System

**Schema Design:** Dùng `started_at` làm mốc "đang chạy" và `actual_duration_sec` là tổng thời gian đã lưu (append-only).

| Field | Type | Mô tả |
|---|---|---|
| `registered_duration_min` | INT | Thời gian ban đầu (15/25/45/60/90/120 min hoặc custom). Có thể tăng qua Extend. |
| `actual_duration_sec` | INT | Tổng thời gian đã lưu (không bao gồm delta đang chạy). Chỉ tăng khi pause task hoặc submit. |
| `started_at` | TIMESTAMPTZ | Mốc khi bắt đầu hoặc resume. NULL = đang dừng. |

**Thời gian thực tế:** `actual_duration_sec + (NOW() - started_at)` khi `started_at` không NULL.

**Event Rules:**

| Sự kiện | started_at | actual_duration_sec | Ghi chú |
|---|---|---|---|
| **Start** | = NOW() | không đổi | Task chuyển active, bắt đầu đếm |
| **Pause Timer** | = NULL | += delta (NOW() - started_at) | Tạm dừng đồng hồ, nhưng task vẫn active |
| **Resume Timer** | = NOW() | không đổi | Tiếp tục từ lúc dừng |
| **Submit** | = NULL | += delta (nếu started_at còn) | Lưu lại thời gian cuối, task → submitted |
| **Given Up** | = NULL | không đổi | Không tính thời gian cuối, task → given_up |
| **Extend +N min** | không đổi | không đổi | Tăng `registered_duration_min += N` |

**Recovery (tab close / mất mạng):**
- Frontend query lại task: nếu `status = active` + `started_at` còn → tự tính `actual_duration_sec + (NOW() - started_at)` và đếm tiếp. Không cần DB update.

**Cap Limit:**
- Frontend tự dừng đồng hồ khi `actual_duration_sec + (NOW() - started_at) >= registered_duration_min * 60`.
- Hiện nút Extend, người dùng chọn extend thêm hoặc submit.
- Không heartbeat, không constraint DB.

**Validation:**
- Backend kiểm tra khi nhận `pause-timer`, `submit`, `give-up`: thời gian gửi lên có hợp lý không (tolerance ~10 giây).
- DB chỉ giữ `CHECK (actual_duration_sec >= 0)`.

---

## 4. Garden System

### 4.1 Garden Levels (20 Level)

Vườn được chia thành 20 level. Mỗi level là một grid canvas lớn hơn level trước. Level sau mở khóa khi **toàn bộ ô của level hiện tại đã được đặt item**.

**Grid Size lookup (được tính trong backend từ `garden_index`):**

| Level (garden_index) | Grid Size | Đặc điểm |
|---|---|---|
| 1 | 5×5 (25 ô) | Mảnh đất nhỏ, starter |
| 2 | 6×6 (36 ô) | Thêm hàng rào đơn giản |
| 3–5 | 7–9×7–9 | Thêm đường đi |
| 6–10 | 10–14×10–14 | Mở cổng, đài phun nước nhỏ |
| 11–15 | 15–20×15–20 | Vườn trung bình, nhiều loại hoa |
| 16–19 | 21–30×21–30 | Vườn lớn, vật trang trí đặc biệt |
| **20** | **Variable (base 25×25 + expansions)** | Mỗi lần mở rộng thêm 5×5 ô, giá bạc tăng dần |

**Level 20 expand pricing (tracked via `expansion_level`):**
```
Lần mở rộng thứ n: cost = 1,000 × (1.5^n) bạc
Lần 1: 1,500 bạc | Lần 2: 2,250 | Lần 3: 3,375 | ...

Grid size tại level 20: (25 + 5*expansion_level) × (25 + 5*expansion_level)
```

**Hoàn thành level:** Khi tất cả ô trong grid đã có item đặt vào (không được để trống) → `garden_index` tăng 1 → unlock level tiếp theo với animation.

> **Note:** DB không lưu `grid_width`/`grid_height` — chúng được derived từ `garden_index` và `expansion_level` trong backend để tối ưu dữ liệu.

### 4.2 Item Rarities

| Rarity | Màu | Drop từ task | Mua shop | Bị phạt |
|---|---|---|---|---|
| Common | Trắng/Xanh lá | ✓ | ✓ | Mất item |
| Uncommon | Xanh dương | ✓ | ✓ | Mất item |
| Rare | Tím | ✓ (thấp) | ✓ | Mất item |
| Epic | Cam | ✓ (rất thấp) | ✗ (không bán) | Mất item |
| **Legendary** | Vàng ✨ | ✓ (jackpot) | ✗ | **Chỉ héo, không mất** |

**Trạng thái item:**
- `healthy` → item đang hiển thị đẹp, tính đủ điểm vườn.
- `wilted` → item héo/hư (do penalty hoặc inactive 7 ngày), vẫn chiếm ô nhưng xỉn màu, **không tính vào garden value**. Dùng **nước tưới** để hồi phục.
- `gone` → item bị xóa khỏi vườn (chỉ xảy ra với Common→Epic khi penalty, hoặc user tự xóa).

> **Legendary bất tử:** Khi bị penalty, legendary chỉ chuyển sang `wilted`. Không bao giờ bị `gone`. Dùng 1 nước tưới để recover.

### 4.3 Reward Flow (Task Submitted)

```
Task submitted
    │
    ▼
Roll reward:
  - Bạc: random(10, 50) × difficulty_multiplier
  - Hoa drop: 70% Common, 20% Uncommon, 7% Rare, 2.5% Epic, 0.5% Legendary
    │
    ▼
Reward animation (confetti nếu Legendary 🎉)
    │
    ▼
User chọn: đặt item vào vườn ngay / lưu vào inventory
```

**Difficulty multiplier** dựa trên thời lượng task:
```
< 30 phút:  ×1.0
30–60 phút: ×1.5
60–90 phút: ×2.0
> 90 phút:  ×2.5
```

**Pity system:** Sau 200 task liên tiếp không có legendary drop → lần submit kế tiếp guaranteed legendary. Counter reset sau khi drop.

### 4.4 Penalty Flow (Give Up Task — Penalty Mode ON)

```
Give Up confirmed
    │
    ▼
Random chọn 1–3 item trong vườn (ưu tiên item rarity thấp nhất):
  - Common/Uncommon/Rare/Epic → item bị removed (gone)
  - Legendary → item bị wilted
    │
    ▼
Animation: hoa héo/biến mất với hiệu ứng
    │
    ▼
Thông báo: "Bạn đã bỏ [Task name]. [Tên item] trong vườn đã [héo/mất]."
```

> Nếu vườn chưa có item nào → penalty không có effect.

### 4.5 Inactive Penalty (7 ngày không login)

Server-side cronjob chạy hàng ngày:
- Nếu user không login ≥ 7 ngày → random **héo 1/4 số item đang `healthy`** (làm tròn lên).
- Chỉ chuyển sang `wilted`, không xóa item.
- Legendary cũng bị ảnh hưởng (wilted, không gone).
- Khi user login lại → hiện notification "Bạn vắng mặt 7 ngày, [N] cây đã héo. Hãy tưới vườn!"

---

## 5. Economy System

### 5.1 Currencies

| Currency | Ký hiệu | Kiếm bằng | Dùng để |
|---|---|---|---|
| **Bạc** | 🪙 | Hoàn thành task, bán item shop | Mua item shop, mở rộng vườn lv20 |
| **Vàng** | 💛 | Nạp tiền thật (IAP) | Giao dịch Legendary P2P |

**Bạc không thể mua bằng tiền thật** — chỉ earn qua task. Đây là anti-pay-to-win.

**Đổi Vàng → Bạc:** 1 vàng = 10,000 bạc (một chiều, không đổi ngược).

### 5.2 Shop

**Bán (dùng bạc):**
- Hoa Common, Uncommon, Rare (không bán Epic, không bán Legendary).
- Cổng, hàng rào, đường đi.
- Đài phun nước (nhiều loại).
- Vật trang trí: ghế đá, đèn lồng, biển tên vườn, cầu nhỏ...
- **Avatar Frames** (cosmetic): Common → Epic, dùng để trang trí avatar profile. Query profile join frame → lấy asset URL.
- **Nước tưới:** hồi phục 1 item `wilted` → `healthy`. Giá 50 bạc/lọ.

**Thu mua lại (sell):**
- Common → Epic: bán lại với giá = 50% giá mua (bạc).
- Legendary: bán lại với giá **1 vàng** (không phải bạc — tạo nguồn cung vàng thứ cấp).

### 5.3 Legendary P2P Marketplace

- Chỉ giao dịch bằng **vàng**.
- Giá sàn tối thiểu: **5 vàng/legendary**.
- Giá do người bán tự đặt (≥ 5 vàng).
- App thu phí giao dịch: 10% (làm tròn lên, tối thiểu 1 vàng).
- Lịch sử giao dịch gần nhất được public → dùng để tính giá thị trường cho bảng xếp hạng.

**Nạp vàng (IAP via Stripe):**
```
5 vàng   = $0.99
12 vàng  = $1.99
30 vàng  = $4.99
70 vàng  = $9.99
150 vàng = $19.99
```

---

## 6. Leaderboard & Social

### 6.1 Bảng Xếp Hạng Vườn

Xếp hạng dựa trên **tổng giá trị vườn (tính bằng bạc)**:

```
Garden Value = Σ(item_shop_price × health_factor) + Σ(legendary × legendary_market_price)

Trong đó:
- health_factor: healthy = 1.0, wilted = 0 (không tính item héo)
- legendary_market_price = giá vàng giao dịch P2P gần nhất × 10,000 (quy đổi sang bạc)
  Nếu chưa có giao dịch P2P → dùng giá sàn 5 vàng = 50,000 bạc/legendary

Secondary sort: tổng số Legendary đang healthy
```

**Hiển thị:**
- Top 100 global.
- Top 20 trong friends list.
- Rank cá nhân của user (dù không vào top 100).

### 6.2 Xem Vườn Người Khác

- Mỗi vườn có public URL: `focusflow.app/garden/@username`
- Visitor xem vườn (read-only), không thể tương tác.
- Có thể **thả tim** (like) vườn — tổng tim hiển thị trên profile.
- Kết bạn: gửi friend request → cả 2 chấp nhận → thấy nhau trong friends leaderboard.

### 6.3 Social Feed

Feed đơn giản trong app, hiển thị khi bạn bè:
- Mở khóa level mới.
- Nhận legendary.
- Đạt top 10 global.
- Đạt streak milestone (7, 30, 100 ngày).

Không có comment, không có share — giữ đơn giản. Chỉ notification + react (tim).

---

## 7. User Flows

### Flow 1 — Onboarding

```
Đăng ký (email/Google)
    → Chọn username (public, dùng cho garden URL)
    → Chọn Penalty Mode: ON / OFF (giải thích rõ hệ quả)
    → Tutorial: tạo task đầu tiên (guided, 15 phút)
    → Hoàn thành tutorial task → nhận hoa đầu tiên
    → Đặt hoa vào vườn level 1
    → Done
```

### Flow 2 — Daily Task

```
Mở app → Dashboard (task list hôm nay + còn [N] slot)
    → [+ New Task] → Fill form (title, todos, duration)
    → [Start Task] → Màn hình Focus
    → Làm việc, check todos
    → [Submit] → Reward animation → Nhận hoa + bạc
    → Đặt vào vườn hoặc lưu inventory
```

### Flow 3 — Garden Management

```
Vào Garden View
    → Thấy vườn hiện tại (grid) + progress bar "X/Y ô đã đặt"
    → Click ô trống → mở inventory → chọn item → đặt vào
    → Kéo thả item trong vườn (reposition)
    → Tưới item héo (nếu có)
    → Xem preview level tiếp theo
```

### Flow 4 — Social

```
Vào Friends → Tìm kiếm username → Gửi friend request
    → Xem leaderboard bạn bè
    → Click vào tên bạn → Xem vườn của họ (read-only)
    → Thả tim ❤️
```

### Flow 5 — Legendary Trade

```
Vào Marketplace
    → Tab "Sell": chọn legendary từ inventory → đặt giá (≥5 vàng) → list
    → Tab "Buy": duyệt listings → mua ngay
    → Giao dịch hoàn tất → legendary chuyển tay, vàng thanh toán trừ phí 10%
```

---

## 8. Architecture

### 8.1 High-Level Architecture

```
[React Frontend]
       │
       ▼
[Go API Server]  ──── [Redis]         (task timer state, rate limit, reward cache)
       │
       ├──── [Supabase PostgreSQL]    (users, tasks, garden, inventory, social)
       ├──── [Supabase Auth]          (JWT, OAuth Google)
       ├──── [Supabase Realtime]      (friend activity feed, leaderboard live)
       │
       ├──── [Elasticsearch]          (task history search, recap search)
       │
       ├──── [Anthropic API]          (AI daily recap, task breakdown suggestions)
       │
       ├──── [Stripe]                 (IAP gold purchase, subscription plans)
       │
       └──── [Prometheus] ────────── [Grafana]   (ops metrics, business board)
```

### 8.2 Go API — Service Structure

```
/cmd
  /server
  /cronjob              ← inactive penalty (7 ngày), marketplace expiry
/internal
  /auth                 ← JWT middleware, Supabase Auth
  /task                 ← CRUD, state machine
  /session              ← timer state in Redis
  /reward               ← reward roll, penalty logic, pity counter
  /garden               ← grid layout, item placement, level unlock
  /inventory            ← user item storage
  /shop                 ← buy/sell, pricing
  /marketplace          ← P2P legendary listings, escrow
  /economy              ← currency transactions, audit log
  /social               ← friends, feed, garden visit, hearts
  /leaderboard          ← ranking computation
  /search               ← Elasticsearch integration
  /ai                   ← daily recap, task suggestion
  /metrics              ← Prometheus export
/pkg
  /cache                ← Redis client
  /db                   ← Supabase/Postgres client
  /realtime             ← Supabase Realtime publisher
  /rng                  ← seeded deterministic RNG
```

### 8.3 React Frontend — Structure

```
/src
  /pages
    /dashboard          ← task list hôm nay, quota counter, mini garden
    /focus              ← minimalist focus screen
    /garden             ← vườn hoa grid canvas, inventory panel
    /shop               ← mua bán item
    /marketplace        ← legendary P2P
    /leaderboard        ← global + friends tabs
    /profile            ← stats, public garden link, hearts
    /social             ← friends list, activity feed
    /search             ← task history search
    /settings           ← penalty mode, plan, account
  /components
    /TaskForm           ← todo list builder với indent
    /FocusTimer         ← đồng hồ, progress ring, controls
    /GardenCanvas       ← Canvas-based grid renderer
    /GardenItem         ← sprite rendering (healthy/wilted states)
    /RewardModal        ← drop animation, confetti for legendary
    /PenaltyModal       ← give up consequence animation
    /InventoryPanel     ← sidebar items
    /MarketplaceListing
  /hooks
    useTaskSession      ← timer state machine
    useGarden           ← grid state, placement logic
    useRealtime         ← Supabase realtime subscription
    useReward
  /store                ← Zustand global state
```

### 8.4 Data Models (Supabase / PostgreSQL)

**Migrated (✓):**

```sql
-- Users (public profile info)
users (
  id uuid PK,
  display_name varchar(255),
  bio varchar(255),
  avatar_url text,
  active_frame_id uuid FK,       -- references frames
  created_at timestamptz,
  updated_at timestamptz
)

-- User Private (email, plan - not exposed in public queries)
user_private (
  user_id uuid PK,
  email varchar(255) UNIQUE,
  plan_type varchar,             -- free|pro|premium (refs plan_quotas)
  updated_at timestamptz
)

-- User Wallets (currency balances)
user_wallets (
  user_id uuid PK,
  silver_balance bigint DEFAULT 0 CHECK (silver_balance >= 0),
  gold_balance int DEFAULT 0 CHECK (gold_balance >= 0),
  updated_at timestamptz
)

-- Plan Quotas (lookup table for daily task limits)
plan_quotas (
  plan_type varchar PK,
  daily_task_limit int
  -- Data: free=3, pro=10, premium=16
)

-- Tasks
tasks (
  id uuid PK,
  user_id uuid FK,
  title text,
  todos jsonb,                   -- array of checkbox items
  penalty_mode boolean DEFAULT false,  -- per-task penalty setting
  status varchar,                -- active|paused|submitted|given_up
  registered_duration_min int,
  actual_duration_sec int DEFAULT 0,
  started_at timestamptz,        -- NULL = stopped. Updated on start/resume.
  created_at timestamptz,
  updated_at timestamptz,
  completed_at timestamptz,      -- when task submitted
  deleted_at timestamptz,
  
  CONSTRAINT task_duration_positive CHECK (registered_duration_min > 0),
  CONSTRAINT task_elapsed_positive CHECK (actual_duration_sec >= 0),
  CONSTRAINT task_must_have_todos CHECK (jsonb_array_length(todos) > 0)
)
-- Index: idx_tasks_user_active (user_id) WHERE deleted_at IS NULL AND status='active'

-- Task Notes (1-n audit trail) — Append-only
task_notes (
  id uuid PK,
  task_id uuid FK,
  user_id uuid FK,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  CONSTRAINT task_note_must_have_content CHECK (char_length(trim(content)) > 0)
)
-- Index: idx_task_notes_task_id (task_id DESC)

-- Task Daily Quota (auto-incremented via trigger)
task_daily_quotas (
  user_id uuid FK,
  target_date date,
  usage_count int DEFAULT 0 CHECK (usage_count >= 0),
  PRIMARY KEY (user_id, target_date)
)

-- Items (master catalog)
items (
  id uuid PK,
  name varchar(255),
  type varchar,                  -- flower|structure|decoration|path
  rarity varchar,                -- common|uncommon|rare|epic|legendary
  asset_key varchar(255),        -- sprite/asset reference
  height int DEFAULT 1,          -- grid cell height
  width int DEFAULT 1,           -- grid cell width
  base_price_silver int DEFAULT 0,
  is_purchasable boolean DEFAULT true,
  can_wilt boolean DEFAULT false,
  created_at timestamptz
)

-- User Inventory
inventory (
  id uuid PK,
  user_id uuid FK,
  item_id uuid FK,
  is_placed boolean DEFAULT false,  -- optimization: filter available items
  acquired_at timestamptz DEFAULT now()
)

-- Avatar Frames (master catalog)
frames (
  id uuid PK,
  name varchar(255),
  asset_url text,                -- CSS border / SVG asset
  created_at timestamptz
)

-- Gardens
gardens (
  id uuid PK,
  user_id uuid FK,
  garden_index int,              -- garden level (1-20)
  expansion_level int DEFAULT 0, -- expand count at level 20
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE(user_id, garden_index)
)

-- Garden Placements
garden_placements (
  id uuid PK,
  garden_id uuid FK,
  inventory_id uuid FK UNIQUE,   -- global unique: each item placed once
  grid_x int,
  grid_y int,
  rotation smallint DEFAULT 0,   -- 0|90|180|270
  health_status varchar DEFAULT 'healthy',  -- healthy|wilted
  placed_at timestamptz,
  updated_at timestamptz,
  
  UNIQUE(garden_id, grid_x, grid_y),  -- no overlapping placements
  CHECK (rotation IN (0, 90, 180, 270))
)
```

**TODO (Migration pending):**

```sql
-- User-owned Frames (ownership tracking for avatar cosmetics)
user_frames (
  id uuid PK,
  user_id uuid FK,
  frame_id uuid FK,
  acquired_at timestamptz,
  UNIQUE(user_id, frame_id)
)

-- Friendships
friendships (
  id uuid PK,
  requester_id uuid FK,
  addressee_id uuid FK,
  status varchar,                -- pending|accepted
  created_at timestamptz,
  UNIQUE(requester_id, addressee_id)
)

-- Social Feed Events
feed_events (
  id uuid PK,
  user_id uuid FK,
  event_type varchar,            -- level_up|legendary_drop|top10|streak_milestone
  payload jsonb,
  created_at timestamptz
)

-- Marketplace (Legendary P2P)
marketplace_listings (
  id uuid PK,
  seller_id uuid FK,
  inventory_id uuid FK,
  price_gold int,                -- >= 5
  status varchar,                -- active|sold|cancelled
  listed_at timestamptz,
  sold_at timestamptz
)

-- Economy Transactions (audit log)
economy_transactions (
  id uuid PK,
  user_id uuid FK,
  type varchar,                  -- earn_silver|spend_silver|earn_gold|spend_gold|iap
  amount bigint,
  reference_id uuid,
  note text,
  created_at timestamptz
)

-- Reward Rolls (audit trail for seeded RNG)
reward_rolls (
  id uuid PK,
  task_id uuid FK,
  user_id uuid FK,
  seed text,
  rarity_result varchar,
  item_id uuid FK,
  created_at timestamptz
)

-- Daily Recaps
daily_recaps (
  id uuid PK,
  user_id uuid FK,
  date date,
  content text,
  created_at timestamptz
)
```

**Schema Changes from Original SPEC:**
- Users normalized: `users` (public) + `user_private` (email, plan) + `user_wallets` (currency).
- Task status: no `draft` state — created task goes directly to `active`.
- Task: `completed_at` instead of `submitted_at`.
- Garden: `garden_index` (1-20) + `expansion_level` replaces `current_level` + `grid_width/height`.
- Items: `type` values limited to `(flower, structure, decoration, path)` — structures encompass gates, fences, etc.
- Garden placements: `inventory_id` UNIQUE globally → each item placed only once system-wide.
- Garden placements: added `rotation` field (0/90/180/270).
- `pity_counter`, `username`, `last_login_at`, `total_hearts` not yet in DB (Redis/computed).
- Bảng friendships, feed_events, marketplace_listings, economy_transactions, reward_rolls, daily_recaps chưa migrate.

### 8.5 Redis Usage

| Key Pattern | TTL | Dùng để |
|---|---|---|
| `task:{task_id}:timer` | 4h | `{elapsed_sec, started_at, paused}` — source of truth |
| `user:{user_id}:quota:{date}` | 25h | Task quota counter |
| `user:{user_id}:ratelimit` | 1min | API rate limit |
| `ai:recap:{user_id}:{date}` | 24h | Cache AI recap |
| `leaderboard:global` | 5min | Top 100 cache |
| `search:suggest:{prefix}` | 10min | Search autocomplete |
| `marketplace:price:{item_id}` | 1h | Giá legendary giao dịch gần nhất |

### 8.6 Elasticsearch Indexes

```json
Index: "tasks"
{
  "title":        { "type": "text", "analyzer": "standard" },
  "status":       { "type": "keyword" },
  "user_id":      { "type": "keyword" },
  "submitted_at": { "type": "date" }
}

Index: "daily_recaps"
{
  "content":  { "type": "text" },
  "date":     { "type": "date" },
  "user_id":  { "type": "keyword" }
}
```

### 8.7 Prometheus Metrics

| Metric | Type | Mô tả |
|---|---|---|
| `ff_tasks_submitted_total` | Counter | Task hoàn thành |
| `ff_tasks_givenup_total` | Counter | Task give up |
| `ff_legendary_drops_total` | Counter | Legendary được drop |
| `ff_pity_triggers_total` | Counter | Pity system kích hoạt |
| `ff_marketplace_volume_gold` | Counter | Tổng vàng P2P |
| `ff_iap_revenue_usd` | Counter | Doanh thu IAP |
| `ff_active_users` | Gauge | Users online hiện tại |
| `ff_api_duration_seconds` | Histogram | API latency |

Grafana: **Ops board** (latency, error rate, Redis hit rate) + **Business board** (DAU, submit rate, IAP revenue, legendary economy).

---

## 9. Reward & RNG Design

### 9.1 Drop Rate Table

| Rarity | Base Rate | Bonus (task > 60 min) |
|---|---|---|
| Common | 70% | 65% |
| Uncommon | 20% | 22% |
| Rare | 7% | 9.5% |
| Epic | 2.5% | 3% |
| Legendary | **0.5%** | **0.5%** |

> Legendary rate cố định dù task dài bao nhiêu. Giữ độ hiếm và giá trị.

### 9.2 Seeded RNG

Mỗi reward roll: server tạo seed từ `task_id + user_id + timestamp` → roll rarity → roll item trong pool → lưu vào `reward_rolls` table. Deterministic và auditable. Client không thể can thiệp.

### 9.3 Pity System

```
pity_counter tăng 1 mỗi khi submit task (kể cả có drop rarity khác)
pity_counter reset về 0 khi drop legendary

Nếu pity_counter >= 200 → lần submit kế tiếp guaranteed legendary
(roll item legendary như bình thường, chỉ rarity được fix = legendary)
```

---

## 10. API Endpoints

### Auth
```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/me              { display_name, penalty_mode }
```

### Tasks
```
GET    /api/tasks                ?status=&date=
POST   /api/tasks                { title, todos[], estimated_minutes }
GET    /api/tasks/:id
GET    /api/tasks/:id/notes      ← Fetch all notes (ordered by created_at DESC)
POST   /api/tasks/:id/notes      { content }  ← Add a note (append-only)
PATCH  /api/tasks/:id/todos      { todos[] }
POST   /api/tasks/:id/start
POST   /api/tasks/:id/pause-timer
POST   /api/tasks/:id/resume-timer
POST   /api/tasks/:id/extend     { add_minutes }
POST   /api/tasks/:id/pause-task
POST   /api/tasks/:id/submit
POST   /api/tasks/:id/give-up
GET    /api/tasks/quota/today    → { used, limit }
```

### Garden
```
GET    /api/garden               ← vườn user hiện tại
GET    /api/garden/@:username    ← public view
POST   /api/garden/place         { inventory_id, grid_x, grid_y }
DELETE /api/garden/place/:id
PATCH  /api/garden/place/:id     { grid_x, grid_y }
POST   /api/garden/water/:id     ← dùng nước tưới (tốn 1 lọ)
POST   /api/garden/expand        ← level 20, tốn bạc theo công thức
```

### Inventory
```
GET    /api/inventory
GET    /api/inventory/unplaced
```

### Shop
```
GET    /api/shop/items           ?type=&rarity=
POST   /api/shop/buy             { item_id, quantity }
POST   /api/shop/sell            { inventory_id }
```

### Marketplace
```
GET    /api/marketplace          ?min_price=&max_price=
POST   /api/marketplace/list     { inventory_id, price_gold }
DELETE /api/marketplace/:id
POST   /api/marketplace/:id/buy
GET    /api/marketplace/history/:item_id
```

### Economy
```
GET    /api/economy/balance      → { silver, gold }
POST   /api/economy/iap          { stripe_payment_intent_id }
GET    /api/economy/transactions ?type=&from=&to=
```

### Social
```
GET    /api/friends
POST   /api/friends/request      { username }
POST   /api/friends/:id/accept
DELETE /api/friends/:id
GET    /api/feed
POST   /api/garden/@:username/heart
GET    /api/leaderboard/global   ?page=
GET    /api/leaderboard/friends
```

### Search & AI
```
GET    /api/search?q=&type=tasks|recaps&from=&to=
GET    /api/search/suggest?prefix=
GET    /api/ai/recap/:date
POST   /api/ai/recap/:date/regenerate
POST   /api/ai/suggest-todos     { task_title } → todos[]
```

---

## 11. Frontend UI/UX

### Design Principles
- **Focus screen = zero distraction:** Không nav, không notification khi đang trong task.
- **Garden = joy & calm:** Màu pastel, animation mượt, satisfying khi đặt hoa vào ô.
- **Economy = transparent:** Balance bạc/vàng luôn visible. Không dark pattern.
- **Penalty = consequential but fair:** Animation penalty phải đủ "ouch" để tạo động lực, không quá brutal.
- **Mobile-first:** Task flow và focus screen tối ưu mobile. Garden view tốt nhất trên tablet/desktop.

### Key Screens

**1. Dashboard (Home)**
- Header: `🪙 1,234` | `💛 5` | `Slots: 2/3`
- Task list hôm nay: active, paused (badge "Paused"), submitted (strikethrough), given_up.
- Nút lớn `+ New Task`.
- Mini garden thumbnail với % level progress.
- Friends activity strip (horizontal scroll, 3–5 events gần nhất).

**2. Focus Screen**
- Full-screen, background tối nhẹ (không phải đen tuyệt đối).
- Tên task — font 24px, trên cùng.
- Đồng hồ: `0:00 / 45:00` dạng text lớn + progress ring bao quanh.
- Todo list: checkbox + indent. Tap để check.
- `+ Add` / xóa todo (icon thùng rác khi swipe hoặc long press).
- Notes textarea — collapse mặc định, expand khi tap.
- Bottom action bar: `⏸` `+15` | `✅ Submit` `🏳 Give Up` `⏺ Pause Task`.

**3. Garden View**
- Canvas-based grid. Zoom in/out (pinch hoặc scroll).
- Ô trống: border dashed, click → mở inventory overlay.
- Item placed: sprite, tooltip khi hover (tên, rarity, health).
- Wilted items: desaturated + icon tưới overlay.
- Sidebar: inventory items unplaced, grouped by rarity.
- Top bar: `Vườn của [username]` | Level badge | `⭐ [N] hearts`.
- Progress: `X/Y ô đã đặt` progress bar → khi đầy: level complete animation.

**4. Shop**
- Filter tabs: All / Flowers / Structures / Decorations / Water.
- Item card: sprite preview, tên, rarity badge màu sắc, giá bạc.
- Tab "Sell": danh sách inventory với giá buyback, confirm trước khi bán.

**5. Marketplace**
- List legendary listings: item sprite, tên, seller username, giá vàng.
- Mini price chart: 10 giao dịch gần nhất (sparkline).
- Confirm dialog khi mua: "Bạn sẽ trả X vàng. Phí sàn Y vàng. Tổng: Z vàng."

**6. Leaderboard**
- Tab Global / Friends.
- Row: Rank | Avatar + Username | Garden Level | Garden Value 🪙 | Legendary count ✨.
- Row của user hiện tại được highlight dù bất kỳ rank.

**7. Public Garden (`/@username`)**
- Read-only canvas vườn.
- Header: avatar, username, level, hearts.
- Nút `❤️ Thả tim` (nếu chưa like hôm nay) + `👤 Add Friend`.

---

## 12. Business Model

### Subscription Plans

| Feature | Free | Grower ($4/tháng) | Master ($9/tháng) |
|---|---|---|---|
| Task/ngày | 3 | 10 | 16 |
| AI daily recap | ✗ | ✓ | ✓ |
| AI todo suggestions | ✗ | ✓ | ✓ |
| Task search history | 7 ngày | 3 tháng | Unlimited |
| Penalty mode | ✓ optional | ✓ optional | ✓ optional |
| Garden / Social | Full | Full | Full |
| Grafana personal stats | ✗ | Basic (7 ngày) | Full (90 ngày) |

### IAP Gold — xem mục 5.3

### Revenue Streams
1. **Subscription:** Grower + Master.
2. **IAP Gold:** Người muốn giao dịch Legendary.
3. **Marketplace Fee:** 10% mỗi giao dịch P2P (thu bằng vàng).

### Unit Economics (giả định 12 tháng)
- 5,000 users, 8% Grower ($1,600/tháng), 4% Master ($1,800/tháng).
- IAP: 3% user mua gold avg $5 → $750/tháng.
- Marketplace fee: growing over time.
- Total MRR target: ~$4,000–5,000 sau 12 tháng. Đủ profitable cho solo dev.

---

## 13. Non-Functional Requirements

### Performance
- API p95 < 200ms (Go + Redis).
- Garden canvas render 60fps (Canvas API, không DOM per tile).
- Reward animation trigger < 100ms sau submit response.
- Elasticsearch search < 100ms.

### Security
- Supabase RLS: isolation hoàn toàn giữa users.
- Economy balance update qua stored procedures (atomic, chống race condition).
- Marketplace escrow: gold bị lock khi list → release khi sold/cancelled (không mất vàng).
- RNG server-side only, kết quả lưu audit trail.
- Timer state trên server (Redis) — chống client-side cheat thời gian.

### Reliability
- Cronjob inactive penalty: idempotent với `last_penalty_at` timestamp.
- Task timer recovery: nếu Redis miss → `elapsed = now - started_at - paused_duration` từ DB.
- Graceful degradation: AI down → skip recap, task submit vẫn hoạt động.
- Marketplace: escrow transaction rollback nếu DB write fail.

---

## 14. Development Roadmap (Solo, 1 Laptop)

### Phase 1 — Core Task Loop (6–8 tuần)
- [ ] Supabase schema v1: users, tasks, quota.
- [ ] Go API: auth, task CRUD, state machine, timer (Redis).
- [ ] React: Dashboard, Focus screen (timer + todos + notes).
- [ ] Task submit → basic reward (bạc + item log, không có animation).
- [ ] Give up → basic penalty log.
- [ ] Deploy: Fly.io (Go) + Vercel (React).

### Phase 2 — Garden System (5–6 tuần)
- [ ] DB schema: items catalog, inventory, gardens, garden_placements.
- [ ] Go API: garden CRUD, inventory, reward roll (seeded RNG + pity).
- [ ] React: Garden canvas renderer, Inventory panel, item placement.
- [ ] Reward animation (confetti cho legendary).
- [ ] Penalty animation (wilt/gone effect).
- [ ] Level completion flow → unlock animation.
- [ ] Level 20 expand mechanic.

### Phase 3 — Economy & Shop (3–4 tuần)
- [ ] DB: economy_transactions, shop config.
- [ ] Go API: shop buy/sell, silver/gold balance (stored procedures).
- [ ] React: Shop UI, balance header display.
- [ ] Stripe IAP: gold purchase, webhook verify.
- [ ] Marketplace P2P: listing, buy, escrow, fee.

### Phase 4 — Social & Leaderboard (3–4 tuần)
- [ ] DB: friendships, feed_events.
- [ ] Go API: friends CRUD, public garden, leaderboard compute, hearts.
- [ ] React: Leaderboard, public garden view, social feed.
- [ ] Supabase Realtime: live feed + leaderboard.
- [ ] Cronjob: inactive penalty (7 ngày), marketplace expiry.

### Phase 5 — AI, Search & Polish (3–4 tuần)
- [ ] Elasticsearch: index tasks + recaps, search API.
- [ ] Go AI: daily recap (Anthropic), todo suggestions.
- [ ] React: Search UI, AI recap page.
- [ ] Prometheus + Grafana: ops + business boards.
- [ ] Subscription gates (Free/Grower/Master) + Stripe billing.
- [ ] Onboarding flow đầy đủ.

---

## 15. Local Development Setup

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  elasticsearch:
    image: elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports: ["9200:9200"]

  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana
    ports: ["3001:3000"]
```

```env
# Go API
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PORT=8080

# React
VITE_API_URL=http://localhost:8080
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
```

---

## 16. Key Technical Decisions

| Quyết định | Lý do |
|---|---|
| Canvas cho garden grid | DOM-based grid với 400+ ô sẽ lag. Canvas render cả grid trong 1 element, 60fps dễ dàng. |
| Server-side timer (Redis) | Client không thể fake elapsed time. Chống gian lận reward. |
| Economy stored procedures | Atomic balance update, không race condition. |
| Seeded RNG server-side | Auditable, không thể manipulate từ client. |
| Bỏ Tenant → Social Garden | Đơn giản hóa architecture drastically. Viral loop tốt hơn qua social. |
| Silver chỉ earn qua task | Core anti-pay-to-win. Giữ integrity và meaning của vườn hoa. |
| Legendary chỉ P2P bằng vàng | Tạo player-driven economy, giá legendary do thị trường quyết định. |
| Phase 1 không có garden animation | Ship nhanh, validate core loop trước. Animation là polish, không phải MVP. |

---

## 17. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Canvas garden phức tạp khi bắt đầu | Phase 1 dùng CSS grid đơn giản, migrate Canvas ở Phase 2 |
| Economy exploit (double-spend) | Stored procedures + optimistic locking |
| Legendary quá hiếm → frustration | Pity system đảm bảo guaranteed drop sau 200 task |
| P2P marketplace abuse (wash trading) | Rate limit listings/ngày, fee 10% làm wash trading không có lợi |
| IAP fraud | Stripe webhook verify server-side, không trust client |
| Inactive penalty quá harsh → churn | Chỉ wilt (không xóa), nước tưới rẻ (50 bạc) → dễ recover |
| Social spam | Rate limit: 10 friend requests/ngày, 1 heart/user/vườn/ngày |
| Solo burnout | Phase 1 đã là shippable product. Phase 2+ là growth features. |

---

*SPEC version 2.0 — FocusFlow*  
*Stack: React · Go · Redis · Supabase · Prometheus · Grafana · Elasticsearch*  
*Model: B2C Solo Users · Task-based · Garden Gamification · P2P Economy · Social Layer*
