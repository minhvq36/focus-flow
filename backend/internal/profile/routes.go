package profile

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

func Routes(db *pgxpool.Pool, log *logger.Logger, economyMgr EconomyManager) func(r chi.Router) {
	// Khởi tạo các thành phần theo đúng pattern Dependency Injection
	repo := NewRepository(db, log)
	service := NewService(db, repo, economyMgr, log)
	handler := NewHandler(service, log)

	return func(r chi.Router) {
		r.Get("/", handler.GetProfile)
		r.Patch("/", handler.UpdateProfile)
		r.Post("/change-name", handler.ChangeDisplayName)
	}
}
