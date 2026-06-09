package inventory

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type RepositoryInterface interface {
	GetUserBagItems(ctx context.Context, userID string) ([]InBagItem, error)
}

type Service struct {
	db   *pgxpool.Pool
	repo RepositoryInterface
	log  *logger.Logger
}

func NewService(db *pgxpool.Pool, repo RepositoryInterface, log *logger.Logger) *Service {
	return &Service{db: db, repo: repo, log: log}
}

// GetUserBagItems lấy danh sách các vật phẩm trong túi đồ của user
func (s *Service) GetUserBagItems(ctx context.Context, userID string) ([]InBagItem, error) {
	items, err := s.repo.GetUserBagItems(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("GetUserBagItems: %w", err)
	}

	// Return empty slice instead of nil for consistency
	if items == nil {
		return []InBagItem{}, nil
	}

	return items, nil
}
