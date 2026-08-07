package garden

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/cache"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

func Routes(db *pgxpool.Pool, c *cache.Cache, log *logger.Logger) func(r chi.Router) {
	repo := NewRepository(db, log)
	service := NewService(db, repo, log)
	handler := NewHandler(service, log)

	// Đặt/gỡ đồ đều khoá user_garden bằng SELECT ... FOR UPDATE -> dùng chung
	// 1 bucket để user không thể vừa spam đặt vừa spam gỡ.
	rlWrite := auth.RateLimit(c, log, auth.PolicyGardenWrite)

	return func(r chi.Router) {
		r.Get("/", handler.GetGardenList)
		r.Get("/{id}", handler.GetGardenByID)

		r.With(rlWrite).Post("/{id}/placements", handler.PlaceItem)
		r.With(rlWrite).Post("/{id}/placements/batch", handler.PlaceItemsBatch)
		r.With(rlWrite).Delete("/{id}/placements", handler.RemoveItemsBatch)
	}
}
