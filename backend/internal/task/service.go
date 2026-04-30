package task

import (
	"context"

	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
)

type RepositoryInterface interface {
	GetAllByUser(ctx context.Context, userID string) ([]TaskSummary, error)
	GetByID(ctx context.Context, taskID, userID string) (*Task, error)
	Create(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error)
}

type Service struct {
	repo RepositoryInterface
}

func NewService(repo RepositoryInterface) *Service {
	return &Service{repo: repo}
}

// TODO: Check naming of service and repo
func (s *Service) GetUserTasks(ctx context.Context, userID string) ([]TaskSummary, error) {
	return s.repo.GetAllByUser(ctx, userID)
}

func (s *Service) GetTaskByID(ctx context.Context, taskID, userID string) (*Task, error) {
	return s.repo.GetByID(ctx, taskID, userID)
}

func (s *Service) CreateTask(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error) {
	// Validate todos before creating
	if err := ValidateTodos(req.Todos); err != nil {
		return nil, &apperr.ValidationError{Message: err.Error()}
	}
	return s.repo.Create(ctx, userID, req)
}
