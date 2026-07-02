package profile

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/profanity"
)

func Routes(db *pgxpool.Pool, log *logger.Logger, economyMgr EconomyManager, pf *profanity.Filter) func(r chi.Router) {
	// Khởi tạo các thành phần theo đúng pattern Dependency Injection
	repo := NewRepository(db, log)
	service := NewService(db, repo, economyMgr, pf, log)
	handler := NewHandler(service, log)

	return func(r chi.Router) {
		r.Get("/", handler.GetProfile)
		r.Get("/private", handler.GetUserPrivate)
		r.Patch("/bio", handler.UpdateBio)
		r.Patch("/avatar-url", handler.UpdateAvatarURL)
		r.Post("/change-name", handler.ChangeDisplayName)
	}
}
