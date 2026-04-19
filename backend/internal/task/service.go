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
