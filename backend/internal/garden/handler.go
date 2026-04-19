package garden

import (
	"net/http"
)

// Garden handler
type Handler struct {
	service *Service
}

// NewHandler creates a new garden handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetGarden handles GET /garden
func (h *Handler) GetGarden(w http.ResponseWriter, r *http.Request) {
	// Get garden logic
}

// PlaceItem handles POST /garden/items
func (h *Handler) PlaceItem(w http.ResponseWriter, r *http.Request) {
	// Place item logic
}
