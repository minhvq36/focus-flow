package task

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Routes(db *pgxpool.Pool) func(r chi.Router) {
	repo := NewRepository(db)
	service := NewService(repo)
	handler := NewHandler(service)

	return func(r chi.Router) {
		// List all tasks for authenticated user
		r.Get("/", handler.GetUserTasks)
		// Create new task
		r.Post("/", handler.CreateTask)
		// Get task detail by ID
		r.Get("/{id}", handler.GetTaskByID)
	}
}
