package garden

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type Repository struct {
	db  *pgxpool.Pool
	log *logger.Logger
}

func NewRepository(db *pgxpool.Pool, log *logger.Logger) *Repository {
	return &Repository{db: db, log: log}
}

type gardenRow struct {
	UserGarden
	GardenIndex  int  `db:"garden_index"`
	GridSize     int  `db:"grid_size"`
	IsExpandable bool `db:"is_expandable"`
}

func (r *Repository) GetUserGardenList(ctx context.Context, userID string) ([]gardenRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			ug.id, ug.user_id, ug.garden_id, ug.expansion_level,
			ug.created_at, ug.updated_at,
			ug.last_watered_at, ug.auto_water_until,
			g.garden_index, g.grid_size, g.is_expandable
		FROM public.user_gardens ug
		JOIN public.gardens g ON g.id = ug.garden_id
		WHERE ug.user_id = $1
		ORDER BY g.garden_index ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query user_garden list: %w", err)
	}
	defer rows.Close()

	var result []gardenRow
	for rows.Next() {
		var row gardenRow
		if err := rows.Scan(
			&row.ID, &row.UserID, &row.GardenID, &row.ExpansionLevel,
			&row.CreatedAt, &row.UpdatedAt,
			&row.LastWateredAt, &row.AutoWaterUntil,
			&row.GardenIndex, &row.GridSize, &row.IsExpandable,
		); err != nil {
			return nil, fmt.Errorf("scan user_garden list row: %w", err)
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *Repository) GetUserGardenByID(ctx context.Context, userGardenID, userID string) (*gardenRow, error) {
	var row gardenRow
	err := r.db.QueryRow(ctx, `
		SELECT
			ug.id, ug.user_id, ug.garden_id, ug.expansion_level,
			ug.created_at, ug.updated_at,
			ug.last_watered_at, ug.auto_water_until,
			g.garden_index, g.grid_size, g.is_expandable
		FROM public.user_gardens ug
		JOIN public.gardens g ON g.id = ug.garden_id
		WHERE ug.id = $1 AND ug.user_id = $2
	`, userGardenID, userID).Scan(
		&row.ID, &row.UserID, &row.GardenID, &row.ExpansionLevel,
		&row.CreatedAt, &row.UpdatedAt,
		&row.LastWateredAt, &row.AutoWaterUntil,
		&row.GardenIndex, &row.GridSize, &row.IsExpandable,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &apperr.NotFoundError{Resource: "garden"}
		}
		return nil, fmt.Errorf("query user_garden by id: %w", err)
	}
	return &row, nil
}

func (r *Repository) GetPlacementsByUserGardenID(ctx context.Context, userGardenID string) ([]Placement, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			gp.id, gp.user_garden_id, gp.inventory_id,
			inv.item_id,
			i.asset_key,
			i.width, i.height,
			gp.effective_width, gp.effective_height,
			gp.grid_x, gp.grid_y, gp.rotation,
			gp.health_status, gp.wilted_at, gp.placed_at
		FROM public.garden_placements gp
		JOIN public.inventory inv ON inv.id = gp.inventory_id
		JOIN public.items i ON i.id = inv.item_id
		WHERE gp.user_garden_id = $1
	`, userGardenID)
	if err != nil {
		return nil, fmt.Errorf("query placements: %w", err)
	}
	defer rows.Close()

	var result []Placement
	for rows.Next() {
		var p Placement
		if err := rows.Scan(
			&p.ID, &p.UserGardenID, &p.InventoryID,
			&p.ItemID,
			&p.AssetKey,
			&p.ItemWidth, &p.ItemHeight,
			&p.EffectiveWidth, &p.EffectiveHeight,
			&p.GridX, &p.GridY, &p.Rotation,
			&p.HealthStatus, &p.WiltedAt, &p.PlacedAt,
		); err != nil {
			return nil, fmt.Errorf("scan placement row: %w", err)
		}
		result = append(result, p)
	}
	return result, rows.Err()
}
