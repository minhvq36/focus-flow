# SPEC-FE.md — FocusFlow Frontend Specification

> React 19 + TypeScript + Vite. Màn hình, state, quy ước gọi API.
>
> ✅ = đã chạy · 🚧 = có file nhưng chưa hoàn chỉnh · ⬜ = PLANNED, chưa có code.

---

## 1. Tech stack (theo `frontend/package.json`)

| Nhóm | Thư viện |
|---|---|
| Framework | **React 19.2**, TypeScript ~6.0, Vite 8 |
| Router | `react-router-dom` v7 |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`), `tw-animate-css`, `next-themes` |
| UI primitive | `radix-ui` + shadcn (`src/components/ui/`), icon `lucide-react` |
| Server state | **TanStack Query v5** |
| Client state | **Zustand v5** (2 store: `user-store`, `placement-store`) |
| Form | `react-hook-form` + `zod` + `@hookform/resolvers` |
| Canvas vườn | **PixiJS 8** |
| Auth/Storage | `@supabase/supabase-js` |
| i18n | `i18next` + `react-i18next` + http-backend + language-detector |
| Toast | `sonner` |
| Khác | `react-easy-crop` (cắt avatar), `@fontsource-variable/geist` |

**Chưa dùng:** Framer Motion, Chart.js/D3, Stripe, Supabase Realtime.

---

## 2. Cấu trúc thư mục thực tế

```
/src
  App.tsx                  ✅ QueryClientProvider + Router + Toaster + TooltipProvider
  main.tsx                 ✅ restoreSession() trước khi render
  index.css                ✅ Tailwind v4 + theme token

  /pages
    /landing   index.tsx + components/                     ✅ trang công khai `/`
    /login /register /forgot-password /reset-password   ✅ auth
    /tasks     index.tsx + components/ + hooks/ + utils/  ✅
    /focus     index.tsx + components/ + hooks/           ✅
    /garden    index.tsx + components/ + hooks/ + utils/  ✅
    /profile   index.tsx + components/ + hooks/           ✅

  /components
    /auth      login/register/forgot/reset form, password-input,
               google-button, turnstile-widget, protected-route,
               guest-route                                        ✅
    /layout    app-layout, auth-layout, task-layout, header,
               sidebar, background-curves, route-suspense,
               language-switcher                                  ✅
    /ui        shadcn primitive (alert, alert-dialog, avatar, button,
               dialog, dropdown-menu, image-with-fallback, input,
               separator, sonner, switch, tooltip)                ✅

  /hooks       use-language.ts                                    ✅
  /i18n        config.ts, index.ts                                ✅
  /lib         api.ts, supabase.ts, storage.ts, turnstile.ts, utils.ts ✅
  /store       user-store.ts, placement-store.ts                  ✅
  /types       task.ts, garden.ts, inventory.ts, economy.ts, profile.ts ✅
  /constants   assets.ts                                          ✅
```

**Chưa có** (SPEC cũ từng liệt kê): `/pages/dashboard`, `/shop`, `/marketplace`,
`/leaderboard`, `/social`, `/search`, `/settings`, `/onboarding`, `/public`,
`lib/stripe.ts`, `lib/animations.ts`, `store/task-store`, `store/garden-store`,
`store/economy-store`, `store/social-store`. Shop là **modal trong trang Garden**,
không phải trang riêng.

### Quy ước cấu trúc
Mỗi màn hình = `pages/<page>/index.tsx` + `components/` + `hooks/` + `utils/`
cục bộ. Chỉ nâng lên `src/components/` khi dùng ở **≥ 2 page**. Primitive shadcn
để nguyên trong `components/ui/`.

---

## 3. Routing (`App.tsx`)

| Route | Guard | Layout | Component | Ghi chú |
|---|---|---|---|---|
| `/` | `GuestRoute` | không layout | `Landing` (lazy) | **Chưa có session thì ở lại landing, KHÔNG redirect.** Có session → `/garden` |
| `/login` `/register` `/forgot-password` `/reset-password` | — | `AuthLayout` | eager | `/reset-password` **nằm ngoài** `ProtectedRoute` để link recovery hỏng vẫn hiện được thông báo |
| `/tasks` | `ProtectedRoute` | `TaskLayout` | `Tasks` (lazy) | |
| `/garden` | `ProtectedRoute` | `AppLayout` | `Garden` (lazy) | Đích mặc định sau khi đăng nhập |
| `/profile/me` | `ProtectedRoute` | `AppLayout` | `MePage` (lazy) | |
| `/focus/:taskId` | `ProtectedRoute` | không layout | `Focus` (lazy) trong `RouteSuspense` | |
| `*` | — | — | → redirect `/` | `/` tự phân nhánh tiếp theo trạng thái session |

**Hai guard đối xứng nhau** (`components/auth/`):

| | Chưa có session | Có session | Đang `loading` |
|---|---|---|---|
| `ProtectedRoute` | → `/login` | render `<Outlet />` | spinner |
| `GuestRoute` | render `<Outlet />` | → `/garden` | spinner |

`GuestRoute` **cố ý chỉ bọc `/`**, không bọc `/login` `/register`
`/reset-password`: luồng recovery cần vào được `/reset-password` ngay cả khi
Supabase vừa dựng session từ link, bọc vào sẽ đá user đi trước khi kịp đổi mật khẩu.

**Đăng xuất** (`user-store.logout()` gọi từ menu avatar trên header):
`supabase.auth.signOut()` → xoá session khỏi localStorage + `clearRecoveryPending()`
→ `set({ user: null })` → điều hướng `/` (`replace`) → `queryClient.clear()`.
Bắt buộc clear cache vì query key hiện chưa gắn `user.id` (§5.1) — không clear thì
tài khoản đăng nhập sau trong cùng tab sẽ đọc trúng dữ liệu của người trước.

**Code splitting:** các trang sau đăng nhập đều `lazy()` để chunk khởi động không
kéo theo PixiJS (~1MB, Garden) và `react-easy-crop` (Profile). Landing cũng `lazy()`
theo chiều ngược lại — người đã đăng nhập không bao giờ thấy nó. Fallback spinner
nằm trong `<RouteSuspense>` quanh `<Outlet />` của từng layout.

> Garden không nhận `:index` trên URL — trang tự chọn vườn và nhớ vườn cuối bằng
> `localStorage['last_garden_id']`. Key này **dùng chung cho mọi tài khoản** trong
> cùng trình duyệt, nên `pages/garden/index.tsx` **bắt buộc đối chiếu giá trị đọc
> ra với `useGardenList()`** trước khi dùng; id lạ thì bỏ và rơi về vườn mặc định.
> Bỏ bước này thì tài khoản đăng nhập sau đọc trúng `user_garden_id` của người
> trước → `GET /api/garden/:id` (lọc theo `user_id`) trả 404 → màn hình trống trơn.

---

## 4. Gọi API — `lib/api.ts`

```ts
api.get<T>(path)          api.post<T>(path, body)
api.patch<T>(path, body)  api.delete<T>(path, body?)
```

- Tự lấy `access_token` từ `supabase.auth.getSession()` và gắn `Bearer`.
- Tự bóc `data` khỏi wrapper `{ success, data, error }`.
- Lỗi → ném `Error` có gắn thêm `status` (number) và `code` (string) từ BE.
- **Cấm `fetch` trực tiếp trong component.**

Base URL: `import.meta.env.VITE_API_URL ?? 'http://localhost:8080'`.

### Xử lý lỗi ở UI
Toast lỗi phải hiển thị `message` từ BE, không nuốt thành "Có lỗi xảy ra".
Với **429** (`code === 'RATE_LIMITED'`) BE trả kèm header `Retry-After` (giây)
— CORS đã expose header này.

**Cạm bẫy đã biết:** `request()` luôn gọi `res.json()`, nên endpoint trả **204
No Content** sẽ ném lỗi parse. Hiện chưa endpoint nào dùng 204 nên chưa lộ.

---

## 5. Server state — TanStack Query

`new QueryClient()` mặc định (chưa cấu hình `defaultOptions`), tức `staleTime = 0`
nếu hook không tự khai báo.

### 5.1 Bảng query key thực tế

| Key | Hook | staleTime |
|---|---|---|
| `['tasks', dateRange, statusKey[], user?.id]` | `useTasks` | 0, hoặc **2 phút** khi filter là lịch sử (không phải `today`) và không lọc `active` |
| `['quota','today', user?.id]` | `useTasks` | 0 + refetch on mount/focus |
| `['task', taskId, user?.id]` | `useTaskDetail` | 0, `refetchOnMount: 'always'` |
| `['task-notes', taskId, user?.id]` | `useTaskNotes` | mặc định |
| `['garden']` | `useGardenList` | mặc định |
| `['garden', id]` | `useGarden` | 3 phút |
| `['inventory','bag']` | `useInventoryBag` | 3 phút |
| `['economy','wallet']` | `useWallet` | mặc định |
| `['economy','shop-buy']` | `useShopItems` | mặc định (BE đã cache Redis 1h) |
| `['economy','shop-sell']` | `useSellableItems` | mặc định |
| `['profile','me']` | `useProfile` | mặc định |
| `['profile','private']` | `useUserPrivate` | mặc định |

> ⚠️ **Nợ kỹ thuật:** chỉ nhóm key của task mới kèm `user?.id`. Các key
> `garden` / `inventory` / `economy` / `profile` **thiếu `user?.id`** → đăng
> xuất rồi đăng nhập tài khoản khác trong cùng tab có thể thấy cache của tài
> khoản trước. Cần bổ sung; đây là ngoại lệ đang tồn tại, không phải chuẩn.

### 5.2 Invalidate theo USE-CASE

Tự hỏi *"user vừa làm X xong sẽ nhìn màn nào, màn đó cache gì?"*, không rà theo code.

| Hành động | Invalidate |
|---|---|
| Tạo task | `tasks` + `quota` (kèm **optimistic update** quota, rollback trong `onError`) |
| Pause/resume/reset/extend/đổi title/toggle sao | `task` + `tasks` + `quota` + `economy/wallet` |
| Submit / give-up | như trên (ví đổi vì thưởng silver) |
| Autosave todos | **không invalidate** — optimistic local, debounce ở component |
| CRUD note | `task-notes` của đúng task |
| Mua / bán shop | `economy/wallet` + `economy/shop-sell` + `inventory/bag`, đồng thời `clearPlacement()` |
| Đặt / gỡ đồ trong vườn | do `pages/garden/index.tsx` điều phối (rollback + refetch), không nằm trong hook |
| Đổi tên | `profile/me` + `profile/private` + `economy/wallet` |
| Sửa bio / avatar | `setQueryData(['profile','me'])` trực tiếp, không invalidate |

---

## 6. Client state — Zustand

Tách store theo miền, **không gộp một store khổng lồ**. State chỉ thuộc 1 màn
hình thì để `useState`, đừng đẩy lên global.

### `user-store.ts` ✅
```ts
{ user: User | null; loading: boolean;
  setUser(user); restoreSession(); logout() }
```
`restoreSession()` được gọi **một lần trong `main.tsx` trước khi render**, đồng
thời đăng ký `supabase.auth.onAuthStateChange`. Hết phiên thì xoá cờ recovery.
`logout()` chỉ lo phần session (signOut + xoá cờ + `user = null`); việc điều hướng
và `queryClient.clear()` do phía gọi (menu avatar) đảm nhiệm — xem §3.

### `placement-store.ts` ✅ (chỉ dùng cho Garden)
```ts
{ activeItem: InBagItem | null; rotation: 0|90|180|270;
  activeTool: 'cursor' | 'shovel';
  setActiveItem(item); rotateItem(); clearPlacement(); setTool(tool);
  consumeActiveItem(); restoreActiveItem(item) }
```
- `consumeActiveItem()` cắt `instance_ids[0]` và giảm `quantity` **ngay lúc click**
  để user đặt liên tiếp nhiều cái mà không phải chờ API.
- `restoreActiveItem()` là đường **rollback** khi API từ chối.
- Chọn `shovel` sẽ tự bỏ item đang cầm.

**Không có** task-store / garden-store / economy-store / social-store — dữ liệu
server do TanStack Query giữ.

---

## 7. Các màn hình

### 7.0 Landing ✅ (`/`)
`pages/landing/index.tsx` + `components/`: `landing-header`, `hero-section`,
`features-section`, `how-section`, `cta-section`, `landing-footer`.

- Trang **công khai**, không gọi API nào — chỉ đọc i18n. Người đã đăng nhập không
  thấy trang này (xem `GuestRoute`, §3).
- Header landing: logo trái · `LanguageSwitcher` + **Sign in** + **Get started**
  (→ `/register`) ở góc phải trên.

  **`fixed` chứ không `sticky`, và đổi hình dạng theo vị trí cuộn:**
  | | Nền | Viền |
  |---|---|---|
  | `scrollY ≤ 24` (đang trên hero) | trong suốt | trong suốt |
  | `scrollY > 24` | `bg-background/80` + `backdrop-blur-lg` | `border-border/60` + shadow |

  `fixed` là để header nằm ngoài luồng → hero bắt đầu từ `y=0`, ảnh tràn hết viền
  trên thay vì bị đẩy xuống 64 px. Đổi lại header sẽ đè lên nội dung khi cuộn nên
  **bắt buộc** phải có trạng thái "đã cuộn" đục nền, nếu không chữ chồng chữ.
  Hero tự chừa `pt-28`; các section dùng `scroll-mt-16` để anchor không chui
  xuống dưới header.
- Ảnh nền hero: `public/landing.jpg` (đã resize còn **1920×1081 / ~228 KB**, gốc
  3840×2162 / 1.79 MB). Cách phủ: **giữ nguyên ảnh, chồng lên một GRADIENT**
  `from-background/45 via-background/70 to-background/88` — nhạt ở trên cho mây
  và núi giữ được độ hùng vĩ, đậm dần xuống dải giữa nơi có tiêu đề — cộng một
  dải `from-transparent to-background` ở đáy để tan vào nền trang. Không hạ
  `opacity` của chính tấm ảnh: làm vậy ảnh xỉn và lớp phủ không đổi theo theme.
- Neo cuộn nội bộ: `#features`, `#how` (dùng ở CTA phụ của hero và ở footer).

### 7.1 Auth ✅ (`/login`, `/register`, `/forgot-password`, `/reset-password`)
- Email/password + Google OAuth (`google-button.tsx`).
- Cloudflare Turnstile (`turnstile-widget.tsx`, `lib/turnstile.ts`).
- `protected-route.tsx` chặn route riêng tư khi chưa có session.
- `/reset-password` cố tình để ngoài vùng bảo vệ (xem §3).

### 7.2 Tasks ✅ (`/tasks`)
`index.tsx` + `task-list`, `task-card`, `task-sidebar`, `filter-panel`,
`create-task-modal`, `todo-editor`; utils `todo-utils.ts`, `text-constraints.ts`.

- Bộ lọc: `date` (`today|yesterday|7days|30days`) + tập trạng thái. Chọn đủ 4
  trạng thái thì **không gửi** param `status`.
- Hiển thị quota `used/limit` với optimistic update lúc tạo task.
- Chưa phân trang — trường hợp xấu nhất (Premium, 30 ngày) là 480 task, tạm chấp nhận.
- Không có "mini garden preview" như SPEC cũ mô tả.

### 7.3 Focus ✅ (`/focus/:taskId`)
`timer-ring`, `todos-panel`, `notes-bar`, `note-edit-dialog`, `editable-title`,
`extend-time`, `action-bar`; hook `use-task-detail`, `use-task-notes`.

**Quy tắc timer — không được tự phát minh cách tính:**
nguồn chân lý là `actual_duration_sec + (NOW() − started_at)` khi
`started_at != null`. Client chỉ **derive** để hiển thị, không đẩy elapsed tự
tính lên như dữ liệu tin cậy. Mount lại thì đọc lại từ server
(`refetchOnMount: 'always'`, `staleTime: 0`).

**Todos:** chỉnh sửa cục bộ tức thì → debounce (~1s idle) → `PATCH /todos`.
Mutation này cố ý **không invalidate** để không nhảy UI khi đang gõ.

**Notes:** CRUD đầy đủ (DB chặn tối đa 5 note/task, mỗi note ≤ 12000 ký tự).
Note **không** phải append-only.

**Hành động:** pause/resume, extend, reset, toggle sao, submit, give-up.

### 7.4 Garden ✅ (`/garden`)
`garden-tabs`, `garden-toolbar`, `garden-tooltip`, `tile-popup`,
`inventory-modal`, `shop-modal`, `recenter-button`, `loading-overlay`;
utils `garden-app.ts`, `garden-grid.ts`, `isometric.ts`, `shadow.ts`.

**Quy tắc PixiJS (bắt buộc):** toàn bộ logic render/toạ độ nằm trong
`pages/garden/utils/`. **Không trộn code Pixi vào component React** — component
chỉ dựng container và truyền dữ liệu xuống. Mọi `Application`/texture/listener
tạo ra phải `destroy()` trong cleanup của `useEffect`; rò rỉ ở đây gây tụt FPS
rất khó truy.

**Luồng đặt đồ:** chọn item trong `inventory-modal` → `setActiveItem` → click ô
lưới → `consumeActiveItem()` (optimistic) → gọi batch API → thất bại thì
`restoreActiveItem()`. Xoay bằng `rotateItem()` (bước 90°). Công cụ `shovel`
để gỡ đồ.

**Batch trả kết quả từng phần:** toast phân 3 nhánh — hỏng hết, hỏng một phần,
hoặc thành công (im lặng).

**Shop nằm trong `shop-modal.tsx`**, dùng `use-economy.ts` (wallet, tab mua,
tab bán). Không có trang `/shop`.

**Chưa có:** mở rộng vườn, mở khoá vườn tiếp theo, tưới cây, xem vườn người khác.

### 7.5 Profile ✅ (`/profile/me`)
`profile-header`, `profile-stats`, `garden-preview`, `frame-selector`,
`avatar-crop-modal`, `change-name-modal`; hook `use-profile`, `use-profile-update`.

- Sửa bio, đổi avatar (crop → upload Supabase Storage `users/{uid}/avatar.webp`
  → `PATCH /api/profile/avatar-url`).
- Đổi tên: modal cảnh báo phí 20.000 silver từ lần thứ 3
  (`user_private.name_change_count`).
- `frame-selector` là **UI đi trước backend** — chưa có endpoint frames.

### 7.6 Header ứng dụng ✅ (`components/layout/header.tsx`)
Dùng chung cho `AppLayout` và `TaskLayout`: logo · tab Garden/Tasks · đồng hồ UTC ·
`LanguageSwitcher` · số dư ví · **menu avatar**.

- Avatar đọc `useProfile()` — **cùng query key `['profile','me']`** với trang
  Profile, nên `setQueryData` sau khi đổi ảnh ở đó làm header đổi ngay, không cần
  refetch. `uploadUserImage` đã gắn `?t=<timestamp>` vào URL nên trình duyệt cũng
  không giữ ảnh cũ. Fallback là chữ cái đầu của `display_name` (hoặc email).
- **Vầng hào quang vàng bật cho MỌI tài khoản**, không gắn với gói cước: ring
  `ring-amber-400/90` + `ring-offset-transparent` (để khe hở lộ chính vầng sáng
  thay vì trám nền đục lên header) + `shadow` glow, và một lớp radial-gradient
  blur thở nhẹ bằng animation `animate-avatar-halo` (token `--animate-avatar-halo`
  khai trong `index.css`, tự tắt dưới `prefers-reduced-motion: reduce`).
- Dropdown 2 mục: **My profile** → `/profile/me` · **Log out** (xem luồng ở §3).

### 7.7 Chưa làm ⬜
Onboarding, Settings, Marketplace, Leaderboard, Social/Feed, Search,
public garden view, thanh toán/nâng cấp gói.

---

## 8. i18n

- 2 ngôn ngữ: `en` (mặc định + fallback), `vi`.
- Namespace: `common`, `auth`, `garden`, `tasks`, `focus`, `landing`. Preload `common`.
- `common.menu.*` phục vụ menu avatar trên header; `landing.*` phục vụ trang `/`.
- Nguồn: `/locales/{{lng}}/{{ns}}.json` (http-backend), phát hiện theo
  `localStorage` → `navigator`, lưu ở key `focusflow_lang`.
- **Không hardcode chuỗi hiển thị.** Thêm key phải thêm ở **cả 2 ngôn ngữ** —
  thiếu một bên coi như lỗi.

---

## 9. TypeScript

- **Cấm `any`.** Type dùng chung khai báo ở `src/types/*.ts` và phải khớp
  response BE: `task.ts`, `garden.ts`, `inventory.ts`, `economy.ts`, `profile.ts`.
- Đổi contract BE → **sửa type trước**, để TypeScript chỉ ra chỗ vỡ.
- `npm run type-check` (`tsc -b`) chạy trong CI.

---

## 10. Toast (sonner)

`<Toaster richColors />` đặt ở `App.tsx`.
- Thành công: ngắn gọn.
- Lỗi: **phải** hiện `message` từ BE.
- Batch garden: hỏng hết → `toast.error`; hỏng một phần → `toast.warning` kèm
  số lượng.

---

## 11. Việc còn nợ

- [ ] Bổ sung `user?.id` vào query key của garden/inventory/economy/profile (§5.1).
- [ ] `lib/api.ts` chưa xử lý response 204.
- [ ] Chưa có xử lý riêng cho 429 (đọc `Retry-After` để hiện đếm ngược).
- [ ] Chưa có ErrorBoundary.
- [ ] Chưa có test nào (unit/E2E).
- [ ] Chưa có PWA/service worker.
