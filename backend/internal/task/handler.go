package task

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

type ServiceInterface interface {
	GetUserTasks(ctx context.Context, userID string) ([]TaskSummary, error)
	GetTaskByID(ctx context.Context, taskID, userID string) (*Task, error)
	CreateTask(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error)
	UpdateTodos(ctx context.Context, taskID, userID string, req UpdateTodosRequest) error
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

func (h *Handler) GetUserTasks(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	h.log.Info("GetUserTasks", "user_id", userID)
	tasks, err := h.service.GetUserTasks(r.Context(), userID)
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_REQUEST", "Invalid request body")
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_REQUEST", "Invalid request body")
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
