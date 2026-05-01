package task

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

func Routes(db *pgxpool.Pool, log *logger.Logger) func(r chi.Router) {
	repo := NewRepository(db, log)
	service := NewService(repo, log)
	handler := NewHandler(service, log)

	return func(r chi.Router) {
		// List all tasks for authenticated user
		r.Get("/", handler.GetUserTasks)
		// Create new task
		r.Post("/", handler.CreateTask)
		// Get task detail by ID
		r.Get("/{id}", handler.GetTaskByID)
		// Update todos for a task (autosave)
		r.Patch("/{id}/todos", handler.UpdateTodos)
		// Pause a task
		r.Post("/{id}/pause", handler.PauseTask)
	}
}
