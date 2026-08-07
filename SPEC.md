# SPEC.md — FocusFlow

> Task-based Productivity App với Garden Gamification & Social Layer
> Solo-buildable · React + Go + Redis + Supabase (+ Prometheus/Grafana/Elasticsearch — PLANNED)

**Phân vai tài liệu:** file này là **product spec** — tầm nhìn, luật chơi, cân
bằng kinh tế. Chi tiết kỹ thuật nằm ở `SPEC-BE.md` (API/service),
`SPEC-DB.md` (schema/trigger/RLS), `SPEC-FE.md` (màn hình/state).
**Không** nhân bản schema hay danh sách endpoint ở đây.

**Quy ước:** ✅ đã chạy · 🚧 đang dở · ⬜ PLANNED (chưa có code).

---

## 1. Vision & Problem Statement

**Vấn đề:** To-do app quá khô khan, không tạo được động lực dài hạn. Người dùng
bắt đầu hăng hái rồi bỏ sau 2 tuần vì không có gì "kéo họ lại". Gamification hời
hợt (chỉ badge, streak) không đủ để tạo habit thực sự.

**Giải pháp:** FocusFlow biến mỗi task hoàn thành thành một viên gạch xây khu
vườn ảo. Vườn hoa trực quan hoá toàn bộ công sức — đẹp khi chăm chỉ, héo úa khi
lười biếng. Kết hợp mạng xã hội vườn hoa để có thêm động lực từ cộng đồng.

**Target user:** B2C thuần — freelancer, sinh viên, remote worker. Không
multi-tenant, không team.

**Tagline:** _"Your productivity, in full bloom."_

---

## 2. Core Concepts

### 2.1 Task-Based (không phải Project-Based)
FocusFlow là công cụ **hành động**. Mỗi đơn vị là một **Task** — có checklist,
có thời lượng, có kết quả rõ ràng. Roadmap, dependency, phân tích dự án → dùng
tool khác. FocusFlow chỉ trả lời: *"Tôi cần làm gì, và trong bao lâu?"*

### 2.2 Garden as Progress Visualization
Vườn là bản đồ nỗ lực. Mỗi hoa, cổng, lối đi là kết quả của công việc thật. Vườn
không thể mua hoàn toàn bằng tiền — phần lớn phải earn qua task.

### 2.3 Reward / Penalty (penalty là tuỳ chọn)
- **Thưởng:** hoàn thành task → item ngẫu nhiên + bạc + EXP.
- **Phạt:** bật `penalty_mode` khi tạo task; bỏ cuộc → mất 1 item.
- `penalty_mode` là **snapshot theo từng task**, chọn lúc tạo. Tắt thì bỏ cuộc
  chỉ mất lượt task trong ngày.

---

## 3. Task System ✅

### 3.1 Tạo task

| Field | Ràng buộc thực tế |
|---|---|
| **Tiêu đề** | 1–255 ký tự, không được toàn khoảng trắng |
| **Todo list** | ≥ 1 item, tổng ≤ **50** (tính cả todo con), lồng tối đa **5 cấp**, mỗi todo có `id` UUID |
| **Thời lượng** | **25–480 phút** lúc tạo; extend từng lần 1–120 phút, tổng ≤ **999 phút** |
| **Penalty mode** | bật/tắt, lưu theo task |

Bấm **Create Task** → task được ghi DB với `status='active'`, `started_at=NOW()`
(**đồng hồ tự chạy ngay**, không có nút Start riêng) → vào màn Focus.

Ghi chú (notes) được thêm/sửa/xoá trong màn Focus — **tối đa 5 note/task**, mỗi
note ≤ 12000 ký tự (DB chặn).

### 3.2 Màn Focus (tối giản)

```
┌─────────────────────────────────────┐
│  [Tên task]  [⭐]                    │
│         ⏱  0:00 → 45:00             │  ← đếm tiến từ 0 + progress ring
│  [ ] Todo 1                          │
│  [ ] Todo 2                          │
│      [ ] Sub-item 2.1                │
│  [+ Add todo]  [🗑 xoá]              │
│  📝 Notes (CRUD, tối đa 5)          │
│  [⏸ Pause/Resume]  [⏩ Extend]      │
│  [🔄 Reset]                          │
│  [✅ Submit]  [🏳 Give Up]           │
└─────────────────────────────────────┘
```

- **Pause:** dừng đồng hồ, `status='paused'`. Chỉ chạy được khi đang `active`
  **và** `started_at != NULL`.
- **Resume:** chỉ từ `paused`.
- **Extend:** `registered_duration_min += N` (1–120), tổng ≤ 999.
- **Reset:** đưa giờ về 0. **Chỉ khi `active`.**
- **Star:** ghim task lên đầu danh sách, toggle bất cứ lúc nào.
- **Submit:** từ `active` hoặc `paused`. Mọi todo tự động đánh dấu xong.
- **Give Up:** confirm → `given_up` → chạy penalty nếu `penalty_mode = true`.

### 3.3 Task states

```
active ──┬─→ paused ──→ active (resume)
         ├─→ submitted   (reward)
         └─→ given_up    (penalty nếu bật)
```
Không có state `draft`. `submitted`/`given_up` là trạng thái cuối.

### 3.4 Quota theo plan ✅

| Plan | Task/ngày |
|---|---|
| Free | 3 |
| Pro | 10 |
| Premium | 16 |

Quota tính theo **lượt tạo task**. Pause/resume không tốn thêm. Task `given_up`
vẫn tốn slot — đây là phạt nhẹ kể cả khi penalty mode tắt. Trigger DB
`fn_enforce_task_quota` là nơi giữ luật này (lỗi `Z0004` → HTTP 409).

> Việc **nâng plan** (thanh toán) ⬜ chưa làm. `plan_type` hiện chỉ đổi được
> bằng tay trong DB.

### 3.5 Timer

**Nguồn chân lý duy nhất:**
`elapsed = actual_duration_sec + (NOW() − started_at)` khi `started_at != NULL`.

| Sự kiện | `started_at` | `actual_duration_sec` |
|---|---|---|
| Create | `NOW()` | 0 |
| Pause | `NULL` | `+= NOW() − started_at` |
| Resume | `NOW()` | không đổi |
| Reset | `NOW()` | 0 |
| Submit | `NULL` | `+=` delta (nếu còn `started_at`) |
| Give up | `NULL` | không cộng delta |
| Extend | không đổi | không đổi (chỉ `registered_duration_min += N`) |

**Recovery:** client mount lại thì đọc task từ server và derive tiếp — không cần
DB update, không heartbeat.

**Cap:** client tự dừng hiển thị khi `elapsed >= registered_duration_min × 60`
và hiện nút Extend. Không có constraint DB, **không có** giới hạn cứng.

> ⬜ **Chưa làm:** timer state trên Redis (`internal/session` vẫn là stub) và
> validate tolerance thời gian phía backend. Hiện tại thời gian hoàn toàn do
> `started_at` của DB quyết định — client không gửi elapsed lên nên **không tự
> gian lận thời gian được**, nhưng cũng không có lớp chống chỉnh đồng hồ nào khác.

---

## 4. Garden System

### 4.1 Các khu vườn ✅

Seed hiện tại có **7 khu vườn** (không phải 20 như bản SPEC đầu):

| garden_index | Grid gốc | Mở rộng được |
|---|---|---|
| 1 | 5×5 | ✗ |
| 2 | 7×7 | ✗ |
| 3 | 9×9 | ✗ |
| 4 | 11×11 | ✗ |
| 5 | 15×15 | ✗ |
| 6 | 20×20 | ✗ |
| **7** | **25×25** | ✓ |

Kích thước thực tế = `grid_size + expansion_level × 5`, `expansion_level` tối đa
**5** → khu vườn 7 có thể lên 50×50.

User nhận khu vườn #1 tự động lúc đăng ký.

> ⬜ **Chưa làm:** mở khoá khu vườn tiếp theo (điều kiện: lấp đầy vườn hiện tại),
> endpoint mở rộng, và giá mở rộng. Giá dự kiến: `1000 × 1.5ⁿ` bạc cho lần
> mở rộng thứ n — **chưa chốt vì chưa có code**.

### 4.2 Item

Item **không phải lúc nào cũng 1×1**: bảng `items` có `width`/`height`, và
`rotation` 90/270 sẽ hoán đổi hai chiều đó. Backend chống chồng lấn bằng bounding
box, không phải bằng constraint DB.

| Rarity | Rơi từ task | Bán trong shop | Bị phạt xoá |
|---|---|---|---|
| Common | ✓ | ✓ | ✓ |
| Uncommon | ✓ | ✓ | ✓ |
| Rare | ✓ | ✓ | ✓ |
| Epic | ✓ | ✗ (theo thiết kế) | ✓ |
| **Legendary** | ✓ (jackpot) | ✗ | **✗ miễn nhiễm** |
| **Eternal** | ✓ (cực hiếm) | ✗ | **✗ miễn nhiễm** |

**Trạng thái item trong vườn:** `healthy` | `wilted`.
`wilted` vẫn chiếm ô nhưng xỉn màu và không tính vào garden value.

> ⚠️ **Mâu thuẫn đã biết trong code:** hàm lấy item thưởng
> (`GetRandomItemByRarity`) lọc `is_purchasable = true`. Nếu seed Epic/Legendary/
> Eternal với `is_purchasable = false` đúng như bảng trên thì **các bậc đó sẽ
> không bao giờ rơi ra** — roll sẽ tụt xuống bậc thấp hơn. Phải chọn một trong
> hai: bỏ điều kiện `is_purchasable` khỏi truy vấn thưởng, hoặc thêm cột riêng
> kiểu `is_droppable`. **Chưa quyết.**

### 4.3 Reward flow (submit task) ✅

```
Submit → roll rarity theo tier của level user
       → chọn ngẫu nhiên 1 item ở bậc đó (không có thì tụt bậc)
       → roll bạc theo level
       → cộng EXP theo level, tính lại level
       → ghi inventory + user_wallets + reward_rolls + economy_transactions
       → trả về modal phần thưởng
```

RNG **chỉ ở server**, dùng `crypto/rand` + HMAC-SHA256 trộn seed
`task_id:user_id:unix_nano`, khử bias bằng rejection sampling. Mỗi lần roll ghi
1 dòng `reward_rolls`; `UNIQUE(task_id)` chặn double-submit ở tầng DB.

#### Tỉ lệ rơi theo tier (basis point, tổng 10000)

| Level | Common | Uncommon | Rare | Epic | Legendary | Eternal |
|---|---|---|---|---|---|---|
| 1–4 | 69.99% | 20% | 7% | 2.5% | 0.5% | 0.01% |
| 5–9 | 57.99% | 22% | 12% | 7.5% | 0.5% | 0.01% |
| 10–14 | 43.99% | 22% | 18% | 15.5% | 0.5% | 0.01% |
| 15–19 | 27.99% | 22% | 22% | 27.5% | 0.5% | 0.01% |
| 20+ | 16.49% | 20% | 25% | 38% | 0.5% | 0.01% |

**Fallback:** không có item ở bậc roll ra → tụt dần
`eternal → legendary → epic → rare → uncommon → common`. Hết chuỗi thì task vẫn
được bạc + EXP, chỉ không có item.

#### Bạc mỗi task

| Level | Bạc |
|---|---|
| 1–4 | 150–280 |
| 5–9 | 320–500 |
| 10–14 | 550–800 |
| 15–19 | 850–1200 |
| 20+ | 1200–2000 |

#### EXP mỗi task

| Level | EXP |
|---|---|
| 1 | 10 |
| 2–3 | 20 |
| 4–7 | 35 |
| 8–11 | 55 |
| 12–16 | 75 |
| 17+ | `85 + (level − 17) × 5` |

**Level từ tổng EXP:** cộng dồn ngưỡng `10 × level²` (1→2 cần 10, 2→3 cần 40,
3→4 cần 90…). `users.level` được ghi lại mỗi lần cộng EXP.

> 3 bảng trên là **hợp đồng 2 chiều** với `backend/internal/reward/roll.go`.
> Sửa một bên phải sửa bên kia.

### 4.4 Penalty flow (give up, penalty mode ON) ✅

```
Give Up → chọn NGẪU NHIÊN 1 item của user có rarity ∈ {common, uncommon, rare, epic}
        → XOÁ hẳn dòng inventory (nếu đang đặt trong vườn thì placement cũng bay theo)
        → ghi reward_rolls với roll_type = 'penalty'
```

**Ba điểm khác với bản SPEC cũ, đây mới là hành vi thật:**
1. Legendary và Eternal **miễn nhiễm** hoàn toàn — không mất, cũng không héo.
2. Penalty ăn item **bất kể đang trong vườn hay đang nằm trong túi** (chỉ trừ
   item `on_market`). Không chỉ giới hạn ở đồ đã đặt.
3. Item bị **xoá thẳng** (`DELETE FROM inventory`), không có trạng thái `gone`.

Không còn item hợp lệ → không có gì xảy ra, vẫn ghi 1 dòng penalty roll.

### 4.5 Phạt do không hoạt động ⬜ CHƯA LÀM

Thiết kế: cronjob ngày, user không đăng nhập ≥ 7 ngày → làm **héo** (không xoá)
`ceil(số item healthy / 4)`. `cmd/cronjob` hiện là stub, và **DB chưa có cột
`last_login_at`** để dựa vào.

### 4.6 Tưới cây ⬜ CHƯA LÀM
Cột `last_watered_at` / `auto_water_until` đã có trong `user_gardens` nhưng chưa
có item nước tưới, chưa có endpoint.

---

## 5. Economy System

### 5.1 Hai loại tiền

| Tiền | Kiếm bằng | Dùng để | Trạng thái |
|---|---|---|---|
| **Bạc** 🪙 | hoàn thành task, bán đồ về shop | mua đồ, đổi tên, (mở rộng vườn ⬜) | ✅ |
| **Vàng** 💛 | bán đồ legendary/eternal về shop; (IAP ⬜) | (giao dịch P2P ⬜) | 🚧 chỉ có đường vào, chưa có đường ra |

**Bạc không mua được bằng tiền thật** — đây là chốt anti-pay-to-win.
Đổi vàng → bạc (1 vàng = 10.000 bạc, một chiều) ⬜ chưa làm.

### 5.2 Shop ✅

Mọi thay đổi số dư đi qua `internal/economy` và ghi 1 dòng
`economy_transactions`. Cấm sửa ví ở nơi khác.

**Mua:** `POST /api/economy/shop/buy` với `quantity` 1–99. Chỉ mua được item có
`is_purchasable = true` và `silver_price` khác NULL.

**Bán lại (buyback) — công thức đang chạy:**

| Loại | Nhận được |
|---|---|
| Item thường | `floor(silver_price × 0.5)` bạc |
| **Legendary** | **1 vàng** |
| **Eternal** | **2 vàng** |

Người bán chọn `receive_currency` = `silver` hoặc `gold`:
- Chọn `gold` mà item không có giá vàng → từ chối.
- Chọn `silver` với item premium (có giá vàng nhưng `silver_price` NULL) → từ
  chối, buộc phải bán lấy vàng. Tránh việc lỡ tay vứt đồ hiếm lấy 0 bạc.

**Giá tham khảo khi seed `items`** (chưa seed):

| Rarity | Giá mua | Bán lại |
|---|---|---|
| Common | ~200 🪙 | ~100 🪙 |
| Uncommon | ~600 🪙 | ~300 🪙 |
| Rare | ~1.500 🪙 | ~750 🪙 |
| Epic | ~4.000 🪙 | ~2.000 🪙 |

### 5.3 Phí đổi tên ✅
2 lần đầu miễn phí (`user_private.name_change_count`), từ lần thứ 3 trừ
**20.000 bạc**, ghi `economy_transactions` với `action_type='name_change'`.

### 5.4 Marketplace P2P & IAP ⬜ CHƯA LÀM

Thiết kế giữ lại để tham chiếu:
- Chỉ giao dịch legendary, chỉ bằng vàng, giá sàn 5 vàng.
- Phí sàn 10% (làm tròn lên, tối thiểu 1 vàng).
- Gói nạp: 5 vàng $0.99 · 12 vàng $1.99 · 30 vàng $4.99 · 70 vàng $9.99 ·
  150 vàng $19.99.

`inventory.status = 'on_market'` và các `action_type` `market_*` / `iap_purchase`
đã có sẵn trong schema nhưng **chưa luồng nào set**.

---

## 6. Leaderboard & Social ⬜ CHƯA LÀM

Toàn bộ phần này chưa có bảng DB lẫn endpoint. `internal/social` chỉ có file rỗng.

**Thiết kế giữ lại:**
- Garden value = `Σ(silver_price × health_factor)` (healthy = 1.0, wilted = 0)
  `+ Σ(legendary × giá thị trường)`; giá thị trường mặc định 5 vàng = 50.000 bạc.
  Sắp xếp phụ theo số legendary đang healthy.
- Top 100 global, top 20 trong friends, kèm rank cá nhân.
- Vườn công khai qua URL `focusflow.app/garden/@username` — **lưu ý DB chưa có
  cột `username`/slug**, hiện chỉ có `display_name` không unique.
- Thả tim, kết bạn, feed sự kiện (level up, legendary drop, top 10, streak).
  Không comment, không share.

---

## 7. User Flows

| Flow | Trạng thái |
|---|---|
| **Đăng ký / đăng nhập** (email + Google, Turnstile, quên/đặt lại mật khẩu) | ✅ |
| **Onboarding** (chọn username, chọn penalty mode, tutorial task) | ⬜ |
| **Task hằng ngày:** `/tasks` → tạo task → `/focus/:id` → submit → nhận thưởng | ✅ |
| **Quản lý vườn:** `/garden` → chọn đồ trong túi → click ô để đặt → xoay → dùng shovel để gỡ | ✅ |
| **Mua/bán:** modal shop trong trang Garden | ✅ |
| **Hồ sơ:** `/profile/me` — sửa bio, avatar (crop + upload Storage), đổi tên | ✅ |
| **Social / marketplace** | ⬜ |

---

## 8. Architecture

### 8.1 Hiện trạng

```
[React 19 + Vite]
       │  supabase-js → Supabase Auth (JWT, OAuth Google) + Storage (avatar)
       ▼
[Go API — chi] ──── [Redis]      ✅ rate limit + cache catalog shop
       │
       └──── [Supabase PostgreSQL]  ✅ toàn bộ dữ liệu nghiệp vụ
```

**Đã có config trong `infra/` nhưng backend CHƯA nối:** Elasticsearch,
Prometheus, Grafana, Supabase Realtime, Anthropic API, thanh toán.

Chi tiết cấu trúc thư mục: `SPEC-BE.md` §2 và `SPEC-FE.md` §2.
Schema: `SPEC-DB.md`. Danh sách endpoint: `SPEC-BE.md` §6.

### 8.2 Redis ✅

| Key | TTL | Dùng để |
|---|---|---|
| `ratelimit:{action}:{user_id}` | = window của policy | fixed-window counter |
| `cache:shop:items` | 1 giờ | catalog `GET /api/economy/shop/buy` |

Nguyên tắc: **thoáng khi đọc, chặt khi ghi**; rate limit **fail-open** (Redis
chết không được chặn user submit task), cache **fail-soft**, kết nối lúc boot
**fail-fast**. Bảng policy đầy đủ: `SPEC-BE.md` §5.

⬜ **Chưa dùng Redis cho:** timer state, quota counter (đang ở DB), cache AI
recap, leaderboard, gợi ý tìm kiếm, giá marketplace.

### 8.3 Elasticsearch / Prometheus ⬜
Index mapping có sẵn ở `infra/elasticsearch/index-mappings/` và dashboard ở
`infra/grafana/dashboards/`, nhưng backend chưa export metric hay index gì cả.

### 8.4 Keep-alive DB ✅
Job `pg_cron` trong Supabase (`011_keepalive_cron.sql`) ping bảng
`system_heartbeat` 6 ngày/lần để project Free không bị pause. Chạy **trong DB**,
không phụ thuộc backend Go. Chi tiết: `SPEC-DB.md` §6.

---

## 9. Reward & RNG Design

### 9.1 Bảng tỉ lệ
Xem §4.3. **Không còn** cơ chế "bonus rate khi task > 60 phút" — tỉ lệ chỉ phụ
thuộc level user.

### 9.2 RNG
`crypto/rand` + HMAC-SHA256 với seed `task_id:user_id:unix_nano`, rejection
sampling để khử bias. Kết quả ghi vào `reward_rolls`.

> ⚠️ Cột `reward_rolls.seed` hiện **luôn NULL** — `Grant()` không gán
> `RollResult.Seed` và `InsertRoll` không ghi cột này. Muốn audit lại được thì
> phải bổ sung. Ngoài ra seed có `unix_nano` nên roll **không** tái lập được
> (không deterministic) — đây là chủ ý hay thiếu sót thì **chưa chốt**.

### 9.3 Pity system ⬜ CHƯA LÀM
Thiết kế: `pity_counter` tăng mỗi lần submit, reset khi rơi legendary, đạt 200
thì lần kế tiếp guaranteed legendary. **Không có `pity.go`, không có cột đếm
trong DB.** Đừng code như thể đã có.

---

## 10. API

Xem `SPEC-BE.md` §6 — đó là nguồn chân lý duy nhất cho contract API.

Vài chỗ hay nhớ nhầm:
- Đường dẫn là `/api/tasks/{id}/giveup` (**không** phải `/give-up`).
- Shop nằm dưới `/api/economy/shop/...`, không có prefix `/api/shop`.
- `{id}` của garden là **`user_gardens.id`**, không phải `gardens.id`.
- Không có endpoint auth riêng của backend — đăng ký/đăng nhập do Supabase Auth
  lo, backend chỉ verify JWT.

---

## 11. UI/UX

### Nguyên tắc
- **Focus = zero distraction:** không nav, không notification khi đang trong task.
- **Garden = joy & calm:** màu pastel, animation mượt, cảm giác đặt hoa đã tay.
- **Economy = minh bạch:** số dư luôn thấy được, không dark pattern.
- **Penalty đủ "ouch" nhưng công bằng.**
- **Mobile-first** cho luồng task; vườn tối ưu tablet/desktop.

### Màn hình đã dựng
`/login` `/register` `/forgot-password` `/reset-password` · `/tasks` ·
`/focus/:taskId` · `/garden` (kèm modal kho đồ + modal shop) · `/profile/me`.

Chi tiết bố cục và state: `SPEC-FE.md` §7.

> Chưa có Dashboard riêng — `/` redirect thẳng sang `/garden`. Vườn dùng
> **PixiJS**, không phải Canvas API thuần.

---

## 12. Business Model ⬜ (thiết kế, chưa triển khai)

| Feature | Free | Grower ($4/th) | Master ($9/th) |
|---|---|---|---|
| Task/ngày | 3 | 10 | 16 |
| AI daily recap | ✗ | ✓ | ✓ |
| AI gợi ý todo | ✗ | ✓ | ✓ |
| Lịch sử tìm kiếm | 7 ngày | 3 tháng | Không giới hạn |
| Penalty mode | ✓ tuỳ chọn | ✓ | ✓ |
| Garden / Social | Đầy đủ | Đầy đủ | Đầy đủ |

Nguồn thu dự kiến: subscription · IAP vàng · phí sàn P2P 10%.
Mục tiêu MRR ~$4.000–5.000 sau 12 tháng.

**Hiện tại:** chỉ có `plan_quotas` và `user_private.plan_type` trong DB. Không
có thanh toán, không có cổng nâng cấp, không có gate tính năng theo plan.

---

## 13. Non-Functional Requirements

### Hiệu năng
- API p95 < 200ms.
- Vườn render 60fps (PixiJS, không dựng DOM cho từng ô).
- Animation phần thưởng bật < 100ms sau khi có response.

### Bảo mật (trạng thái thật)
- ✅ RLS bật trên mọi bảng; bảng backend-only không có policy nào.
- ✅ Mọi query theo `id` đều kèm `user_id` từ JWT.
- ✅ RNG server-side, ghi audit `reward_rolls`.
- ✅ Cập nhật ví trong transaction có `SELECT ... FOR UPDATE`, ghi sổ cái.
- ✅ Rate limit theo user cho toàn bộ route ghi.
- ⬜ Escrow marketplace, verify webhook thanh toán, timer state chống cheat.

### Độ tin cậy
- ✅ Graceful shutdown 15s để transaction đang chạy kịp xong.
- ✅ Redis hỏng → rate limit fail-open, cache fail-soft; API vẫn phục vụ.
- ⬜ Cronjob idempotent, escrow rollback — chưa có gì để bảo đảm.
- ⬜ **Backend chưa có test nào.**

---

## 14. Roadmap

### ✅ Đã xong
- Auth (Supabase JWT/JWKS), profile + đổi tên có phí, avatar upload.
- Task CRUD đầy đủ + state machine + quota + notes.
- Reward roll (tier RNG, EXP/level, bạc) + penalty give-up.
- Garden: xem, đặt/gỡ đồ theo lô, xoay, chống chồng lấn.
- Inventory bag, shop mua/bán, ví + sổ cái economy.
- Redis: rate limit theo endpoint + cache catalog shop.
- Graceful shutdown, CORS theo env, pool DB theo env.

### 🚧 Ưu tiên tiếp theo
1. **Seed `items` và `frames`** — thiếu cái này thì reward không rơi được item nào.
2. Chốt mâu thuẫn `is_purchasable` ở luồng thưởng (§4.2).
3. Mở khoá khu vườn tiếp theo + mở rộng vườn (đang có `expansion_level` nhưng không có đường tăng).
4. Test cho logic thuần: reward roll, EXP/level, isometric, bounding box.
5. Bổ sung `user?.id` vào query key FE còn thiếu (`SPEC-FE.md` §5.1).

### ⬜ Sau đó
Cronjob phạt vắng mặt · tưới cây · marketplace P2P + IAP · social/leaderboard ·
Elasticsearch search · AI recap/suggest · Prometheus/Grafana · onboarding ·
settings · gate theo plan.

---

## 15. Local Development

```bash
# 1. Hạ tầng (Redis là BẮT BUỘC để backend boot)
cd infra && docker compose up -d redis

# 2. Backend
cd backend
cp .env.example .env      # điền DATABASE_URL, SUPABASE_URL
go run ./cmd/server

# 3. Frontend
cd frontend
npm install && npm run dev
```

**Env backend:** xem `backend/.env.example` — bắt buộc `DATABASE_URL`,
`REDIS_URL`, `SUPABASE_URL`.

**Env frontend:** `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(+ khoá Turnstile nếu bật).

> `infra/docker-compose.yml` còn dựng cả Postgres, Elasticsearch, Prometheus,
> Grafana và service `api`. Luồng dev hiện tại **chỉ cần Redis** — DB dùng
> Supabase trên cloud.

---

## 16. Key Technical Decisions

| Quyết định | Lý do |
|---|---|
| PixiJS cho vườn | Vườn 25×25 trở lên mà dựng DOM từng ô sẽ lag; WebGL giữ 60fps dễ dàng. |
| Đồng hồ tính từ `started_at` của DB | Client không gửi elapsed lên nên không tự khai khống được. |
| RNG server-side + `reward_rolls` | Auditable, client không can thiệp được. |
| `UNIQUE(task_id)` trên `reward_rolls` | Chống double-submit ngay ở tầng DB, không cần khoá ở app. |
| Ví chỉ sửa qua `internal/economy` | Mọi biến động tiền đều có 1 dòng sổ cái, không thất lạc. |
| Chống chồng lấn ở backend, không ở DB | Item nhiều ô + xoay quá phức tạp cho constraint SQL; đã có `FOR UPDATE` giữ tính đúng đắn. |
| Rate limit fail-open | Redis sập không được phép cướp phần thưởng của một phiên tập trung đã hoàn thành. |
| Cache catalog shop bằng TTL | Dữ liệu hệ thống, không đổi theo user, không cần invalidate phức tạp. |
| Bỏ tenant → social garden | Đơn giản hoá kiến trúc, vòng lan truyền tốt hơn. |
| Bạc chỉ earn qua task | Anti-pay-to-win, giữ ý nghĩa của khu vườn. |

---

## 17. Risks & Mitigations

| Rủi ro | Cách xử lý |
|---|---|
| Chưa seed `items` → reward rỗng | **Ưu tiên số 1** ở roadmap |
| `is_purchasable` chặn cả drop lẫn shop | Tách cờ riêng hoặc bỏ điều kiện ở truy vấn thưởng |
| Penalty ăn cả đồ trong túi | Cần chốt: đúng ý đồ hay phải giới hạn ở đồ đã đặt trong vườn |
| Exploit kinh tế (double-spend) | Transaction + `FOR UPDATE` + sổ cái; rate limit ghi |
| Legendary quá hiếm → nản | Pity system (⬜ chưa làm) |
| Phạt vắng mặt quá nặng → rời bỏ | Chỉ làm héo, không xoá; nước tưới rẻ (⬜ chưa làm) |
| Spam social | Rate limit khi làm tới phần đó (10 lời mời/ngày, 1 tim/vườn/ngày) |
| Solo burnout | Phần đã xong đã là sản phẩm dùng được; phần còn lại là growth |

---

*FocusFlow — React 19 · Go 1.25 · Redis · Supabase*
*B2C solo users · Task-based · Garden gamification*
