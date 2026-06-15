package garden

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/request"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

type ServiceInterface interface {
	GetUserGardenList(ctx context.Context, userID string) ([]GardenListItem, error)
	GetUserGardenByID(ctx context.Context, userGardenID, userID string) (*GardenResponse, error)
	PlaceItem(ctx context.Context, userID string, req PlaceRequest) (*PlacementResponse, error)
	PlaceItemsBatch(ctx context.Context, userID string, req MultiPlaceRequest) (*MultiPlaceResponse, error)
	RemoveItemsBatch(ctx context.Context, userID string, req MultiRemoveRequest) (*MultiRemoveResponse, error)
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

func (h *Handler) PlaceItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	var req PlaceRequest
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	req.UserGardenID = chi.URLParam(r, "id")
	if req.UserGardenID == "" {
		response.BadRequest(w, "INVALID_ID", "Garden ID is required")
		return
	}

	placement, err := h.service.PlaceItem(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrDuplicate):
			response.Conflict(w, "DUPLICATE_ITEM", err.Error())
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Resource")
		default:
			h.log.Error("PlaceItem failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, placement)
}

func (h *Handler) PlaceItemsBatch(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	var req MultiPlaceRequest
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	req.UserGardenID = chi.URLParam(r, "id")
	if req.UserGardenID == "" {
		response.BadRequest(w, "INVALID_ID", "Garden ID is required")
		return
	}

	result, err := h.service.PlaceItemsBatch(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrDuplicate):
			response.Conflict(w, "DUPLICATE_ITEM", err.Error())
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Resource")
		default:
			h.log.Error("PlaceItemsBatch failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, result)
}
func (h *Handler) RemoveItemsBatch(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	var req MultiRemoveRequest
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	req.UserGardenID = chi.URLParam(r, "id")
	if req.UserGardenID == "" {
		response.BadRequest(w, "INVALID_ID", "Garden ID is required")
		return
	}

	result, err := h.service.RemoveItemsBatch(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Resource")
		default:
			h.log.Error("RemoveItemsBatch failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, result)
}