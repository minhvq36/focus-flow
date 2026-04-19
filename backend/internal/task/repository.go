package task

// Repository handles task persistence
type Repository struct {
	// Database connection fields
}

// NewRepository creates a new task repository
func NewRepository() *Repository {
	return &Repository{}
}

// GetTaskByID retrieves a task by ID
func (r *Repository) GetTaskByID(taskID string) error {
	// Query logic
	return nil
}

// SaveTask saves a task to the database
func (r *Repository) SaveTask(task interface{}) error {
	// Save logic
	return nil
}

// AddNote adds a note to a task
// INSERT INTO task_notes (task_id, user_id, content, created_at) VALUES (...)
// Returns note ID
func (r *Repository) AddNote(taskID, userID, content string) (string, error) {
	// Add note logic
	return "", nil
}

// GetNotesByTaskID retrieves all notes for a task
// SELECT * FROM task_notes WHERE task_id = ? ORDER BY created_at DESC
func (r *Repository) GetNotesByTaskID(taskID string) ([]interface{}, error) {
	// Query logic
	return []interface{}{}, nil
}
