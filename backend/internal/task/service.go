package task

// Service contains business logic for tasks
type Service struct {
	repo *Repository
}

// NewService creates a new task service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// CreateTask creates a new task with state machine logic
func (s *Service) CreateTask(title, description string) error {
	// Task creation logic
	return nil
}

// CompleteTask completes a task
func (s *Service) CompleteTask(taskID string) error {
	// Task completion logic
	return nil
}

// AddNote adds a note to a task (append-only)
// Returns (noteID, error)
func (s *Service) AddNote(taskID, userID, content string) (string, error) {
	// Validate content is not empty
	if len(content) == 0 {
		return "", nil // or error
	}
	// Add note logic via repository
	return "", nil
}

// GetNotes retrieves all notes for a task
// Returns notes ordered by created_at DESC
func (s *Service) GetNotes(taskID string) ([]interface{}, error) {
	// Get notes logic
	return []interface{}{}, nil
}
