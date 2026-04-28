package task

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
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
		if errors.Is(err, ErrNotFound) {
			response.NotFound(w, "Task")
			return
		}
		response.InternalError(w)
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
		if errors.Is(err, ErrValidation) {
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
			return
		}
		response.InternalError(w)
		return
	}

	response.Created(w, task)
}
