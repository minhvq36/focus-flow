package ai

import (
	"net/http"
)

// AI handler
type Handler struct {
}

// GetRecap handles GET /ai/recap
func (h *Handler) GetRecap(w http.ResponseWriter, r *http.Request) {
	// Get daily recap
}

// SuggestTodo handles POST /ai/suggest
func (h *Handler) SuggestTodo(w http.ResponseWriter, r *http.Request) {
	// Suggest todo
}
