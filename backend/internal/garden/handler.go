package garden

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

type ServiceInterface interface {
	GetUserGardenList(ctx context.Context, userID string) ([]GardenListItem, error)
	GetUserGardenByID(ctx context.Context, userGardenID, userID string) (*GardenResponse, error)
}

type Handler struct {
	service ServiceInterface
	log     *logger.Logger
}

func NewHandler(service ServiceInterface, log *logger.Logger) *Handler {
	return &Handler{service: service, log: log}
}

func (h *Handler) GetGardenList(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	gardens, err := h.service.GetUserGardenList(r.Context(), userID)
	if err != nil {
		h.log.Error("GetGardenList failed", "user_id", userID, "error", err.Error())
		response.InternalError(w)
		return
	}

	response.Success(w, gardens)
}

func (h *Handler) GetGardenByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	gardenID := chi.URLParam(r, "id")
	if gardenID == "" {
		response.BadRequest(w, "INVALID_ID", "Garden ID is required")
		return
	}

	garden, err := h.service.GetUserGardenByID(r.Context(), gardenID, userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Garden")
		default:
			h.log.Error("GetGardenByID failed", "user_id", userID, "garden_id", gardenID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, garden)
}
