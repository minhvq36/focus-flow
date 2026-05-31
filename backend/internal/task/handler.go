package task

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/internal/reward"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/request"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

type ServiceInterface interface {
	GetUserTasks(ctx context.Context, userID string, filter TaskFilter) ([]TaskSummary, error)
	GetTaskByID(ctx context.Context, taskID, userID string) (*Task, error)
	CreateTask(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error)
	UpdateTodos(ctx context.Context, taskID, userID string, req UpdateTodosRequest) error
	EditTaskTitle(ctx context.Context, taskID, userID string, req EditTaskTitleRequest) error
	ExtendTask(ctx context.Context, taskID, userID string, req ExtendRequest) error
	ResetTask(ctx context.Context, taskID, userID string) error
	PauseTask(ctx context.Context, taskID, userID string) error
	SubmitTask(ctx context.Context, taskID, userID string) (*SubmitResult, error)
	GiveUpTask(ctx context.Context, taskID, userID string) (*reward.PenaltyResult, error)
	ResumeTask(ctx context.Context, taskID, userID string) error
	CreateNote(ctx context.Context, taskID, userID string, req CreateTaskNoteRequest) (*TaskNote, error)
	GetNotes(ctx context.Context, taskID, userID string) ([]*TaskNote, error)
	UpdateNote(ctx context.Context, noteID, userID, taskID string, req UpdateTaskNoteRequest) (*TaskNote, error)
	DeleteNote(ctx context.Context, noteID, userID, taskID string) error
	GetQuotaToday(ctx context.Context, userID string) (*QuotaToday, error)
}

type Handler struct {
	service ServiceInterface
	log     *logger.Logger
}

func NewHandler(service ServiceInterface, log *logger.Logger) *Handler {
	return &Handler{
		service: service,
		log:     log,
	}
}

// For fallback
var validDateRanges = map[string]bool{
	"today": true, "yesterday": true, "7days": true, "30days": true,
}
var validStatuses = map[string]bool{
	"active": true, "paused": true, "submitted": true, "given_up": true,
}

func (h *Handler) GetUserTasks(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	// ── Parse date range ──────────────────────────────────────────────────────
	dateRange := r.URL.Query().Get("date")
	if dateRange == "" || !validDateRanges[dateRange] {
		dateRange = "today" // default
	}

	// ── Parse status filter ───────────────────────────────────────────────────
	var statuses []string
	if raw := r.URL.Query().Get("status"); raw != "" {
		for _, s := range strings.Split(raw, ",") {
			s = strings.TrimSpace(s)
			if validStatuses[s] {
				statuses = append(statuses, s)
			}
		}
	}
	// statuses empty = all (no filter applied in repo)

	filter := TaskFilter{
		DateRange: dateRange,
		Statuses:  statuses,
	}

	h.log.Info("GetUserTasks", "user_id", userID, "filter", filter)

	tasks, err := h.service.GetUserTasks(r.Context(), userID, filter)
	if err != nil {
		h.log.Error("GetUserTasks failed", "user_id", userID, "error", err.Error())
		response.InternalError(w)
		return
	}

	response.Success(w, tasks)
}

func (h *Handler) GetTaskByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	h.log.Info("GetTaskByID", "user_id", userID, "task_id", taskID)
	task, err := h.service.GetTaskByID(r.Context(), taskID, userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		default:
			h.log.Error("GetTaskByID failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, task)
}

func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	var req CreateTaskRequest
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	h.log.Info("CreateTask", "user_id", userID, "title", req.Title)
	task, err := h.service.CreateTask(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrQuotaExceeded):
			response.Conflict(w, "QUOTA_EXCEEDED", err.Error())
		default:
			h.log.Error("CreateTask failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Created(w, task)
}

func (h *Handler) UpdateTodos(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	var req UpdateTodosRequest
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	h.log.Info("UpdateTodos", "user_id", userID, "task_id", taskID)
	err := h.service.UpdateTodos(r.Context(), taskID, userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		default:
			h.log.Error("UpdateTodos failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, map[string]string{"message": "Todos updated successfully"})
}

func (h *Handler) EditTaskTitle(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	var req EditTaskTitleRequest
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	h.log.Info("EditTaskTitle", "user_id", userID, "task_id", taskID)
	err := h.service.EditTaskTitle(r.Context(), taskID, userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrInvalidState):
			response.BadRequest(w, "INVALID_STATE", err.Error())
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		default:
			h.log.Error("EditTaskTitle failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, map[string]string{"message": "Task title updated successfully"})
}

func (h *Handler) ExtendTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	var req ExtendRequest
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	h.log.Info("ExtendTask", "user_id", userID, "task_id", taskID)
	err := h.service.ExtendTask(r.Context(), taskID, userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrInvalidState):
			response.BadRequest(w, "INVALID_STATE", err.Error())
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		default:
			h.log.Error("ExtendTask failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, map[string]string{"message": "Task time extended successfully"})
}

func (h *Handler) ResetTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	h.log.Info("ResetTask", "user_id", userID, "task_id", taskID)
	err := h.service.ResetTask(r.Context(), taskID, userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		case errors.Is(err, apperr.ErrInvalidState):
			response.Conflict(w, "INVALID_STATE", err.Error())
		default:
			h.log.Error("ResetTask failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, map[string]string{"message": "Task time reset successfully"})
}

// TODO: Check SSE to redirect all active task open when task stopped
func (h *Handler) PauseTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	h.log.Info("PauseTask", "user_id", userID, "task_id", taskID)
	err := h.service.PauseTask(r.Context(), taskID, userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		case errors.Is(err, apperr.ErrInvalidState):
			response.Conflict(w, "INVALID_STATE", err.Error())
		default:
			h.log.Error("PauseTask failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, map[string]string{"message": "Task paused successfully"})
}

func (h *Handler) SubmitTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	h.log.Info("SubmitTask", "user_id", userID, "task_id", taskID)
	result, err := h.service.SubmitTask(r.Context(), taskID, userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		case errors.Is(err, apperr.ErrInvalidState):
			response.Conflict(w, "INVALID_STATE", err.Error())
		default:
			h.log.Error("SubmitTask failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, result)
}

func (h *Handler) GiveUpTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	h.log.Info("GiveUpTask", "user_id", userID, "task_id", taskID)
	result, err := h.service.GiveUpTask(r.Context(), taskID, userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		case errors.Is(err, apperr.ErrInvalidState):
			response.Conflict(w, "INVALID_STATE", err.Error())
		default:
			h.log.Error("GiveUpTask failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, result)
}

func (h *Handler) ResumeTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	h.log.Info("ResumeTask", "user_id", userID, "task_id", taskID)
	err := h.service.ResumeTask(r.Context(), taskID, userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		case errors.Is(err, apperr.ErrInvalidState):
			response.Conflict(w, "INVALID_STATE", err.Error())
		default:
			h.log.Error("ResumeTask failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, map[string]string{"message": "Task resumed successfully"})
}

func (h *Handler) GetNotes(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	h.log.Info("GetNotes", "user_id", userID, "task_id", taskID)
	notes, err := h.service.GetNotes(r.Context(), taskID, userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		default:
			h.log.Error("GetNotes failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, notes)
}

func (h *Handler) CreateNote(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	var req CreateTaskNoteRequest
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	h.log.Info("CreateNote", "user_id", userID, "task_id", taskID)
	note, err := h.service.CreateNote(r.Context(), taskID, userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		default:
			h.log.Error("CreateNote failed", "user_id", userID, "task_id", taskID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Created(w, note)
}

func (h *Handler) UpdateNote(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	noteID := chi.URLParam(r, "nid")
	if noteID == "" {
		response.BadRequest(w, "INVALID_ID", "Note ID is required")
		return
	}

	var req UpdateTaskNoteRequest
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	h.log.Info("UpdateNote", "user_id", userID, "task_id", taskID, "note_id", noteID)
	note, err := h.service.UpdateNote(r.Context(), noteID, userID, taskID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Note")
		case errors.Is(err, apperr.ErrForbidden):
			response.Forbidden(w)
		default:
			h.log.Error("UpdateNote failed", "user_id", userID, "task_id", taskID, "note_id", noteID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, note)
}

func (h *Handler) DeleteNote(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		response.BadRequest(w, "INVALID_ID", "Task ID is required")
		return
	}

	noteID := chi.URLParam(r, "nid")
	if noteID == "" {
		response.BadRequest(w, "INVALID_ID", "Note ID is required")
		return
	}

	h.log.Info("DeleteNote", "user_id", userID, "task_id", taskID, "note_id", noteID)
	err := h.service.DeleteNote(r.Context(), noteID, userID, taskID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Note")
		case errors.Is(err, apperr.ErrForbidden):
			response.Forbidden(w)
		default:
			h.log.Error("DeleteNote failed", "user_id", userID, "task_id", taskID, "note_id", noteID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, map[string]string{"message": "Note deleted successfully"})
}

func (h *Handler) GetQuotaToday(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	h.log.Info("GetQuotaToday", "user_id", userID)
	quota, err := h.service.GetQuotaToday(r.Context(), userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrUserNotFound):
			response.NotFound(w, "User")
		default:
			h.log.Error("GetQuotaToday failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, quota)
}
