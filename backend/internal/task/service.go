package task

import (
	"context"
	"strings"

	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type RepositoryInterface interface {
	GetAllByUser(ctx context.Context, userID string) ([]TaskSummary, error)
	GetByID(ctx context.Context, taskID, userID string) (*Task, error)
	Create(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error)
	UpdateTodos(ctx context.Context, taskID, userID string, req UpdateTodosRequest) error
}

type Service struct {
	repo RepositoryInterface
	log  *logger.Logger
}

func NewService(repo RepositoryInterface, log *logger.Logger) *Service {
	return &Service{
		repo: repo,
		log:  log,
	}
}

// TODO: Check naming of service and repo
func (s *Service) GetUserTasks(ctx context.Context, userID string) ([]TaskSummary, error) {
	return s.repo.GetAllByUser(ctx, userID)
}

func (s *Service) GetTaskByID(ctx context.Context, taskID, userID string) (*Task, error) {
	return s.repo.GetByID(ctx, taskID, userID)
}

func (s *Service) CreateTask(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error) {
	if strings.TrimSpace(req.Title) == "" {
		return nil, &apperr.ValidationError{Message: "Title cannot be empty"}
	}
	// Validate todos before creating
	if err := ValidateTodos(req.Todos); err != nil {
		return nil, &apperr.ValidationError{Message: err.Error()}
	}
	return s.repo.Create(ctx, userID, req)
}

func (s *Service) UpdateTodos(ctx context.Context, taskID, userID string, req UpdateTodosRequest) error {
	// Validate taskID is not empty
	if strings.TrimSpace(taskID) == "" {
		return &apperr.ValidationError{Message: "Task ID is required"}
	}
	// Validate todos before updating
	if err := ValidateTodos(req.Todos); err != nil {
		return &apperr.ValidationError{Message: err.Error()}
	}
	s.log.Info("UpdateTodos", "user_id", userID, "task_id", taskID)
	return s.repo.UpdateTodos(ctx, taskID, userID, req)
}
