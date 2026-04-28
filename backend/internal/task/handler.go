package task

import (
	"net/http"

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
	// Lấy userID từ context (middleware đã verify JWT)
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
