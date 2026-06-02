package garden

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type RepositoryInterface interface {
	GetUserGardenList(ctx context.Context, userID string) ([]gardenRow, error)
	GetUserGardenByID(ctx context.Context, userGardenID, userID string) (*gardenRow, error)
	GetPlacementsByUserGardenID(ctx context.Context, userGardenID string) ([]Placement, error)
	GetInventoryItemDetails(ctx context.Context, inventoryID, userID string) (*InventoryItemDetails, error)
	LockUserGarden(ctx context.Context, tx pgx.Tx, userGardenID, userID string) (baseSize, expansionLevel int, err error)
	ValidatePlacement(ctx context.Context, tx pgx.Tx, in ValidationInput) error
	CreatePlacement(ctx context.Context, tx pgx.Tx, arg CreatePlacementParams) (*Placement, error)
}

type Service struct {
	db   *pgxpool.Pool
	repo RepositoryInterface
	log  *logger.Logger
}

func NewService(db *pgxpool.Pool, repo RepositoryInterface, log *logger.Logger) *Service {
	return &Service{db: db, repo: repo, log: log}
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
			ItemWidth:    p.ItemWidth,
			ItemHeight:   p.ItemHeight,
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

func (s *Service) PlaceItem(ctx context.Context, userID string, req PlaceRequest) (*PlacementResponse, error) {
	itemInfo, err := s.repo.GetInventoryItemDetails(ctx, req.InventoryID, userID)
	if err != nil {
		return nil, err
	}

	effW, effH := GetEffectiveDimensions(itemInfo.Width, itemInfo.Height, req.Rotation)

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("PlaceItem begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	baseSize, expansionLevel, err := s.repo.LockUserGarden(ctx, tx, req.UserGardenID, userID)
	if err != nil {
		return nil, err
	}

	currentGridSize := computeCurrentSize(baseSize, expansionLevel)

	valInput := ValidationInput{
		UserGardenID:    req.UserGardenID,
		GridX:           req.GridX,
		GridY:           req.GridY,
		EffectiveWidth:  effW,
		EffectiveHeight: effH,
		GridSize:        currentGridSize, // Dùng kích thước đã được cộng dồn (Current Size)
	}

	if err := s.repo.ValidatePlacement(ctx, tx, valInput); err != nil {
		return nil, err
	}

	createInput := CreatePlacementParams{
		UserGardenID:    req.UserGardenID,
		InventoryID:     req.InventoryID,
		GridX:           req.GridX,
		GridY:           req.GridY,
		EffectiveWidth:  effW,
		EffectiveHeight: effH,
		Rotation:        req.Rotation,
	}
	placement, err := s.repo.CreatePlacement(ctx, tx, createInput)
	if err != nil {
		return nil, err
	}

	// 7. COMMIT TRANSACTION
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("PlaceItem commit tx: %w", err)
	}

	// 8. TRẢ VỀ DỮ LIỆU ĐẦY ĐỦ CHO FRONTEND
	return &PlacementResponse{
		ID:              placement.ID,
		InventoryID:     placement.InventoryID,
		ItemID:          itemInfo.ItemID,
		AssetKey:        itemInfo.AssetKey,
		GridX:           placement.GridX,
		GridY:           placement.GridY,
		ItemWidth:       itemInfo.Width,
		ItemHeight:      itemInfo.Height,
		EffectiveWidth:  placement.EffectiveWidth,
		EffectiveHeight: placement.EffectiveHeight,
		Rotation:        placement.Rotation,
		HealthStatus:    placement.HealthStatus,
		WiltedAt:        placement.WiltedAt,
		PlacedAt:        placement.PlacedAt,
	}, nil
}
