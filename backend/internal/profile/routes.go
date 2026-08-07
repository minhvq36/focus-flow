package profile

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/cache"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/profanity"
)

func Routes(db *pgxpool.Pool, c *cache.Cache, log *logger.Logger, economyMgr EconomyManager, pf *profanity.Filter) func(r chi.Router) {
	// Khởi tạo các thành phần theo đúng pattern Dependency Injection
	repo := NewRepository(db, log)
	service := NewService(db, repo, economyMgr, pf, log)
	handler := NewHandler(service, log)

	rlUpdate := auth.RateLimit(c, log, auth.PolicyProfileUpdate)
	rlNameChange := auth.RateLimit(c, log, auth.PolicyNameChange)

	return func(r chi.Router) {
		r.Get("/", handler.GetProfile)
		r.Get("/private", handler.GetUserPrivate)

		r.With(rlUpdate).Patch("/bio", handler.UpdateBio)
		r.With(rlUpdate).Patch("/avatar-url", handler.UpdateAvatarURL)
		// Đổi tên có thể trừ tiền (lần 3 trở đi) -> bucket riêng, siết theo giờ
		r.With(rlNameChange).Post("/change-name", handler.ChangeDisplayName)
	}
}
