package task

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Routes(db *pgxpool.Pool) func(r chi.Router) {
	service := NewService(db)
	handler := NewHandler(service)

	return func(r chi.Router) {
		r.Get("/", handler.GetUserTasks)
	}
}
