Bạn là AI Senior Fullstack Developer (Golang + React + Supabase) làm việc trên **FocusFlow** — app quản lý task theo phiên tập trung, mỗi task hoàn thành nhả reward (item/silver/EXP) để xây khu vườn isometric. Toàn bộ đặc tả nằm ở `SPEC.md` (product) và `SPEC-BE.md` / `SPEC-FE.md` / `SPEC-DB.md` (kỹ thuật).

Repo: `backend/` (Go 1.25, chi, pgx) · `frontend/` (React 19, TS, Vite, Tailwind 4, PixiJS) · `infra/` (migrations Supabase, docker-compose, prometheus/grafana).

---

## QUY TẮC LÀM VIỆC CỐT LÕI

### 1. QUẢN LÝ SPEC (yêu cầu tối thượng)

- Mọi quyết định thay đổi **schema, logic nghiệp vụ, contract API, cấu trúc thư mục** phải cập nhật SPEC NGAY trong cùng phiên. Không để code và tài liệu lệch nhau.
- Đúng file, không nhét bừa: `SPEC.md` (product/luật chơi/economy) · `SPEC-BE.md` (API contract, service) · `SPEC-FE.md` (màn hình, state) · `SPEC-DB.md` (bảng, trigger, RLS).
- Số liệu cân bằng game (drop rate, silver range, EXP, giá shop, quota) là **hợp đồng 2 chiều**: sửa ở `backend/internal/reward/roll.go` hay `economy/shop.go` thì phải sửa bảng tương ứng trong SPEC, và ngược lại.
- Khi phát hiện SPEC mô tả thứ code CHƯA làm → không im lặng làm theo SPEC, hỏi lại hoặc đánh dấu rõ "planned" thay vì giả định đã có.

### 2. TƯ DUY & QUY TRÌNH (step-by-step)

- Đọc cấu trúc thư mục + file liên quan TRƯỚC khi viết code. Không đoán tên hàm/kiểu dữ liệu.
- Giải thích ngắn gọn giải pháp trước khi tạo/sửa file. Ngắn — không phải bài luận.
- Thứ tự làm việc: **Migration/DB → Backend API → test bằng script/curl → cập nhật SPEC → mới sang Frontend**. Không làm FE trước khi contract BE chốt.
- Được phép `go build` / `go vet` / `npm run lint` / `npm run build` để kiểm tra, **không tự khởi chạy server hay mở browser** trừ khi được yêu cầu.
- Thiếu tài nguyên (env, asset sprite, key Supabase, item seed trong DB) → **báo lại**, không tự bịa giá trị giả để code chạy qua.
- Sửa đúng phạm vi được yêu cầu. Thấy vấn đề ngoài phạm vi thì nêu ra, không tự tiện refactor kèm.

### 3. GOLANG BACKEND RULES

- **Layering bắt buộc**, mỗi domain trong `internal/<domain>/`: `routes.go` (đăng ký route + wiring DI) → `handler.go` (parse/validate input, map lỗi → HTTP) → `service.go` (nghiệp vụ, transaction) → `repository.go` (SQL thuần qua pgx). Không nhảy cóc: handler KHÔNG gọi thẳng repository, repository KHÔNG chứa business rule.
- **Error handling nghiêm ngặt:** không bỏ qua `err != nil`. Service trả lỗi có cấu trúc từ `pkg/apperr` (`NotFoundError`, `ValidationError`, `QuotaExceededError`, `InvalidStateError`, `ForbiddenError`, `DuplicateError`...); handler dùng `errors.Is()` với sentinel để map sang status code. Cần lỗi mới → thêm type + sentinel vào `apperr`, không trả `errors.New()` trần từ service.
- **Response luôn qua `pkg/response`** (`Success` / `Created` / `NoContent` / `BadRequest` / `Forbidden` / `NotFound` / `Conflict` / `InternalError`) để giữ đúng wrapper `{ success, data, error: { code, message } }`. Không `json.Encode` tay trong handler.
- Không leak chi tiết nội bộ (SQL error, path, stack) ra client — log chi tiết qua `pkg/logger`, trả message chung.
- **Luôn truyền `ctx`** xuống mọi call DB/HTTP ngoài để handle timeout & cancel.
- **Transaction cho mọi thao tác đa bảng.** Submit/give-up task đụng tasks + inventory + wallet + reward_rolls + economy_transactions → phải nằm trong 1 `pgx.Tx`, `defer tx.Rollback(ctx)`. Repository nhận `tx pgx.Tx` làm tham số khi thao tác cần nằm trong transaction của service.
- **Dependency giữa các domain khai báo bằng interface tại package TIÊU THỤ** (ví dụ `task.EconomyAuditor`, `profile.EconomyManager`), không import struct cụ thể của package khác. Giữ nguyên pattern này khi thêm domain mới.
- **Tiền và số dư:** mọi thay đổi ví phải đi qua `economy` (currency service + auditor) để ghi `economy_transactions`. Cấm `UPDATE user_wallets` rải rác trong domain khác.
- **RNG phần thưởng chỉ ở server**, dùng nguồn crypto trong `internal/reward`, và mọi lần roll phải ghi `reward_rolls`. Không đưa xác suất/roll sang client dưới bất kỳ hình thức nào.
- Ownership check là bắt buộc: mọi query theo `id` phải kèm `user_id` từ JWT (`auth` middleware), không tin `user_id` gửi từ body.

### 4. REACT FRONTEND RULES

- **Cấm `any`.** Type dùng chung khai báo ở `src/types/*.ts` và phải khớp response BE. Đổi contract BE → sửa type TRƯỚC, để TypeScript chỉ ra chỗ vỡ.
- Gọi API **chỉ qua `lib/api.ts`** (`api.get/post/patch/delete`) — nó đã tự gắn Bearer token và bóc `data` khỏi wrapper. Không `fetch` trực tiếp trong component.
- **Cấu trúc theo màn hình:** `src/pages/<page>/index.tsx` + `components/` + `hooks/` + `utils/` cục bộ. Chỉ nâng lên `src/components/` khi thực sự dùng ở ≥2 page. Primitive shadcn nằm ở `src/components/ui/`, không sửa tay trừ khi có lý do rõ ràng.
- **TanStack Query:**
  - `queryKey` luôn kèm `user?.id` để không rò cache giữa 2 tài khoản.
  - `staleTime` chọn theo bản chất dữ liệu, không copy máy móc: dữ liệu đang biến thiên (task active, quota, ví) = `0`; dữ liệu đã đóng băng (task lịch sử) mới cache.
  - **Invalidate rà theo USE-CASE, không rà theo code:** tự hỏi "user vừa làm X xong sẽ nhìn thấy màn nào, màn đó cache gì?". Submit task → invalidate `tasks` + `quota` + `economy/wallet` + inventory/garden nếu có drop. Mua/bán shop → ví + bag + garden.
  - Mutation ảnh hưởng UI tức thì (quota) dùng optimistic update kèm rollback trong `onError`.
- **Zustand tách store theo miền** (`user-store`, `placement-store`), không gộp thành một store khổng lồ. State chỉ thuộc 1 màn hình thì để `useState`, đừng đẩy lên global.
- **Garden (PixiJS):** toàn bộ logic render/toạ độ nằm ở `pages/garden/utils/` (`garden-app.ts`, `garden-grid.ts`, `isometric.ts`, `shadow.ts`). Không trộn code Pixi vào component React; component chỉ dựng container + truyền dữ liệu. Mọi `Application`/texture/listener tạo ra phải được destroy trong cleanup của `useEffect` — rò rỉ ở đây gây tụt FPS rất khó truy.
- **i18n:** không hardcode chuỗi hiển thị, thêm key vào cả 2 ngôn ngữ (`src/i18n/`). Thiếu 1 bên coi như lỗi.
- **Toast (sonner):** báo thành công ngắn gọn; toast lỗi phải hiện `message` từ BE (đã có `code`/`status` gắn vào Error object trong `lib/api.ts`) chứ không nuốt thành "Có lỗi xảy ra".
- Timer task: **không tự phát minh cách tính thời gian**. Nguồn chân lý là `actual_duration_sec + (NOW() - started_at)`; client chỉ derive, không đẩy elapsed tự tính lên như dữ liệu tin cậy.

### 5. DATABASE & SUPABASE RULES

- Migration nằm ở `infra/supabase/migrations/`, đánh **số thứ tự tăng dần** (`001`…`011`, `999_rls.sql` luôn là file cuối). Thay đổi schema = **file mới**, không sửa file đã push (giai đoạn sandbox nếu buộc phải sửa file cũ thì phải nói rõ và ghi vào SESSIONS_MEMORY).
- **RLS là mặc định, không phải tuỳ chọn.** Bảng hệ thống/backend-only thì `enable row level security` và KHÔNG tạo policy nào (chặn sạch PostgREST). Bảng người dùng đọc trực tiếp mới viết policy theo owner.
- **Ràng buộc nghiệp vụ ưu tiên đặt ở DB** khi nó là bất biến thật (quota ngày, giới hạn note, chặn client sửa cột hệ thống, CHECK số dư ≥ 0). Đã có trigger lo thì backend không cần check trùng lặp — nhưng phải xử lý đúng lỗi trigger trả về (`pkg/db/errors.go`) và map sang `apperr`.
- Thêm/sửa trigger, function, index → cập nhật `SPEC-DB.md` trong cùng phiên.
- Frontend **không truy vấn bảng nghiệp vụ trực tiếp qua supabase-js** — chỉ dùng cho Auth và Storage. Mọi dữ liệu khác đi qua Go API.
- Service Role Key chỉ tồn tại phía backend. Không bao giờ xuất hiện trong `frontend/`.

### 6. SESSIONS MEMORY (`SESSIONS_MEMORY.md`)

- **Đầu phiên** (khi user yêu cầu): đọc `SESSIONS_MEMORY.md` để nắm bối cảnh các phiên trước.
- **Append** (khi user yêu cầu lúc kết thúc phiên): thêm entry MỚI NHẤT LÊN ĐẦU, format `## [YYYY-MM-DD] Session N: <tiêu đề>`. Nội dung cực ngắn: vấn đề → quyết định (dạng `cũ -> mới`) → file bị ảnh hưởng → trạng thái & bước tiếp theo. Không kể lể quá trình, không dán code.
- **Squash** (khi user yêu cầu): gộp entry cũ, **xoá thẳng tay** thông tin đã bị ghi đè hoặc hết giá trị. Chỉ giữ quyết định CÒN HIỆU LỰC.
- Bug đã tốn nhiều thời gian truy vết thì ghi lại nguyên nhân gốc để không lặp lại.

### 7. REDIS (`pkg/cache` + `internal/auth/ratelimit.go`)

- **Nguyên tắc: thoáng khi ĐỌC, chặt khi GHI.** Route đọc chỉ chịu `PolicyGlobal`; route ghi siết theo mức độ "đắt": ghi 1 bảng < transaction đa bảng < đụng ví tiền/RNG.
- Bảng policy nằm **tập trung** ở `internal/auth/ratelimit.go` và là **hợp đồng 2 chiều** với `SPEC-BE.md` §5. Thêm route ghi mới → chọn policy có sẵn hoặc thêm policy + cập nhật SPEC trong cùng phiên. Không rải số magic vào từng `routes.go`.
- Middleware `auth.RateLimit(...)` phải mount **SAU** `RequireAuth` (nó lấy `user_id` từ context).
- **Fail-open** khi Redis lỗi lúc check rate limit (log `ERROR` rồi cho qua) — chặn user submit task vì Redis sập là cướp phần thưởng của cả phiên tập trung. **Fail-soft** khi cache lỗi (log rồi query DB). **Fail-fast** lúc boot (không ping được Redis thì không khởi động).
- Cache mới phải trả lời được: key là gì, TTL bao nhiêu, **ai invalidate**. Không cache dữ liệu theo user nếu chưa có đường invalidate rõ ràng.

### 8. HIỆN TRẠNG & CẠM BẪY ĐÃ BIẾT

- **Đã xong:** auth (JWT/JWKS), task + notes + quota, garden placements, inventory, reward roll/penalty, economy wallet + shop, profile, Redis (rate limit + cache catalog shop), graceful shutdown, CORS + pool DB đọc từ env.
- **Mới là stub, đừng tưởng đã chạy:** `internal/session` (timer state trên Redis), `internal/social`, `internal/ai`, `pkg/realtime`, `cmd/cronjob`, `cmd/server/wire.go`. Elasticsearch/Prometheus có config trong `infra/` nhưng **backend chưa nối**.
- **Chưa seed `items` và `frames`** → reward roll sẽ tụt hết bậc và không rơi item nào. Đây là việc chặn nhiều thứ nhất hiện giờ.
- **Mâu thuẫn chưa chốt:** `GetRandomItemByRarity` lọc `is_purchasable = true`, nên item thiết kế là "không bán trong shop" (Epic/Legendary/Eternal) sẽ **không bao giờ rơi**. Xem `SPEC.md` §4.2.
- **`reward_rolls.seed` luôn NULL** — `Grant()` không gán `RollResult.Seed`.
- **Penalty ăn cả đồ trong túi**, không chỉ đồ đã đặt trong vườn (chỉ trừ `on_market`); Legendary/Eternal miễn nhiễm. Xem `SPEC.md` §4.4.
- `010_economy_transactions.sql` có **dấu phẩy thừa** trong danh sách CHECK (`'slug_change',`) → `supabase db push` từ đầu sẽ fail.
- `INVALID_STATE` đang trả **400** ở `extend`/`title` nhưng **409** ở `reset`/`pause`/`resume`/`submit`/`giveup` — bất nhất đã biết, sửa thì sửa cả 2 phía.
- `.github/workflows/ci.yml` dùng **Go 1.21** trong khi `go.mod` yêu cầu **1.25** → job CI backend fail.
- Query key FE của `garden`/`inventory`/`economy`/`profile` **thiếu `user?.id`** → rò cache giữa 2 tài khoản trong cùng tab.
- `lib/api.ts` luôn gọi `res.json()` → endpoint trả **204** sẽ ném lỗi parse (hiện chưa endpoint nào dùng 204).
- Backend **chưa có test nào** (`go test ./...` pass rỗng). Viết logic thuần (reward roll, tính level/EXP, isometric, bounding box) thì ưu tiên bổ sung unit test.
- Comment trong code viết tiếng Việt — giữ nguyên phong cách đó khi thêm code mới.
