package economy

import (
	"context"
	"errors"
	"net/http"

	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

// ServiceInterface chứa các hàm được gom lại từ shop.go, currency.go...
// Tạm thời có 3 hàm hiển thị, sau này làm Buy/Sell mình sẽ add thêm vào đây.
type ServiceInterface interface {
	GetWallet(ctx context.Context, userID string) (*WalletResponse, error)
	GetShopItems(ctx context.Context) ([]ShopItemResponse, error)
	GetSellableItems(ctx context.Context, userID string) ([]SellableItemResponse, error)
}

type Handler struct {
	service ServiceInterface
	log     *logger.Logger
}

func NewHandler(service ServiceInterface, log *logger.Logger) *Handler {
	return &Handler{service: service, log: log}
}

// ==========================================
// 1. GET WALLET (Hiển thị Bạc/Vàng)
// Route dự kiến: GET /api/economy/wallet
// ==========================================

func (h *Handler) GetWallet(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	wallet, err := h.service.GetWallet(r.Context(), userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "User Wallet")
		default:
			h.log.Error("GetWallet failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, wallet)
}

// ==========================================
// 2. GET SHOP ITEMS (Tab Mua)
// Route dự kiến: GET /api/economy/shop/buy
// ==========================================

func (h *Handler) GetShopItems(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	items, err := h.service.GetShopItems(r.Context())
	if err != nil {
		h.log.Error("GetShopItems failed", "user_id", userID, "error", err.Error())
		response.InternalError(w)
		return
	}

	response.Success(w, items)
}

// ==========================================
// 3. GET SELLABLE ITEMS (Tab Bán - Lấy từ kho)
// Route dự kiến: GET /api/economy/shop/sell
// ==========================================

func (h *Handler) GetSellableItems(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	items, err := h.service.GetSellableItems(r.Context(), userID)
	if err != nil {
		h.log.Error("GetSellableItems failed", "user_id", userID, "error", err.Error())
		response.InternalError(w)
		return
	}

	response.Success(w, items)
}
