package garden

import (
	"context"
	"fmt"

	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type RepositoryInterface interface {
	GetUserGardenList(ctx context.Context, userID string) ([]gardenRow, error)
	GetUserGardenByID(ctx context.Context, userGardenID, userID string) (*gardenRow, error)
	GetPlacementsByUserGardenID(ctx context.Context, userGardenID string) ([]Placement, error)
}

type Service struct {
	repo RepositoryInterface
	log  *logger.Logger
}

func NewService(repo RepositoryInterface, log *logger.Logger) *Service {
	return &Service{repo: repo, log: log}
}
func (s *Service) GetUserGardenList(ctx context.Context, userID string) ([]GardenListItem, error) {
	gardens, err := s.repo.GetUserGardenList(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("GetUserGardenList: %w", err)
	}

	result := make([]GardenListItem, 0, len(gardens))
	for _, g := range gardens {
		result = append(result, GardenListItem{
			ID:             g.ID,
			GardenID:       g.GardenID,
			GardenIndex:    g.GardenIndex,
			ExpansionLevel: g.ExpansionLevel,
			IsExpandable:   g.IsExpandable,
			CanExpand:      g.IsExpandable && g.ExpansionLevel < maxExpansionLevel,
		})
	}
	return result, nil
}

// For garden view
func (s *Service) GetUserGardenByID(ctx context.Context, userGardenID, userID string) (*GardenResponse, error) {
	garden, err := s.repo.GetUserGardenByID(ctx, userGardenID, userID)
	if err != nil {
		return nil, err // apperr.NotFoundError đã wrap trong repo
	}

	placements, err := s.repo.GetPlacementsByUserGardenID(ctx, userGardenID)
	if err != nil {
		return nil, fmt.Errorf("GetUserGardenByID placements: %w", err)
	}

	placementResponses := make([]PlacementResponse, 0, len(placements))
	for _, p := range placements {
		placementResponses = append(placementResponses, PlacementResponse{
			ID:           p.ID,
			InventoryID:  p.InventoryID,
			ItemID:       p.ItemID,
			AssetKey:     p.AssetKey,
			GridX:        p.GridX,
			GridY:        p.GridY,
			Rotation:     p.Rotation,
			HealthStatus: p.HealthStatus,
			WiltedAt:     p.WiltedAt,
			PlacedAt:     p.PlacedAt,
		})
	}

	return &GardenResponse{
		ID:             garden.ID,
		GardenID:       garden.GardenID,
		GardenIndex:    garden.GardenIndex,
		ExpansionLevel: garden.ExpansionLevel,
		BaseSize:       garden.GridSize,
		CurrentSize:    computeCurrentSize(garden.GridSize, garden.ExpansionLevel),
		IsExpandable:   garden.IsExpandable,
		CanExpand:      garden.IsExpandable && garden.ExpansionLevel < maxExpansionLevel,
		LastWateredAt:  garden.LastWateredAt,
		AutoWaterUntil: garden.AutoWaterUntil,
		Placements:     placementResponses,
	}, nil
}
