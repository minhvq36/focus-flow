# SPEC-DB.md — FocusFlow Database Schema

> Schema PostgreSQL/Supabase, constraint, trigger và RLS.
>
> **Nguồn chân lý:** `infra/supabase/migrations/`. Tài liệu này mô tả đúng những gì
> migration đã tạo. Mục nào chưa có migration đều được đánh dấu **PLANNED**.

---

## 0. Trạng thái migration

| File | Nội dung | Trạng thái |
|---|---|---|
| `001_utils.sql` | `fn_set_updated_at()` | ✅ |
| `002_init_cores.sql` | `plan_quotas`, `frames`, `items`, `gardens` + storage buckets + seed | ✅ |
| `003_init_users.sql` | `users`, `user_frames`, `user_private`, `user_wallets` + trigger tạo user | ✅ |
| `004_init_tasks.sql` | `tasks` + sanitize/protect trigger | ✅ |
| `005_init_quotas.sql` | `task_daily_quotas` + trigger quota | ✅ |
| `006_init_task_notes.sql` | `task_notes` + trigger giới hạn 5 note/task | ✅ |
| `007_init_inventory.sql` | `inventory` | ✅ |
| `008_init_gardens_and_placements.sql` | `user_gardens`, `garden_placements` | ✅ |
| `009_init_reward_rolls.sql` | `reward_rolls` | ✅ |
| `010_economy_transactions.sql` | `economy_transactions` | ✅ |
| `011_keepalive_cron.sql` | `system_heartbeat` + pg_cron keep-alive | ✅ |
| `012_backfill_starter_garden.sql` | `fn_grant_starter_garden()` + trigger trên `public.users` + backfill | ✅ |
| `999_rls.sql` | RLS policy + storage policy (luôn là file cuối) | ✅ |

**Chưa có migration (PLANNED):** `marketplace_listings`, `friendships`, `feed_events`,
`garden_hearts`, `daily_recaps`.

**Seed data:** `plan_quotas` và `gardens` đã seed trong `002`. **`items` và `frames`
CHƯA có seed** — không có item nào thì reward roll sẽ fallback hết bậc và trả về
task không có vật phẩm; shop cũng rỗng.

---

## 1. Bảng lõi (lookup / catalog)

### `plan_quotas`
```sql
plan_type           text PK
daily_task_limit    int NOT NULL
details             jsonb DEFAULT NULL
```
Seed: `free → 3`, `pro → 10`, `premium → 16` (task/ngày).

### `items` (catalog vật phẩm, dữ liệu hệ thống)
```sql
id                  uuid PK
name                varchar(255) NOT NULL
type                varchar(50) NOT NULL CHECK IN ('flower','structure','decoration','path')
rarity              varchar(50) NOT NULL CHECK IN ('common','uncommon','rare','epic','legendary','eternal')
asset_key           varchar(255) NOT NULL UNIQUE
height              int DEFAULT 1 CHECK > 0
width               int DEFAULT 1 CHECK > 0
silver_price        int DEFAULT NULL CHECK > 0
is_purchasable      boolean DEFAULT true
can_wilt            boolean DEFAULT false
unlock_condition    jsonb DEFAULT NULL
details             jsonb DEFAULT NULL
created_at          timestamptz DEFAULT now()
```
**Index:** `items_asset_key_idx` (unique), `idx_items_shop` — `(type) WHERE is_purchasable = true AND silver_price IS NOT NULL`.

**Quy tắc:** `silver_price IS NULL` → không bán trong shop (chỉ rơi từ reward).
Giá mua lại do backend tính, KHÔNG lưu trong DB (xem `SPEC.md` §Economy).

### `frames` (khung avatar — catalog)
```sql
id                  uuid PK
name                varchar(255) NOT NULL
asset_url           text NOT NULL
silver_price        int DEFAULT NULL
gold_price          int DEFAULT NULL
is_purchasable      boolean DEFAULT true
unlock_condition    jsonb DEFAULT NULL
details             jsonb DEFAULT NULL
created_at          timestamptz DEFAULT now()
```
> Bảng đã tồn tại nhưng **backend chưa có endpoint nào** cho frames (PLANNED).

### `gardens` (template khu vườn — catalog)
```sql
id                  uuid PK
garden_index        int NOT NULL
grid_size           int NOT NULL DEFAULT 5 CHECK > 0   -- luôn vuông, đây là BASE size
is_expandable       boolean NOT NULL DEFAULT false
unlock_condition    jsonb DEFAULT NULL
details             jsonb DEFAULT NULL
created_at          timestamptz DEFAULT now()
```

**Seed hiện tại — 7 khu vườn (KHÔNG phải 20):**

| garden_index | id | grid_size | is_expandable |
|---|---|---|---|
| 1 | `...0001` | 5 | false |
| 2 | `...0002` | 7 | false |
| 3 | `...0003` | 9 | false |
| 4 | `...0004` | 11 | false |
| 5 | `...0005` | 15 | false |
| 6 | `...0006` | 20 | false |
| 7 | `...0007` | 25 | **true** |

Chỉ khu vườn cuối (index 7) mới mở rộng được. Kích thước thực tế =
`grid_size + expansion_level × 5` (hằng số `expansionStep = 5`,
`maxExpansionLevel = 5` trong `internal/garden/models.go`).

### Storage buckets (tạo trong `002`)
- `assets` — public, admin upload tay (sprite vườn, item).
- `users` — public, `file_size_limit = 5MB`, chỉ nhận `image/webp|jpeg|png`.

---

## 2. Người dùng

### `users` (hồ sơ công khai)
```sql
id                  uuid PK → auth.users(id) [CASCADE]
display_name        varchar(50) NOT NULL CHECK (char_length(trim(display_name)) >= 1)
bio                 varchar(255)
avatar_url          text
active_frame_id     uuid FK → frames(id) [SET NULL]
level               int NOT NULL DEFAULT 1 CHECK > 0
created_at          timestamptz NOT NULL DEFAULT now()
updated_at          timestamptz NOT NULL DEFAULT now()
```
**Index:** `idx_users_active_frame_id`.
**Trigger:** `trg_update_users_modtime`.

### `user_private` (dữ liệu riêng tư)
```sql
user_id             uuid PK → users(id) [CASCADE]
email               varchar(255) UNIQUE NOT NULL
plan_type           text NOT NULL DEFAULT 'free' → plan_quotas(plan_type)
name_change_count   int NOT NULL DEFAULT 0 CHECK >= 0
updated_at          timestamptz NOT NULL DEFAULT now()
```
**Index:** `idx_user_private_plan_type`.
**Trigger:** `trg_update_user_private_modtime`.

`name_change_count` là cơ sở tính phí đổi tên (2 lần đầu miễn phí — xem `SPEC.md`).

> `penalty_mode` **KHÔNG** nằm ở đây. Nó là snapshot theo từng task
> (`tasks.penalty_mode`), client gửi lên lúc tạo task.

### `user_wallets` (ví + EXP)
```sql
user_id             uuid PK → users(id) [CASCADE]
silver_balance      bigint NOT NULL DEFAULT 0 CHECK >= 0
gold_balance        int NOT NULL DEFAULT 0 CHECK >= 0
total_exp           int NOT NULL DEFAULT 0 CHECK >= 0
updated_at          timestamptz NOT NULL DEFAULT now()
```
**Trigger:** `trg_update_user_wallets_modtime`.

`users.level` được backend tính từ `total_exp` bằng `reward.LevelFromExp()`
(ngưỡng luỹ tiến `10 × level²`).

### `user_frames` (sở hữu khung)
```sql
id                  uuid PK
user_id             uuid NOT NULL → users(id) [CASCADE]
frame_id            uuid NOT NULL → frames(id) [RESTRICT]
acquired_at         timestamptz DEFAULT now()
UNIQUE (user_id, frame_id)
```
**Index:** `idx_user_frames_frame_id`. (Backend chưa dùng — PLANNED.)

### Trigger đăng ký: `handle_new_auth_user()`
Chạy `AFTER INSERT ON auth.users`. Trong 1 lần chạy sẽ:
1. Kiểm tra khu vườn khởi đầu `00000000-...-0001` có tồn tại không → thiếu thì
   raise **`Z0001`** và chặn đăng ký.
2. `insert users` (display_name = phần trước `@` của email).
3. `insert user_private` (email).
4. `insert user_wallets` (số dư 0).
5. `insert user_gardens` (khu vườn #1).

### Lưới an toàn khu vườn: `fn_grant_starter_garden()` + `on_public_user_created` (`012`)

`handle_new_auth_user()` chỉ treo trên `auth.users`, nên mọi đường tạo thẳng
`public.users` (seed, import, sửa tay) đều lọt qua và để lại user **không có
vườn nào** — triệu chứng ở FE là `GET /api/garden` trả mảng rỗng và màn Garden
trống trơn.

`012` bổ sung tầng hai:
- `fn_grant_starter_garden(p_user_id uuid)` — idempotent
  (`on conflict (user_id, garden_id) do nothing`), raise **`Z0001`** nếu khu vườn
  khởi đầu không tồn tại.
- Trigger `on_public_user_created` (`AFTER INSERT ON public.users`) gọi hàm trên.
  Khi đăng ký bình thường nó chạy **trước** bước 5 của `handle_new_auth_user()`,
  làm bước 5 thành no-op. `003` **không bị sửa**.
- Backfill một lần: cấp khu vườn #1 cho mọi user hiện **chưa có vườn nào**
  (điều kiện là "không có vườn nào", không phải "không có vườn #1").

---

## 3. Task

### `tasks`
```sql
id                      uuid PK
user_id                 uuid NOT NULL → users(id) [CASCADE]
title                   text NOT NULL CHECK (trim length > 0 AND length <= 255)
todos                   jsonb NOT NULL DEFAULT '[]'
penalty_mode            boolean NOT NULL DEFAULT false
status                  text NOT NULL DEFAULT 'active'
                        CHECK IN ('active','paused','submitted','given_up')
registered_duration_min int NOT NULL CHECK (>= 25 AND <= 999)
started_at              timestamptz            -- NULL = timer đang dừng
actual_duration_sec     int DEFAULT 0 CHECK >= 0
is_starred              boolean NOT NULL DEFAULT false
created_at              timestamptz NOT NULL DEFAULT now()
updated_at              timestamptz NOT NULL DEFAULT now()
completed_at            timestamptz
deleted_at              timestamptz            -- soft delete (chưa có endpoint)
```

**Constraint:**
- `task_must_have_todos` — `jsonb_array_length(todos) BETWEEN 1 AND 50`
  (đếm ở TẦNG GỐC; tổng số todo kể cả todo con do backend kiểm — tối đa 50).
- `max_todos_size` — `octet_length(todos::text) <= 51200` (50KB).

**Index:** `idx_tasks_user_id` — `(user_id)`.

**Trigger:**
- `trg_tasks_insert_sanitize` (BEFORE INSERT) — ép trạng thái khởi tạo bất kể
  client gửi gì: `status='active'`, `actual_duration_sec=0`, `started_at=now()`,
  `completed_at=NULL`, `deleted_at=NULL`, `created_at=now()`. **Timer tự chạy
  ngay khi tạo task.**
- `trg_pre_insert_task_quota` (BEFORE INSERT) — xem §4.
- `trg_tasks_protect_system_fields` (BEFORE UPDATE) — chặn client (qua PostgREST)
  sửa `created_at` (**`Z0002`**) và các cột hệ thống `penalty_mode`, `status`,
  `started_at`, `actual_duration_sec`, `completed_at`, `deleted_at` (**`Z0003`**).
  Backend chạy bằng role `postgres`/`service_role` nên được bỏ qua kiểm tra.
- `trg_update_tasks_modtime`.

**Cấu trúc `todos` (JSONB):**
```jsonc
[{ "id": "<uuid>", "text": "...", "done": false, "children": [ /* đệ quy */ ] }]
```
- `id` phải là UUID hợp lệ (backend validate bằng regex).
- Độ sâu tối đa **5 cấp**, tổng số todo (tính cả con) tối đa **50**.

**Vòng đời thời gian (nguồn chân lý duy nhất):**
`elapsed = actual_duration_sec + (NOW() - started_at khi started_at IS NOT NULL)`
- Pause: `actual_duration_sec += NOW() - started_at`, `started_at = NULL`.
- Resume: `started_at = NOW()`.
- Reset: `actual_duration_sec = 0`, `started_at = NOW()`.
- Submit/give-up: chốt `actual_duration_sec`, `started_at = NULL`, `completed_at = NOW()`.

### `task_daily_quotas`
```sql
user_id             uuid NOT NULL → users(id) [CASCADE]
target_date         date NOT NULL DEFAULT current_date
usage_count         int DEFAULT 0 CHECK >= 0
PRIMARY KEY (user_id, target_date)
```
Trigger `fn_enforce_task_quota()` (BEFORE INSERT ON tasks) upsert `usage_count + 1`
kèm điều kiện `usage_count < daily_task_limit`. Không upsert được → raise **`Z0004`**.

> Quota đếm theo **lượt tạo task**, không hoàn lại khi give-up hay xoá.

### `task_notes`
```sql
id                  uuid PK
task_id             uuid NOT NULL → tasks(id) [CASCADE]
user_id             uuid NOT NULL → users(id) [CASCADE]
content             text NOT NULL CHECK (trim length > 0 AND length <= 12000)
created_at          timestamptz NOT NULL DEFAULT now()
updated_at          timestamptz NOT NULL DEFAULT now()
```
**Index:** `idx_task_notes_task_id (task_id, created_at DESC)`, `idx_task_notes_user_id`.

**Trigger `fn_enforce_task_note_limit()` (BEFORE INSERT):**
1. `SELECT ... FOR UPDATE` task theo `(task_id, user_id)` → không thấy thì raise **`Z0005`** (không sở hữu task).
2. Đếm note của task, `>= 5` thì raise **`Z0006`**.

`trg_update_task_notes_modtime` cập nhật `updated_at`.

> Note **KHÔNG** phải append-only: API có `PATCH` và `DELETE`.

---

## 4. Kho đồ & khu vườn

### `inventory`
```sql
id                  uuid PK
user_id             uuid NOT NULL → users(id) [CASCADE]
item_id             uuid NOT NULL → items(id) [RESTRICT]
status              varchar(20) NOT NULL DEFAULT 'in_bag'
                    CHECK IN ('in_bag','placed','on_market')
acquired_at         timestamptz DEFAULT now()
```
**Index:** `idx_inventory_user_id`, `idx_inventory_item_id`,
`idx_inventory_penalty (user_id, status) WHERE status <> 'on_market'`.

Mỗi bản ghi là **một instance** — user có N cái cùng item thì có N dòng.
`on_market` dành cho marketplace (PLANNED, chưa có luồng nào set giá trị này).

### `user_gardens`
```sql
id                  uuid PK
user_id             uuid NOT NULL → users(id) [CASCADE]
garden_id           uuid NOT NULL → gardens(id) [CASCADE]
expansion_level     int NOT NULL DEFAULT 0 CHECK (>= 0 AND <= 5)
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
last_watered_at     timestamptz DEFAULT NULL
auto_water_until    timestamptz DEFAULT NULL
UNIQUE (user_id, garden_id)
```
**Index:** `idx_user_gardens_garden_id`. **Trigger:** `trg_update_user_gardens_modtime`.

- User nhận khu vườn #1 tự động lúc đăng ký — qua **hai** đường độc lập:
  `handle_new_auth_user()` (`003`) và `on_public_user_created` (`012`). Cả hai
  đều `on conflict do nothing` nên chạy chồng nhau vô hại.
- **Chưa có luồng mở khoá khu vườn tiếp theo** và **chưa có endpoint expand**
  (`expansion_level` hiện chỉ đọc) — PLANNED.
- `last_watered_at` / `auto_water_until` phục vụ tưới cây — PLANNED.

### `garden_placements`
```sql
id                  uuid PK
user_garden_id      uuid NOT NULL → user_gardens(id) [CASCADE]
inventory_id        uuid NOT NULL UNIQUE → inventory(id) [CASCADE]
grid_x              int NOT NULL CHECK >= 0
grid_y              int NOT NULL CHECK >= 0
effective_width     int NOT NULL DEFAULT 1 CHECK > 0
effective_height    int NOT NULL DEFAULT 1 CHECK > 0
rotation            smallint NOT NULL DEFAULT 0 CHECK IN (0,90,180,270)
health_status       varchar(50) DEFAULT 'healthy' CHECK IN ('healthy','wilted')
wilted_at           timestamptz DEFAULT NULL
placed_at           timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
UNIQUE (user_garden_id, grid_x, grid_y)
```

**Điểm cần nhớ:**
- Item có thể **lớn hơn 1 ô**. `effective_width/height` là kích thước SAU khi
  xoay (`rotation` 90/270 thì hoán đổi w/h) và được lưu lại để tính va chạm.
- `UNIQUE (user_garden_id, grid_x, grid_y)` chỉ khoá **ô gốc**. Chống chồng lấn
  cho item nhiều ô do **backend** làm bằng bounding box trong transaction có
  `SELECT ... FOR UPDATE` trên `user_gardens` (`internal/garden/service.go`) —
  DB không đủ sức làm việc này.
- `inventory_id UNIQUE` toàn cục → 1 instance không thể nằm ở 2 vườn.

**Trigger:**
- `trg_reset_inventory_on_placement_delete` (**AFTER DELETE**) — trả
  `inventory.status = 'in_bag'`. Lưu ý: **không có** trigger chiều ngược lại;
  khi đặt đồ, backend tự `UPDATE inventory SET status='placed'` trong cùng CTE.
- `trg_update_garden_placements_modtime`.

---

## 5. Reward & Economy

### `reward_rolls` (nhật ký RNG — bắt buộc ghi mỗi lần roll)
```sql
id                  uuid PK
task_id             uuid NOT NULL → tasks(id) [CASCADE]
user_id             uuid NOT NULL → users(id) [CASCADE]
roll_type           varchar(20) NOT NULL DEFAULT 'reward' CHECK IN ('reward','penalty')
item_id             uuid → items(id)          -- NULL khi không rơi item
silver_amount       int DEFAULT 0             -- âm nếu về sau có penalty trừ bạc
seed                text
created_at          timestamptz DEFAULT now()
CONSTRAINT unique_task_reward_per_user UNIQUE (task_id)
```
**Index:** `idx_reward_rolls_task_id`, `idx_reward_rolls_user_id`, `idx_reward_rolls_item_id`.

> `UNIQUE (task_id)` là **chốt chống double-submit ở tầng DB**: một task chỉ
> sinh được đúng 1 dòng roll, dù là reward hay penalty. Submit lần 2 sẽ vi phạm
> unique và cả transaction bị rollback.

### `economy_transactions` (sổ cái, append-only)
```sql
id                  uuid PK
user_id             uuid NOT NULL → users(id) [CASCADE]
silver_change       int NOT NULL DEFAULT 0    -- âm = trừ tiền
gold_change         int NOT NULL DEFAULT 0
action_type         varchar(50) NOT NULL CHECK IN (
                      'task_reward','shop_buy','shop_sell',
                      'market_buy','market_sell','market_fee',
                      'iap_purchase','gold_to_silver',
                      'name_change','slug_change')
reference_id        uuid                      -- task_id / listing_id...
description         text
created_at          timestamptz NOT NULL DEFAULT now()
```
**Index:** `idx_eco_trans_user (user_id, created_at DESC)`.

Mọi thay đổi số dư **bắt buộc** đi qua `internal/economy` để ghi 1 dòng ở đây.
Cấm `UPDATE user_wallets` rải rác ở domain khác.

`action_type` đang dùng thật: `task_reward`, `shop_buy`, `shop_sell`, `name_change`.
Các giá trị còn lại dành cho tính năng PLANNED.

> ⚠️ **Lỗi cú pháp đã biết:** danh sách CHECK trong `010_economy_transactions.sql`
> có dấu phẩy thừa sau `'slug_change',`. File này chạy được trên DB hiện tại
> nhưng sẽ fail nếu `supabase db push` lại từ đầu. Cần sửa trước khi dựng môi
> trường mới.

---

## 6. Hạ tầng

### `system_heartbeat` + pg_cron (`011_keepalive_cron.sql`)
```sql
id                  smallint PK DEFAULT 1 CHECK (id = 1)   -- luôn đúng 1 dòng
last_ping_at        timestamptz NOT NULL DEFAULT now()
ping_count          bigint NOT NULL DEFAULT 0
```
- `fn_keepalive_ping()` (SECURITY DEFINER) update dòng đó, `REVOKE ALL FROM public`.
- Job `keepalive-heartbeat` chạy `'17 3 */6 * *'` (03:17 UTC các ngày 1,7,13,19,25,31)
  → khoảng cách lớn nhất 6 ngày < ngưỡng pause 7 ngày của Supabase Free.
- Lý do ghi 1 dòng thay vì `select 1`: cần dấu vết kiểm chứng job có chạy thật.
- RLS bật, **không có policy** → PostgREST chặn sạch.

---

## 7. Bảng PLANNED (chưa có migration)

Giữ lại làm thiết kế tham chiếu, **đừng code như thể đã tồn tại**.

```sql
-- P2P legendary
marketplace_listings (id, seller_id, inventory_id, price_gold CHECK >= 5,
                      status IN ('active','sold','cancelled'), listed_at, sold_at)
-- Xã hội
friendships   (id, requester_id, addressee_id, status IN ('pending','accepted'),
               created_at, UNIQUE(requester_id, addressee_id))
feed_events   (id, user_id, event_type, payload jsonb, created_at)
garden_hearts (id, user_id, target_user_id, garden_index, created_at,
               UNIQUE(user_id, target_user_id, garden_index))
-- AI
daily_recaps  (id, user_id, date UNIQUE, content, tasks_completed, tasks_given_up,
               silver_earned, items_earned jsonb, ai_suggestions jsonb, created_at)
```

---

## 8. Mã lỗi DB (`errcode` tự định nghĩa)

| Code | Hàm | Ý nghĩa |
|---|---|---|
| **Z0001** | `handle_new_auth_user()`, `fn_grant_starter_garden()` | Thiếu khu vườn khởi đầu → chặn đăng ký / chặn cấp vườn |
| **Z0002** | `fn_tasks_protect_system_fields()` | `created_at` là bất biến |
| **Z0003** | `fn_tasks_protect_system_fields()` | Client không được sửa cột hệ thống |
| **Z0004** | `fn_enforce_task_quota()` | Vượt quota task/ngày theo plan |
| **Z0005** | `fn_enforce_task_note_limit()` | Không sở hữu task |
| **Z0006** | `fn_enforce_task_note_limit()` | Vượt 5 note/task |

Backend map các mã này ở `pkg/db/errors.go` → `pkg/apperr` → HTTP status
(xem `SPEC-BE.md` §7).

> **Z0007 / Z0008** từng được đặt cho hàm `fn_submit_task_reward()` — hàm này
> **không tồn tại**; luồng reward đã chuyển hẳn sang Go (`internal/reward`).
> Đừng tham chiếu 2 mã đó nữa.

---

## 9. RLS (`999_rls.sql`)

**Nguyên tắc:** RLS là mặc định. Bảng backend-only thì `enable row level security`
và **không tạo policy nào** → PostgREST chặn sạch. Frontend chỉ dùng supabase-js
cho **Auth và Storage**; mọi dữ liệu nghiệp vụ đi qua Go API.

| Bảng | Policy |
|---|---|
| `plan_quotas`, `frames`, `items`, `gardens` | SELECT cho mọi `authenticated` |
| `users` | SELECT cho mọi `authenticated`; UPDATE cho chủ sở hữu (`auth.uid() = id`) |
| `user_frames`, `user_private`, `user_wallets` | SELECT cho chủ sở hữu |
| `tasks` | SELECT/INSERT/UPDATE cho chủ sở hữu; UPDATE kèm `deleted_at IS NULL`. Không có policy DELETE |
| `task_notes` | SELECT/INSERT/UPDATE/DELETE cho chủ sở hữu (kiểm qua `EXISTS` trên `tasks`) |
| `task_daily_quotas` | SELECT cho chủ sở hữu |
| `inventory` | SELECT cho chủ sở hữu |
| `user_gardens` | SELECT cho **mọi** `authenticated` (phục vụ xem vườn người khác) |
| `garden_placements` | SELECT cho mọi `authenticated`; INSERT/UPDATE/DELETE cho chủ vườn |
| `reward_rolls`, `economy_transactions` | SELECT cho chủ sở hữu |
| `system_heartbeat` | RLS bật, **không policy** → chặn hoàn toàn |

**Storage bucket `users`:** user chỉ được SELECT file trong thư mục
`{uid}/`, và chỉ được INSERT/UPDATE/DELETE **đúng 2 đường dẫn**:
`{uid}/avatar.webp` và `{uid}/wallpaper.webp`.

---

## 10. Ràng buộc nghiệp vụ đặt ở DB (đã có)

| Bất biến | Cơ chế |
|---|---|
| Quota task theo ngày | trigger `fn_enforce_task_quota` (Z0004) |
| Tối đa 5 note/task, phải sở hữu task | trigger `fn_enforce_task_note_limit` (Z0005/Z0006) |
| Client không sửa được cột hệ thống của task | trigger `fn_tasks_protect_system_fields` (Z0002/Z0003) |
| Task luôn khởi tạo ở trạng thái sạch | trigger `tasks_insert_sanitize` |
| Số dư không âm | `CHECK silver_balance >= 0`, `gold_balance >= 0` |
| Một task chỉ roll thưởng 1 lần | `UNIQUE (task_id)` trên `reward_rolls` |
| 1 instance không nằm 2 chỗ | `UNIQUE inventory_id` trên `garden_placements` |
| 1 ô gốc chỉ 1 item | `UNIQUE (user_garden_id, grid_x, grid_y)` |
| Trả đồ về túi khi gỡ khỏi vườn | trigger `trg_reset_inventory_on_placement_delete` |

Đã có trigger lo thì backend **không check trùng lặp**, chỉ map đúng lỗi trigger
trả về sang `apperr`.

---

## 11. Ràng buộc do BACKEND giữ (DB không đủ sức)

- Chống chồng lấn item nhiều ô trong vườn (bounding box + `FOR UPDATE`).
- Item nằm trong biên lưới hiện tại (`base + expansion × 5`).
- Tổng số todo ≤ 50 kể cả todo con, độ sâu ≤ 5, `id` todo là UUID.
- Tổng `registered_duration_min` sau khi extend ≤ 999.
- Xác suất và giá trị phần thưởng (RNG chỉ ở server, dùng `crypto/rand`).
- Giá mua lại (`buyback`) khi bán đồ về shop.
