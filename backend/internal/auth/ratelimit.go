package auth

import (
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/minhvq36/focus-flow/backend/pkg/cache"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

// Policy — một nhóm rate limit. Nhiều route có thể dùng chung 1 Policy,
// khi đó chúng chia sẻ CHUNG một bucket (cùng key Redis).
type Policy struct {
	Action string        // định danh, đi vào key Redis
	Limit  int           // số request tối đa trong 1 cửa sổ
	Window time.Duration // độ dài cửa sổ
}

// ============================================================================
// BẢNG RATE LIMIT — HỢP ĐỒNG 2 CHIỀU VỚI `SPEC-BE.md` §6.
// Sửa ở đây thì phải sửa bảng trong SPEC-BE và ngược lại.
//
// Nguyên tắc: THOÁNG khi ĐỌC, CHẶT khi GHI.
//   - Đọc đi qua PolicyGlobal (lưới an toàn chung, rộng rãi).
//   - Ghi thì siết theo mức độ "đắt" của thao tác:
//     ghi 1 bảng < ghi nhiều bảng trong transaction < đụng tới ví tiền/RNG.
//
// ============================================================================
var (
	// Lưới an toàn cho MỌI request đã đăng nhập (chủ yếu chặn spam GET).
	PolicyGlobal = Policy{Action: "api_global", Limit: 300, Window: time.Minute}

	// --- TASK ---
	// Tạo task: đã có quota ngày ở DB (free 3 / pro 10 / premium 16),
	// limit này chỉ để chặn spam đâm vào trigger quota.
	PolicyTaskCreate = Policy{Action: "task_create", Limit: 20, Window: time.Minute}
	// Điều khiển timer (pause/resume/reset/extend): 1 UPDATE, user bấm bằng tay.
	PolicyTaskTimer = Policy{Action: "task_timer", Limit: 60, Window: time.Minute}
	// Sửa nội dung (todos/title): FE autosave debounce ~1s -> 60/phút là vừa đủ.
	PolicyTaskEdit = Policy{Action: "task_edit", Limit: 60, Window: time.Minute}
	// Toggle sao: thao tác UI nhanh, nhưng chỉ 1 UPDATE.
	PolicyTaskStar = Policy{Action: "task_star", Limit: 30, Window: time.Minute}
	// Submit: NẶNG NHẤT — 1 tx chạm tasks + reward_rolls + inventory +
	// user_wallets + economy_transactions, kèm RNG phần thưởng.
	PolicyTaskSubmit = Policy{Action: "task_submit", Limit: 10, Window: time.Minute}
	// Give-up: tx + penalty (xoá đồ khỏi vườn) khi penalty_mode bật.
	PolicyTaskGiveUp = Policy{Action: "task_giveup", Limit: 10, Window: time.Minute}
	// Ghi note: content tối đa 12000 ký tự, DB đã chặn 5 note/task.
	PolicyNoteWrite = Policy{Action: "note_write", Limit: 30, Window: time.Minute}

	// --- GARDEN ---
	// Đặt/gỡ đồ: tx có SELECT ... FOR UPDATE khoá cả user_garden -> ghi nhiều
	// đồng thời sẽ xếp hàng chờ nhau, cần siết để không giữ khoá quá lâu.
	PolicyGardenWrite = Policy{Action: "garden_write", Limit: 30, Window: time.Minute}

	// --- ECONOMY (đụng trực tiếp tới ví tiền) ---
	PolicyShopBuy  = Policy{Action: "shop_buy", Limit: 10, Window: time.Minute}
	PolicyShopSell = Policy{Action: "shop_sell", Limit: 10, Window: time.Minute}

	// --- PROFILE ---
	PolicyProfileUpdate = Policy{Action: "profile_update", Limit: 10, Window: time.Minute}
	// Đổi tên: 2 lần đầu miễn phí, sau đó tốn 20.000 silver -> hiếm, siết mạnh.
	PolicyNameChange = Policy{Action: "name_change", Limit: 3, Window: time.Hour}
)

// RateLimit — middleware fixed-window theo từng user, lưu ở Redis.
// Key: ratelimit:{action}:{user_id}. BẮT BUỘC mount SAU RequireAuth.
func RateLimit(c *cache.Cache, log *logger.Logger, p Policy) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := GetUserID(r.Context())
			if !ok {
				response.Unauthorized(w)
				return
			}

			key := fmt.Sprintf("ratelimit:%s:%s", p.Action, userID)
			res, err := c.RateLimitCheck(r.Context(), key, p.Limit, p.Window)
			if err != nil {
				// FAIL-OPEN: Redis chết không được phép chặn user submit task
				// (mất phần thưởng của cả phiên tập trung), nhưng phải thấy trong log.
				log.Error("[RATELIMIT] check failed, allowing request",
					"action", p.Action, "user_id", userID, "error", err.Error())
				next.ServeHTTP(w, r)
				return
			}

			if !res.Allowed {
				log.Warn("[RATELIMIT] blocked",
					"action", p.Action, "user_id", userID, "limit", p.Limit, "window", p.Window.String())
				response.TooManyRequests(w, int(math.Ceil(res.RetryAfter.Seconds())))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
