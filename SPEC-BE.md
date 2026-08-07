# SPEC-BE.md — FocusFlow Backend Specification

> Kiến trúc Go API server, service layer, contract API.
>
> **Quy ước đọc:** ✅ = đã chạy trong repo · 🚧 = có file/stub nhưng chưa nối
> · ⬜ = PLANNED, chưa có dòng code nào. Đừng gọi thứ chưa có ✅.

---

## 1. Tổng quan

```
[React Frontend] ── HTTPS ──→ [Go API (chi)] ──┬─→ Supabase PostgreSQL (pgx)
                                                └─→ Redis (rate limit + cache)
       │
       └── supabase-js ──→ Supabase Auth (JWT) + Storage (avatar/wallpaper)
```

### Tech stack đang dùng

| Thành phần | Trạng thái |
|---|---|
| Go 1.25, chi v5, pgx v5 | ✅ |
| Supabase Auth — verify JWT qua JWKS (`MicahParks/keyfunc`) | ✅ |
| Redis (`redis/go-redis/v9`) — rate limit + cache catalog | ✅ |
| `go-playground/validator/v10` — validate request body | ✅ |
| Elasticsearch (`infra/` có config) | ⬜ backend chưa nối |
| Prometheus / Grafana (`infra/` có config) | ⬜ backend chưa export metric |
| Supabase Realtime (`pkg/realtime/supabase.go`) | 🚧 file rỗng |
| Anthropic API (`internal/ai/`) | 🚧 file rỗng |
| Thanh toán (IAP/Stripe) | ⬜ chưa làm |

---

## 2. Cấu trúc thư mục thực tế

```
/cmd
  /server
    main.go        ✅ config → db pool → redis → JWKS → profanity → server + graceful shutdown
    routes.go      ✅ middleware chain, CORS theo env, mount 5 domain
    wire.go        🚧 file trống (DI đang làm thủ công trong routes.go)
  /cronjob
    main.go        🚧 stub

/internal
  /auth            ✅ middleware.go (RequireAuth/GetUserID), token.go, ratelimit.go
  /task            ✅ routes → handler → service → repository (+ models.go)
  /reward          ✅ roll.go, models.go, penalty.go, service.go, repository.go
  /garden          ✅ routes/handler/service/repository/models
  /inventory       ✅ routes/handler/service/repository/models
  /economy         ✅ routes/handler/models/repository + currency.go, audit.go, shop.go
  /profile         ✅ routes/handler/service/repository/models
  /session         🚧 3 file chỉ có comment (timer state trên Redis)
  /social          🚧 feed.go, friends.go, leaderboard.go — chỉ có comment
  /ai              🚧 provider.go, recap.go, suggest.go — chỉ có comment

/pkg
  /cache           ✅ redis.go — client + JSON helper + rate limit
  /config          ✅ config.go (loader.go là file trống)
  /db              ✅ postgres.go (pool theo env), errors.go (map errcode Z0xxx)
  /apperr          ✅ sentinel + typed error
  /response        ✅ wrapper { success, data, error }
  /request         ✅ BindAndValidate + format lỗi validator
  /logger          ✅ logger có prefix, ghi file khi ENV=production
  /profanity       ✅ lọc từ cấm cho display_name / bio
  /realtime        🚧 file trống
```

> Không có package `internal/shop`, `internal/marketplace`, `internal/search`,
> `internal/leaderboard`, `pkg/rng`, `pkg/metrics`. Logic mua/bán nằm trong
> `internal/economy`; RNG nằm trong `internal/reward/models.go` (`crypto/rand`).

### Layering bắt buộc
`routes.go` (wiring DI + rate limit) → `handler.go` (parse/validate, map lỗi →
HTTP) → `service.go` (nghiệp vụ + transaction) → `repository.go` (SQL thuần).
Handler **không** gọi thẳng repository; repository **không** chứa business rule.

Phụ thuộc chéo domain khai báo bằng interface tại package **tiêu thụ**:
`task.EconomyAuditor`, `profile.EconomyManager`.

---

## 3. Cấu hình

### 3.1 Biến môi trường (`backend/.env`, mẫu ở `.env.example`)

```env
# Server
ENV=development            # development | production
PORT=8080
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://...   # BẮT BUỘC
DB_MAX_CONNS=10
DB_MIN_CONNS=2

# Redis
REDIS_URL=redis://localhost:6379/0   # BẮT BUỘC

# Supabase (verify JWT qua JWKS)
SUPABASE_URL=https://<project>.supabase.co   # BẮT BUỘC
```

**Bắt buộc** (thiếu là `log.Fatalf` lúc khởi động): `DATABASE_URL`, `REDIS_URL`,
`SUPABASE_URL`. Còn lại có giá trị mặc định.

> Chưa dùng: `ELASTICSEARCH_URL`, `ANTHROPIC_API_KEY`, khoá thanh toán,
> `SUPABASE_ANON_KEY` (backend không cần, chỉ frontend dùng).

### 3.2 `pkg/config/config.go`

```go
type Config struct {
    Env         string
    Port        string
    DatabaseURL string
    DBMaxConns  int32
    DBMinConns  int32
    RedisURL    string
    SupabaseURL string
    CORSOrigin  string
}
```

### 3.3 Thứ tự khởi động (`cmd/server/main.go`)

1. `config.Load()`
2. `signal.NotifyContext` (SIGINT/SIGTERM) — nguồn cho graceful shutdown
3. `db.NewPool(ctx, url, max, min)` — ping, fail-fast
4. `cache.New(ctx, redisURL)` — ping, fail-fast
5. `auth.NewJWKS(supabaseURL)`
6. `profanity.NewFilter("data/badwords.txt", "data/whitelist.txt")`
7. `setupRoutes(...)` → `http.Server{ ReadHeaderTimeout: 10s }`
8. Nhận tín hiệu → `server.Shutdown` với timeout **15s**, hết hạn thì `Close()`

> Graceful shutdown quan trọng vì submit/give-up đang mở transaction đa bảng.

### 3.4 Middleware chain (`cmd/server/routes.go`)

```
RequestID → RealIP → Logger → Recoverer → CORS
  └── /health (public)
  └── group:  RequireAuth(jwks) → RateLimit(PolicyGlobal)
        ├── /api/tasks
        ├── /api/profile
        ├── /api/garden
        ├── /api/inventory
        └── /api/economy
```

CORS đọc từ `CORS_ORIGIN`, expose thêm header `Retry-After` để FE đọc được khi
bị 429.

---

## 4. Redis (`pkg/cache`)

### 4.1 API của `Cache`

| Hàm | Dùng cho |
|---|---|
| `New(ctx, url)` | tạo client + ping, fail-fast lúc boot |
| `Client()` | truy cập client gốc (health/INFO) |
| `Close()` | đóng pool |
| `SetJSON(ctx, key, v, ttl)` / `GetJSON(ctx, key, dest) (hit, err)` | cache JSON, **miss trả `(false, nil)` — không phải lỗi** |
| `Delete(ctx, keys...)` | invalidate |
| `RateLimitCheck(ctx, key, limit, window) (RateLimitResult, error)` | fixed-window counter |

`RateLimitCheck` chạy pipeline **1 round-trip**: `INCR` + `EXPIRE NX` + `PTTL`.
Dùng `EXPIRE NX` (không phải "chỉ set TTL khi count == 1") để nếu process chết
giữa 2 lệnh thì key vẫn có TTL, tránh khoá user vĩnh viễn.
Trả về `{ Allowed, Remaining, RetryAfter }`.

### 4.2 Quy ước key

| Key | TTL | Nội dung |
|---|---|---|
| `ratelimit:{action}:{user_id}` | = window của policy | bộ đếm fixed-window |
| `cache:shop:items` | 1 giờ | catalog `GET /api/economy/shop/buy` |

Catalog shop là dữ liệu hệ thống, giống nhau với mọi user, chỉ đổi khi seed lại
`items` → cache theo TTL, không cần invalidate theo user.
`economy.Service.InvalidateShopItems(ctx)` có sẵn cho khi thêm admin endpoint.

### 4.3 Chính sách hỏng hóc

- **Rate limit: FAIL-OPEN.** Redis chết → log `ERROR` rồi cho request đi tiếp.
  Chặn user submit task vì Redis sập là mất phần thưởng của cả phiên tập trung.
- **Cache: FAIL-SOFT.** Lỗi đọc/ghi cache → log rồi query DB như bình thường.
- **Lúc khởi động: FAIL-FAST.** Không ping được Redis thì không boot, để lỗi lộ
  ra ngay chứ không âm thầm chạy không rate limit.

---

## 5. Rate limiting

**Nguyên tắc: thoáng khi ĐỌC, chặt khi GHI.** Đọc chỉ chịu lưới an toàn chung;
ghi siết theo mức độ "đắt" của thao tác: ghi 1 bảng < transaction đa bảng <
đụng ví tiền / RNG.

Fixed-window **theo từng user** (`user_id` lấy từ JWT, không tin body).
Middleware `auth.RateLimit(cache, log, policy)` mount **sau** `RequireAuth`.

### 5.1 Bảng policy — hợp đồng 2 chiều với `internal/auth/ratelimit.go`

| Policy | action key | Limit | Window | Áp cho |
|---|---|---|---|---|
| `PolicyGlobal` | `api_global` | 300 | 1 phút | **mọi** request đã đăng nhập |
| `PolicyTaskCreate` | `task_create` | 20 | 1 phút | `POST /api/tasks` |
| `PolicyTaskTimer` | `task_timer` | 60 | 1 phút | `extend`, `reset`, `pause`, `resume` |
| `PolicyTaskEdit` | `task_edit` | 60 | 1 phút | `PATCH todos`, `PATCH title` |
| `PolicyTaskStar` | `task_star` | 30 | 1 phút | `POST /{id}/star` |
| `PolicyTaskSubmit` | `task_submit` | 10 | 1 phút | `POST /{id}/submit` |
| `PolicyTaskGiveUp` | `task_giveup` | 10 | 1 phút | `POST /{id}/giveup` |
| `PolicyNoteWrite` | `note_write` | 30 | 1 phút | POST/PATCH/DELETE note |
| `PolicyGardenWrite` | `garden_write` | 30 | 1 phút | đặt/gỡ đồ (dùng chung 1 bucket) |
| `PolicyShopBuy` | `shop_buy` | 10 | 1 phút | `POST /api/economy/shop/buy` |
| `PolicyShopSell` | `shop_sell` | 10 | 1 phút | `POST /api/economy/shop/sell` |
| `PolicyProfileUpdate` | `profile_update` | 10 | 1 phút | `PATCH bio`, `PATCH avatar-url` |
| `PolicyNameChange` | `name_change` | 3 | **1 giờ** | `POST /api/profile/change-name` |

**Lý do chọn số:**
- `task_submit` / `task_giveup` thấp nhất vì mỗi lần là 1 transaction chạm
  `tasks + reward_rolls + inventory + user_wallets + economy_transactions` kèm RNG.
- `garden_write` dùng **chung bucket** cho cả đặt và gỡ vì cả hai đều
  `SELECT ... FOR UPDATE` trên `user_gardens`; spam sẽ làm các request xếp hàng chờ khoá.
- `task_edit` = 60/phút khớp với debounce ~1s của autosave todos ở FE.
- `name_change` tính theo giờ vì từ lần thứ 3 là trừ 20.000 silver.
- `PolicyGlobal` 300/phút đủ rộng cho refetch của TanStack Query, chỉ chặn spam thật.

### 5.2 Khi bị chặn

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 37
```
```json
{ "success": false, "error": { "code": "RATE_LIMITED",
  "message": "Too many requests, please slow down" } }
```

Rate limit ở đây **không thay thế** quota nghiệp vụ. Quota task/ngày vẫn do
trigger DB `fn_enforce_task_quota` giữ và trả **409 `QUOTA_EXCEEDED`**.

---

## 6. Contract API

Mọi endpoint đều nằm sau `RequireAuth` (trừ `GET /health`) và trả wrapper:

```json
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "…", "message": "…" } }
```

### 6.1 Task — `/api/tasks`

| Method | Path | Mô tả | Success |
|---|---|---|---|
| GET | `/` | danh sách task (`TaskSummary[]`) | 200 |
| POST | `/` | tạo task | **201** |
| GET | `/quota/today` | `{ used, limit }` | 200 |
| GET | `/{id}` | chi tiết task (`Task` đầy đủ todos) | 200 |
| PATCH | `/{id}/todos` | autosave todos | 200 `{message}` |
| PATCH | `/{id}/title` | đổi tiêu đề | 200 `{message}` |
| POST | `/{id}/extend` | `{ add_minutes }` | 200 `{message}` |
| POST | `/{id}/reset` | đặt lại giờ về 0 | 200 `{message}` |
| POST | `/{id}/pause` | dừng timer | 200 `{message}` |
| POST | `/{id}/resume` | chạy lại timer | 200 `{message}` |
| POST | `/{id}/star` | toggle sao | 200 `{ is_starred }` |
| POST | `/{id}/submit` | nộp + nhận thưởng | 200 `{ Reward }` |
| POST | `/{id}/giveup` | bỏ cuộc (+ phạt nếu bật) | 200 `PenaltyResult \| null` |
| GET | `/{id}/notes` | `TaskNote[]` | 200 |
| POST | `/{id}/notes` | tạo note | **201** |
| PATCH | `/{id}/notes/{nid}` | sửa note | 200 `TaskNote` |
| DELETE | `/{id}/notes/{nid}` | xoá note | 200 `{message}` |

**`GET /` query params:**
- `date` = `today` (mặc định) | `yesterday` | `7days` | `30days` — giá trị lạ bị bỏ qua, quay về `today`.
- `status` = danh sách ngăn cách dấu phẩy trong `active,paused,submitted,given_up`;
  rỗng = lấy tất cả. Giá trị lạ bị **lọc bỏ im lặng**.

**`POST /` body:**
```json
{ "title": "string 1-255",
  "todos": [ { "id": "<uuid>", "text": "...", "done": false, "children": [] } ],
  "registered_duration_min": 25,        // 25..480 lúc tạo
  "penalty_mode": false }
```

**Endpoint chưa có** (dù từng ghi trong SPEC cũ): `DELETE /api/tasks/{id}` (soft
delete) ⬜, `GET /api/tasks/history` ⬜ — lịch sử đang dùng chính `GET /` + `date`.

> Đường dẫn là `/giveup`, **không phải** `/give-up`.

### 6.2 Garden — `/api/garden`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/` | `GardenListItem[]` — `{id, garden_id, garden_index, expansion_level, is_expandable, can_expand}` |
| GET | `/{id}` | `GardenResponse` — grid info + `placements[]` |
| POST | `/{id}/placements` | đặt 1 item → `PlacementResponse` (**200**, không phải 201) |
| POST | `/{id}/placements/batch` | `{ items: [...] }` → `{ results: [...] }` (200) |
| DELETE | `/{id}/placements` | `{ inventory_ids: [...] }` → `{ successful_inventory_ids }` (200) |

`{id}` là **`user_gardens.id`**, không phải `gardens.id`.

**Ngữ nghĩa batch — quan trọng:** `placements/batch` trả **kết quả từng phần**.
Item hỏng (trùng trong request, không sở hữu, ngoài biên, chồng lấn) trả
`{ success: false, error_reason }` còn các item khác vẫn được ghi. Chỉ lỗi hệ
thống (mất khoá, vi phạm 23505) mới rollback cả transaction.

`POST /{id}/placements` (đơn lẻ) là wrapper của batch: item hỏng → **400
VALIDATION_ERROR** với `error_reason` làm message.

**Chưa có:** expand vườn ⬜, mở khoá vườn tiếp theo ⬜, tưới cây ⬜, garden stats ⬜.

### 6.3 Inventory — `/api/inventory`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/bag` | `InBagItem[]` — gom nhóm theo `item_id`, kèm `quantity` và `instance_ids[]` |

FE dùng `instance_ids[]` để gửi `inventory_id` thật khi đặt đồ.

### 6.4 Economy — `/api/economy`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/wallet` | `{ silver_balance, gold_balance }` |
| GET | `/shop/buy` | `ShopItemResponse[]` — **có cache Redis 1h** |
| GET | `/shop/sell` | `SellableItemResponse[]` — đồ trong túi + giá mua lại |
| POST | `/shop/buy` | `{ item_id, quantity 1..99 }` → `{ total_cost, new_silver, inventory_ids }` |
| POST | `/shop/sell` | `{ inventory_ids[], receive_currency: "silver"\|"gold" }` |

`POST /shop/sell` trả `{ successful_inventory_ids, total_silver_earned,
total_gold_earned, new_silver, new_gold }`.

**Chưa có:** `GET /transactions` ⬜, `POST /convert` (gold→silver) ⬜, tưới cây ⬜.

### 6.5 Profile — `/api/profile`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/` | `Profile` — `{id, display_name, bio, avatar_url, level, created_at, updated_at}` |
| GET | `/private` | `UserPrivate` — `{user_id, email, plan_type, name_change_count, updated_at}` |
| PATCH | `/bio` | `{ bio }` (≤255) → `Profile` |
| PATCH | `/avatar-url` | `{ avatar_url }` (phải là URL hợp lệ) → `Profile` |
| POST | `/change-name` | `{ display_name }` (1..50) → `{message}` |

`bio` và `display_name` đều đi qua `pkg/profanity`. Đổi tên: 2 lần đầu miễn phí
(`user_private.name_change_count`), từ lần 3 trừ **20.000 silver** trong cùng
transaction với việc đổi tên.

### 6.6 Chưa có domain nào ⬜

Marketplace, friends/feed/leaderboard, search, AI recap/suggest, metrics.

---

## 7. Xử lý lỗi

### 7.1 Đường đi của lỗi

```
Postgres errcode  →  pkg/db/errors.go  →  pkg/apperr (typed + sentinel)
                                        →  handler errors.Is()  →  pkg/response
```

Service **không** trả `errors.New()` trần. Cần lỗi mới thì thêm type + sentinel
vào `apperr`. Không leak SQL/stack ra client — chi tiết đi vào `pkg/logger`.

### 7.2 `pkg/apperr`

| Type | Sentinel |
|---|---|
| `NotFoundError{Resource}` | `ErrNotFound` |
| `ValidationError{Message}` | `ErrValidation` |
| `QuotaExceededError{Limit}` | `ErrQuotaExceeded` |
| `InvalidStateError{Current, Expected}` | `ErrInvalidState` |
| `ForbiddenError{}` | `ErrForbidden` |
| `DuplicateError{Message}` | `ErrDuplicate` |
| `NoteLimitExceededError{}` | `ErrNoteLimitExceeded` |
| `UserNotFoundError{}` | `ErrUserNotFound` |
| — | `ErrInsufficientBalance` |

### 7.3 `pkg/response`

`Success` (200) · `Created` (201) · `NoContent` (204) · `BadRequest` ·
`Unauthorized` · `Forbidden` · `NotFound` · `Conflict` ·
`TooManyRequests(w, retryAfterSec)` · `InternalError`.

Không `json.Encode` tay trong handler.

### 7.4 Bảng mã lỗi trả ra client

| HTTP | `error.code` | Khi nào |
|---|---|---|
| 400 | `INVALID_JSON` | body không parse được |
| 400 | `VALIDATION_ERROR` | sai validator tag hoặc rule nghiệp vụ |
| 400 | `INVALID_ID` | thiếu path param |
| 400 | `INVALID_STATE` | sai trạng thái (extend/edit title) |
| 400 | `INSUFFICIENT_BALANCE` | không đủ tiền |
| 401 | `UNAUTHORIZED` | thiếu/hỏng JWT |
| 403 | `FORBIDDEN` | không sở hữu tài nguyên |
| 404 | `NOT_FOUND` | không tồn tại |
| 409 | `QUOTA_EXCEEDED` | vượt quota task/ngày (Z0004) |
| 409 | `INVALID_STATE` | sai trạng thái (reset/pause/resume/submit/giveup) |
| 409 | `DUPLICATE_ITEM` | race condition khi đặt đồ (23505) |
| 429 | `RATE_LIMITED` | vượt rate limit, kèm `Retry-After` |
| 500 | `INTERNAL_ERROR` | lỗi không lường trước |

> `INVALID_STATE` trả **400** ở `extend`/`title` nhưng **409** ở
> `reset`/`pause`/`resume`/`submit`/`giveup`. Đây là bất nhất đã biết trong code
> hiện tại — ghi lại để FE khỏi đoán mò; sửa thì phải sửa cả 2 phía.

### 7.5 Mã lỗi DB
Xem bảng Z0001–Z0006 trong `SPEC-DB.md` §8. Z0007/Z0008 đã bỏ (hàm
`fn_submit_task_reward` không tồn tại) nhưng hằng số vẫn còn trong
`pkg/db/errors.go` — chưa dùng ở đâu.

---

## 8. Nghiệp vụ cốt lõi

### 8.1 Task state machine

```
                 (tạo, timer chạy ngay)
                          │
                          ▼
   ┌──────────────────► active ◄──────────────┐
   │ resume               │  │                │ (reset: giữ nguyên active)
   │                      │  └── pause ──► paused
   │                      │                   │
   └──────────────────────┴───────────────────┘
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
        submitted                  given_up
     (roll thưởng)          (phạt nếu penalty_mode)
```

- Submit và give-up chấp nhận cả `active` lẫn `paused`.
- Reset chỉ chạy ở `active`. Pause chỉ ở `active` **và** `started_at != NULL`.
- Resume chỉ ở `paused`.
- Sửa todos/title chỉ ở `active|paused`.
- `submitted`/`given_up` là trạng thái cuối.

### 8.2 SubmitTask — transaction đa bảng

```
1. GetByID → validate status ∈ {active, paused}          (ngoài tx)
2. BEGIN; defer Rollback
3. repo.Submit(tx)            — đánh dấu mọi todo done, chốt giờ, status='submitted'
4. rewarder.GetUserLevel(tx)  — từ user_wallets.total_exp
5. rewarder.Grant(tx)         — roll rarity → lấy item → roll silver → exp
                                → inventory + user_wallets + reward_rolls
6. economyAuditor.LogTransaction(tx, action_type='task_reward')
7. COMMIT
```

`reward_rolls.UNIQUE(task_id)` là chốt chống double-submit ở tầng DB — submit
lần 2 vi phạm unique và rollback toàn bộ.

### 8.3 GiveUpTask

- `penalty_mode = false` → không mở transaction, chỉ 1 UPDATE.
- `penalty_mode = true` → transaction: `GiveUp` + `rewarder.Penalty`
  (xoá 1 placement ngẫu nhiên, trigger DB trả đồ về túi, ghi `reward_rolls`
  với `roll_type='penalty'`). Không còn đồ trong vườn thì log warn, vẫn ghi roll.

### 8.4 Reward roll (`internal/reward`)

**RNG chỉ ở server**, dùng `crypto/rand`, khử bias bằng rejection sampling.
Seed rarity trộn HMAC-SHA256 với `"{task_id}:{user_id}:{unix_nano}"`.
Tuyệt đối không đưa xác suất/roll sang client.

**Bảng tỉ lệ theo tier (basis point, tổng 10000)** — `roll.go`:

| Tier | Level | common | uncommon | rare | epic | legendary | eternal |
|---|---|---|---|---|---|---|---|
| 1 | 1–4 | 6999 | 2000 | 700 | 250 | 50 | 1 |
| 2 | 5–9 | 5799 | 2200 | 1200 | 750 | 50 | 1 |
| 3 | 10–14 | 4399 | 2200 | 1800 | 1550 | 50 | 1 |
| 4 | 15–19 | 2799 | 2200 | 2200 | 2750 | 50 | 1 |
| 5 | 20+ | 1649 | 2000 | 2500 | 3800 | 50 | 1 |

**Fallback:** roll ra bậc nào mà DB không có item bậc đó thì tụt xuống bậc thấp
hơn theo chuỗi `eternal → legendary → epic → rare → uncommon → common → (hết)`.
Hết chuỗi mà vẫn không có item → task vẫn được thưởng silver + EXP, chỉ không
có vật phẩm.

**Silver mỗi task** (`silverRange`):

| Level | Silver |
|---|---|
| 1–4 | 150–280 |
| 5–9 | 320–500 |
| 10–14 | 550–800 |
| 15–19 | 850–1200 |
| 20+ | 1200–2000 |

**EXP mỗi task** (`ExpPerTask`):

| Level | EXP |
|---|---|
| 1 | 10 |
| 2–3 | 20 |
| 4–7 | 35 |
| 8–11 | 55 |
| 12–16 | 75 |
| 17+ | `85 + (level − 17) × 5` |

**Level từ EXP** (`LevelFromExp`): cộng dồn ngưỡng `10 × level²`
(level 1→2 cần 10, 2→3 cần 40, 3→4 cần 90, …).

> Ba bảng trên là **hợp đồng 2 chiều** với `SPEC.md`. Sửa `roll.go` thì phải sửa
> cả hai file.

### 8.5 Garden placement (`PlaceItemsBatch`)

```
1. BEGIN; defer Rollback
2. LockUserGarden(tx)  — SELECT ... FOR UPDATE, lấy base_size + expansion_level
3. current_size = base + expansion × 5
4. Nạp vào RAM: map kho đồ + bounding box của placement đang có
5. Duyệt từng item (O(k)):
   a. trùng inventory_id trong chính request?
   b. có sở hữu / chưa đặt?
   c. effective w/h theo rotation (90/270 hoán đổi)
   d. lọt trong biên?
   e. chồng lấn với box đang có (kể cả item vừa duyệt xong trong batch)?
   → hỏng thì ghi error_reason, KHÔNG hủy cả batch
6. Ghi hàng loạt placement + set inventory.status='placed' (CTE, 1 round-trip)
7. COMMIT
```

`RemoveItemsBatch` cũng khoá `user_gardens` rồi chạy 1 CTE: lọc inventory hợp lệ
(thuộc user, `status <> 'on_market'`) → xoá placement → trả `status='in_bag'`.
Trigger `trg_reset_inventory_on_placement_delete` cũng làm việc này ở tầng DB.

### 8.6 Economy

Mọi thay đổi số dư đi qua `economy.CurrencyService.ChangeBalance` (khoá ví bằng
`FOR UPDATE`, cập nhật số dư, ghi `economy_transactions`). **Cấm `UPDATE
user_wallets` rải rác ở domain khác.**

**Giá mua lại** (`calculateBuybackPrice`): `silver = floor(silver_price × 0.5)`;
riêng `legendary` → **1 gold**, `eternal` → **2 gold**.
Bán đồ premium (có giá gold) mà chọn nhận silver thì bị từ chối nếu silver = 0.

---

## 9. Bảo mật

- Ownership check bắt buộc: mọi query theo `id` phải kèm `user_id` lấy từ JWT.
  Không tin `user_id` trong body.
- RLS bật trên mọi bảng (xem `SPEC-DB.md` §9). Backend dùng connection có quyền
  bỏ qua RLS nên **không được** coi RLS là lớp phòng thủ duy nhất.
- Service Role Key chỉ tồn tại ở backend, không bao giờ có trong `frontend/`.
- SQL luôn tham số hoá qua pgx.
- Rate limit theo user cho mọi route ghi (§5).

### Việc còn nợ
- [ ] Backend chưa có test nào (`go test ./...` pass rỗng).
- [ ] Chưa export Prometheus metric.
- [ ] `internal/session` (timer state trên Redis) vẫn là stub.
- [ ] Chưa có audit/alert cho rate limit bị chặn ngoài log `WARN`.
- [ ] `.github/workflows/ci.yml` gọi `npm run type-check` — script này không tồn
      tại trong `frontend/package.json` → job CI frontend fail.

---

## 10. Cronjob ⬜

`cmd/cronjob/main.go` là stub. Dự kiến (chưa có dòng nào):
1. Phạt không hoạt động — user không đăng nhập > 7 ngày, làm héo 1/4 số đồ khoẻ.
2. Dọn listing marketplace quá hạn.
3. Sinh daily recap.

> Keep-alive DB **không** thuộc cronjob Go — nó chạy bằng pg_cron ngay trong
> Supabase (`011_keepalive_cron.sql`), độc lập với backend.
