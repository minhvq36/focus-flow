package task

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RepositoryInterface interface {
	GetAllByUser(ctx context.Context, userID string) ([]TaskSummary, error)
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
