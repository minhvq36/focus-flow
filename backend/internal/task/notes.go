package task

import (
	"time"
)

// TaskNote represents a note attached to a task
// Append-only audit trail during task execution
type TaskNote struct {
	ID        string    `json:"id"`         // UUID
	TaskID    string    `json:"task_id"`    // Foreign key to tasks
	UserID    string    `json:"user_id"`    // Foreign key to users
	Content   string    `json:"content"`    // Main note content (required)
	CreatedAt time.Time `json:"created_at"` // When note was added
}

// TaskNoteCreateRequest is the payload for adding a note
type TaskNoteCreateRequest struct {
	Content string `json:"content" binding:"required"`
}
