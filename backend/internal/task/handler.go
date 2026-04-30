package task

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

type ServiceInterface interface {
	GetUserTasks(ctx context.Context, userID string) ([]TaskSummary, error)
	GetTaskByID(ctx context.Context, taskID, userID string) (*Task, error)
	CreateTask(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error)
}

type Handler struct {
	service ServiceInterface
}

func NewHandler(service ServiceInterface) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetUserTasks(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	tasks, err := h.service.GetUserTasks(r.Context(), userID)
	if err != nil {
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

	task, err := h.service.GetTaskByID(r.Context(), taskID, userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Task")
		default:
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_REQUEST", "Invalid request body")
		return
	}

	task, err := h.service.CreateTask(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrQuotaExceeded):
			response.Conflict(w, "QUOTA_EXCEEDED", err.Error())
		default:
			response.InternalError(w)
		}
		return
	}

	response.Created(w, task)
}
