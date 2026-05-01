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
		r.Get("/", handler.GetUserTasks)
		r.Post("/", handler.CreateTask)
		r.Get("/{id}", handler.GetTaskByID)
		// Update todos for a task (autosave)
		r.Patch("/{id}/todos", handler.UpdateTodos)
		r.Post("/{id}/pause", handler.PauseTask)
		r.Post("/{id}/submit", handler.SubmitTask)
		r.Post("/{id}/giveup", handler.GiveUpTask)
		r.Post("/{id}/resume", handler.ResumeTask)
	}
}
