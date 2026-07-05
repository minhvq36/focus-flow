package inventory

import (
	"context"
	"net/http"

	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

type ServiceInterface interface {
	GetUserBagItems(ctx context.Context, userID string) ([]InBagItem, error)
}

type Handler struct {
	service ServiceInterface
	log     *logger.Logger
}

func NewHandler(service ServiceInterface, log *logger.Logger) *Handler {
	return &Handler{service: service, log: log}
}

// GetBagItems lấy toàn bộ vật phẩm trong túi đồ
func (h *Handler) GetBagItems(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	items, err := h.service.GetUserBagItems(r.Context(), userID)
	if err != nil {
		h.log.Error("GetBagItems failed", "user_id", userID, "error", err.Error())
		response.InternalError(w)
		return
	}

	response.Success(w, items)
}
