package session

import (
	"net/http"
)

// Session handler
type Handler struct {
	service *Service
}

// NewHandler creates a new session handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// StartSession handles POST /sessions/start
func (h *Handler) StartSession(w http.ResponseWriter, r *http.Request) {
	// Start session logic
}

// EndSession handles POST /sessions/end
func (h *Handler) EndSession(w http.ResponseWriter, r *http.Request) {
	// End session logic
}
