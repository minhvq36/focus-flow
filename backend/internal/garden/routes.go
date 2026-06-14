package garden

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

func Routes(db *pgxpool.Pool, log *logger.Logger) func(r chi.Router) {
	repo := NewRepository(db, log)
	service := NewService(db, repo, log)
	handler := NewHandler(service, log)

	return func(r chi.Router) {
		r.Get("/", handler.GetGardenList)
		r.Get("/{id}", handler.GetGardenByID)
		r.Post("/{id}/placements", handler.PlaceItem)
		r.Post("/{id}/placements/batch", handler.PlaceItemsBatch)
	}
}
