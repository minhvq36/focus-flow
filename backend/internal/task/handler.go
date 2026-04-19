package task

import (
	"net/http"
)

// Task handler
type Handler struct {
	service *Service
}

// NewHandler creates a new task handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetTasks handles GET /tasks
func (h *Handler) GetTasks(w http.ResponseWriter, r *http.Request) {
	// Get tasks logic
}

// CreateTask handles POST /tasks
func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	// Create task logic
}

// GetTaskNotes handles GET /tasks/:id/notes
// Returns all notes for a task (ordered by created_at DESC)
func (h *Handler) GetTaskNotes(w http.ResponseWriter, r *http.Request) {
	// Get notes logic
}

// AddTaskNote handles POST /tasks/:id/notes
// Adds a new note to task (append-only)
func (h *Handler) AddTaskNote(w http.ResponseWriter, r *http.Request) {
	// Add note logic
}
