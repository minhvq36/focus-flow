# SESSIONS MEMORY (Lịch sử phát triển)

> File này lưu lịch sử các phiên làm việc với Claude Code. Quy tắc ghi/nén xem tại `CLAUDE.md` mục "SESSIONS MEMORY".
> - **Append**: Kết thúc phiên, thêm 1 entry mới — MỚI NHẤT LÊN TRÊN CÙNG.
> - **Format**: `## [YYYY-MM-DD] Session N: <tiêu đề>` → Vấn đề → Quyết định (`cũ -> mới`) → File ảnh hưởng → Trạng thái & bước tiếp theo.
> - **Squash**: Khi được yêu cầu, gộp các entry cũ và xoá thẳng tay phần đã bị ghi đè. Chỉ giữ quyết định CÒN HIỆU LỰC.
> - **Đọc lại**: Đầu phiên mới, đọc file này để nắm bối cảnh (khi user yêu cầu).
>
> Nguyên tắc: ghi **quyết định**, không ghi nhật ký thao tác. Không dán code, không kể lể quá trình.

---

## [2026-08-07] Session 3: Fix SPA 404 trên Vercel + gỡ toàn bộ lỗi lint FE

**Vấn đề:** (1) `focusflow-four.vercel.app` F5 ở route con trả 404 — BrowserRouter không có file tĩnh tương ứng. (2) Job CI frontend crash `TypeError: util.styleText is not a function`.

**Quyết định:**
- Thêm `frontend/vercel.json`: rewrite `/(.*)` -> `/index.html`. Dùng **rewrite, không redirect** (giữ nguyên URL); Vercel ưu tiên filesystem nên `/locales/*`, `/assets/*` không bị nuốt. File đặt ở `frontend/` vì Vercel Root Directory = `frontend`.
- CI: Node `18 -> 22` (ESLint 10 cần `^20.19 || ^22.13 || >=24`, `util.styleText` chỉ có từ Node 20.12), Go `1.21 -> 1.25`, `checkout@v3 -> v4`, `setup-node@v3 -> v4`, `setup-go@v4 -> v5`.
- Crash chỉ **che mất 34 lỗi lint thật** — chọn sửa hết thay vì hạ rule xuống `warn`.
  - 15 `any` -> `TFunction<ns>` cho hàm nhận `t`; `Area` (react-easy-crop) cho crop avatar; bỏ annotation `onError` để TanStack Query suy ra `Error`.
  - 9 `set-state-in-effect` -> derive lúc render, hoặc reset state bằng mount (`{isOpen && <Modal/>}`, `key={note.id}`) thay vì effect. Bỏ prop `isOpen` khỏi 3 modal.
  - `sanitizeFlat` chuyển `components/todo-editor.tsx` -> `utils/todo-utils.ts`; bỏ export `buttonVariants` (không ai dùng); xoá `'use client'` lạc giữa `lib/utils.ts`.

**Bug thật đào ra khi type hoá `any`:** 5 chỗ `onError` đọc `err?.response?.data?.message` — shape của **axios**, trong khi `lib/api.ts` dùng `fetch` và ném `Error` có message ở `err.message`. Toast lỗi shop/profile luôn rơi vào fallback, nuốt message BE (trái `CLAUDE.md` §4). Đã đổi sang `err.message`.

**File ảnh hưởng:** `frontend/vercel.json` (mới), `.github/workflows/ci.yml`, 20 file FE (`components/layout/header.tsx`, `components/ui/button.tsx`, `lib/utils.ts`, `pages/{focus,garden,profile,tasks}/**`).

**Trạng thái:** `npm run lint` 0 errors (còn 7 warning `exhaustive-deps` không chặn CI), `type-check` + `build` pass, backend `go build`/`go vet` sạch. **Chưa commit.**

**Còn treo:**
- CI chỉ chạy trên `main`/`develop` — nhánh feature không kích hoạt.
- `go fmt ./...` trong CI **không bao giờ fail** (ghi đè tại chỗ, exit 0). Muốn chặn thật phải đổi sang `test -z "$(gofmt -l .)"`.
- 7 warning `exhaustive-deps` ở timer focus + Pixi garden — sửa đụng logic, cần quyết riêng.

---

## [2026-08-07] Session 2: Nối Redis, đồng bộ SPEC, cấu hình deploy Fly.io

**Việc đã làm:**
1. **Redis** — `pkg/cache/redis.go` từ file rỗng -> client đầy đủ (JSON helper + rate limit). Thêm `internal/auth/ratelimit.go`, `response.TooManyRequests`, cache catalog shop.
2. **SPEC** — viết lại cả 4 file (`SPEC.md`, `SPEC-BE.md`, `SPEC-DB.md`, `SPEC-FE.md`) cho khớp code. Cập nhật `CLAUDE.md` mục 7 (Redis) + 8 (hiện trạng).
3. **Deploy** — thêm `backend/fly.toml`, `backend/Dockerfile`, `backend/.dockerignore`.

**Quyết định:**
- Rate limit: bảng policy **tập trung** ở `internal/auth/ratelimit.go` (không rải số vào từng `routes.go`) — hợp đồng 2 chiều với `SPEC-BE.md` §5. Nguyên tắc: thoáng khi đọc (`api_global` 300/phút), chặt khi ghi (submit/giveup/shop 10/phút, `name_change` 3/giờ).
- `RateLimitCheck` dùng pipeline `INCR` + `EXPIRE NX` + `PTTL` (1 round-trip), **khác toeic**: toeic set TTL khi `count == 1`, process chết giữa 2 lệnh sẽ để key không TTL và khoá user vĩnh viễn.
- Hỏng hóc: rate limit **fail-open**, cache **fail-soft**, kết nối lúc boot **fail-fast**.
- Cache: chỉ `cache:shop:items` (TTL 1h). Không cache dữ liệu theo user vì chưa có đường invalidate rõ ràng.
- `REDIS_URL` là **bắt buộc** -> không có Redis thì backend không boot.
- Config: CORS hardcode -> `CORS_ORIGIN`; `MaxConns = 10` hardcode -> `DB_MAX_CONNS`/`DB_MIN_CONNS`. Bổ sung graceful shutdown (15s).
- Fly region: **`nrt`** (Tokyo), **không** copy `sin` của toeic — Fly không có region Seoul, mà Supabase project này ở `ap-northeast-2` (Seoul). Tokyo ~30ms vs Singapore ~80ms.

**File ảnh hưởng:** `pkg/cache`, `pkg/config`, `pkg/db/postgres.go`, `pkg/response`, `internal/auth/ratelimit.go`, `cmd/server/{main,routes}.go`, `routes.go` của task/garden/profile/economy, `internal/economy/shop.go`, `backend/.env{,.example}`, `backend/{Dockerfile,fly.toml,.dockerignore}`, 4 file SPEC, `CLAUDE.md`.

**Trạng thái:** `go build` + `go vet` pass, cross-compile linux/amd64 OK (18.7MB). Chưa chạy thử với Redis thật, chưa deploy.

---

### ⚠️ CẠM BẪY SOI RA TRONG PHIÊN NÀY (chưa sửa — cần quyết)

Chi tiết đã ghi ở `CLAUDE.md` mục 8. Xếp theo mức độ chặn việc:

1. **Chưa seed `items`/`frames`** — reward roll sẽ tụt hết bậc, không rơi item nào. Chặn nhiều thứ nhất.
2. **Mâu thuẫn `is_purchasable`** — `GetRandomItemByRarity` lọc `is_purchasable = true`. Seed Epic/Legendary/Eternal là `false` đúng như thiết kế thì các bậc đó **không bao giờ rơi**. Cần tách cờ `is_droppable` hoặc bỏ điều kiện khỏi truy vấn thưởng.
3. **Penalty ăn cả đồ trong túi**, không chỉ đồ đã đặt trong vườn (chỉ trừ `on_market`); Legendary/Eternal miễn nhiễm. Khác hẳn mô tả SPEC cũ — đã sửa SPEC theo code, nhưng cần xác nhận đây là ý đồ.
4. **`reward_rolls.seed` luôn NULL** — `Grant()` không gán `RollResult.Seed`. Cột audit đang vô dụng; seed có `unix_nano` nên roll cũng không tái lập được.
5. **`010_economy_transactions.sql` dư dấu phẩy** sau `'slug_change',` -> `supabase db push` từ đầu sẽ fail. Không sửa vì là migration đã push.
6. **Dockerfile bắt buộc `COPY data ./data`** — `main.go` đọc `data/badwords.txt` bằng đường dẫn tương đối và `log.Fatalf` nếu thiếu. Bê Dockerfile toeic (chỉ copy binary) sang là crash loop.
7. **`.env` lọt vào Docker image** — `COPY . .` nuốt cả mật khẩu DB. Đã thêm `.dockerignore` cho focus-flow; **toeic đang dính lỗi này**, chưa sửa.
8. **`kill_timeout` phải đặt trước mọi `[section]`** trong fly.toml, nếu không TOML hiểu là key con của `[env]` và Fly bỏ qua im lặng.
9. ~~**CI dùng Go 1.21**~~ — đã sửa ở Session 3 (Go 1.25 + Node 22).
10. **`INVALID_STATE` bất nhất**: 400 ở `extend`/`title` nhưng 409 ở `reset`/`pause`/`resume`/`submit`/`giveup`.
11. **Query key FE thiếu `user?.id`** ở `garden`/`inventory`/`economy`/`profile` -> rò cache giữa 2 tài khoản trong cùng tab.
12. **`lib/api.ts` luôn gọi `res.json()`** -> endpoint trả 204 sẽ ném lỗi parse (hiện chưa endpoint nào dùng 204).
13. **`gofmt -l` báo 48 file** toàn repo do CRLF (có từ trước). CI chạy `go fmt ./...` sẽ rewrite hàng loạt.

**Bước tiếp theo đề xuất:** seed `items` -> chốt mục 2 và 3 -> chạy thử với Redis local -> deploy Fly.

---

## [2026-08-05] Session 1: Khởi tạo tài liệu vận hành

**Việc đã làm:** viết lại `README.md` (bản public, tiếng Anh, phục vụ portfolio) và tạo `CLAUDE.md` + file này.

**Chưa có quyết định kỹ thuật nào được thay đổi trong phiên này** — code không bị đụng tới.

**Nợ kỹ thuật đã ghi nhận (chi tiết ở `CLAUDE.md` mục 7):** CORS hardcode localhost; chưa có graceful shutdown; CI gọi `npm run type-check` không tồn tại; backend chưa có test; các module `session`/`social`/`ai`/`cronjob` còn là stub.

**Bước tiếp theo:** chốt hạng mục ưu tiên cho Phase 4 (Redis session cache + cronjob inactive penalty) hoặc dọn nợ kỹ thuật trước khi mở rộng tính năng.
