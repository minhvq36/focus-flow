package leaderboard

import (
	"net/http"
)

// Leaderboard handler
type Handler struct {
	service *Service
}

// NewHandler creates a new leaderboard handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetGlobalRanking handles GET /leaderboard/global
func (h *Handler) GetGlobalRanking(w http.ResponseWriter, r *http.Request) {
	// Get global ranking
}

// GetFriendsRanking handles GET /leaderboard/friends
func (h *Handler) GetFriendsRanking(w http.ResponseWriter, r *http.Request) {
	// Get friends ranking
}
