package economy

import (
	"context"
	"errors"
	"net/http"

	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/request"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

// ServiceInterface chứa các hàm được gom lại từ shop.go, currency.go...
// Tạm thời có 5 hàm hiển thị, bao gồm Buy/Sell transaction.
type ServiceInterface interface {
	GetWallet(ctx context.Context, userID string) (*WalletResponse, error)
	GetShopItems(ctx context.Context) ([]ShopItemResponse, error)
	GetSellableItems(ctx context.Context, userID string) ([]SellableItemResponse, error)
	BuyItems(ctx context.Context, userID string, req BuyRequest) (*BuyResponse, error)
	SellItems(ctx context.Context, userID string, req SellBatchRequest) (*SellBatchResponse, error)
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

// ==========================================
// 4. POST BUY ITEM (Mua item từ shop)
// Route dự kiến: POST /api/economy/shop/buy
// ==========================================

func (h *Handler) Buy(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	var req BuyRequest
	if !request.BindAndValidate(w, r, &req) {
		return
	}

	h.log.Info("Buy", "user_id", userID, "item_id", req.ItemID, "quantity", req.Quantity)
	result, err := h.service.BuyItems(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Item")
		case errors.Is(err, apperr.ErrInsufficientBalance):
			response.BadRequest(w, "INSUFFICIENT_BALANCE", "Not enough currency to purchase this item")
		default:
			h.log.Error("Buy failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, result)
}

// ==========================================
// 5. POST SELL BATCH (Bán item từ kho)
// Route dự kiến: POST /api/economy/shop/sell
// ==========================================

func (h *Handler) Sell(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	var req SellBatchRequest
	if !request.BindAndValidate(w, r, &req) {
		return
	}

	h.log.Info("Sell", "user_id", userID, "inventory_count", len(req.InventoryIDs), "receive_currency", req.ReceiveCurrency)
	result, err := h.service.SellItems(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Inventory Item")
		case errors.Is(err, apperr.ErrForbidden):
			response.Forbidden(w)
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		default:
			h.log.Error("Sell failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, result)
}
