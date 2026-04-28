package task

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RepositoryInterface interface {
	GetAllByUser(ctx context.Context, userID string) ([]TaskSummary, error)
	GetByID(ctx context.Context, taskID, userID string) (*Task, error)
	Create(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error)
}

type Service struct {
	repo RepositoryInterface
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{repo: NewRepository(db)}
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
		return nil, &ValidationError{Message: err.Error()}
	}
	return s.repo.Create(ctx, userID, req)
}
