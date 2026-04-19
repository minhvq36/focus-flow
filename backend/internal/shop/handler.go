package shop

import (
	"net/http"
)

// Shop handler
type Handler struct {
	service *Service
}

// NewHandler creates a new shop handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetShopItems handles GET /shop/items
func (h *Handler) GetShopItems(w http.ResponseWriter, r *http.Request) {
	// Get items logic
}

// BuyItem handles POST /shop/buy
func (h *Handler) BuyItem(w http.ResponseWriter, r *http.Request) {
	// Buy item logic
}
