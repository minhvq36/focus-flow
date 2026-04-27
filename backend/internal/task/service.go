package task

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	repo *Repository
} // TODO: Research and apply interface instead?

func NewService(db *pgxpool.Pool) *Service {
	return &Service{repo: NewRepository(db)}
}

func (s *Service) GetUserTasks(ctx context.Context, userID string) ([]Task, error) {
	return s.repo.GetAllByUser(ctx, userID)
}
