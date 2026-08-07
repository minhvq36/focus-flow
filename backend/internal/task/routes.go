package task

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/internal/reward"
	"github.com/minhvq36/focus-flow/backend/pkg/cache"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

func Routes(db *pgxpool.Pool, c *cache.Cache, log *logger.Logger, economyAuditor EconomyAuditor) func(r chi.Router) {
	rewardRepo := reward.NewRepository(db, log)
	rewarder := reward.NewRewarder(db, rewardRepo, log)

	repo := NewRepository(db, log)
	service := NewService(db, repo, rewarder, economyAuditor, log)
	handler := NewHandler(service, log)

	// Rate limit — xem bảng ở internal/auth/ratelimit.go và SPEC-BE §6
	rlCreate := auth.RateLimit(c, log, auth.PolicyTaskCreate)
	rlTimer := auth.RateLimit(c, log, auth.PolicyTaskTimer)
	rlEdit := auth.RateLimit(c, log, auth.PolicyTaskEdit)
	rlStar := auth.RateLimit(c, log, auth.PolicyTaskStar)
	rlSubmit := auth.RateLimit(c, log, auth.PolicyTaskSubmit)
	rlGiveUp := auth.RateLimit(c, log, auth.PolicyTaskGiveUp)
	rlNote := auth.RateLimit(c, log, auth.PolicyNoteWrite)

	return func(r chi.Router) {
		// --- ĐỌC: chỉ chịu PolicyGlobal ở tầng trên ---
		r.Get("/", handler.GetUserTasks)
		r.Get("/quota/today", handler.GetQuotaToday)
		r.Get("/{id}", handler.GetTaskByID)
		r.Get("/{id}/notes", handler.GetNotes)

		// --- GHI ---
		r.With(rlCreate).Post("/", handler.CreateTask)

		r.With(rlEdit).Patch("/{id}/todos", handler.UpdateTodos)
		r.With(rlEdit).Patch("/{id}/title", handler.EditTaskTitle)

		r.With(rlTimer).Post("/{id}/extend", handler.ExtendTask)
		r.With(rlTimer).Post("/{id}/reset", handler.ResetTask)
		r.With(rlTimer).Post("/{id}/pause", handler.PauseTask)
		r.With(rlTimer).Post("/{id}/resume", handler.ResumeTask)

		r.With(rlStar).Post("/{id}/star", handler.ToggleStar)

		// Submit/give-up: transaction đa bảng + RNG phần thưởng -> siết chặt nhất
		r.With(rlSubmit).Post("/{id}/submit", handler.SubmitTask)
		r.With(rlGiveUp).Post("/{id}/giveup", handler.GiveUpTask)

		r.With(rlNote).Post("/{id}/notes", handler.CreateNote)
		r.With(rlNote).Patch("/{id}/notes/{nid}", handler.UpdateNote)
		r.With(rlNote).Delete("/{id}/notes/{nid}", handler.DeleteNote)
	}
}
