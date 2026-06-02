package garden

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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

func (r *Repository) ValidatePlacement(ctx context.Context, in ValidationInput) error {
	// 1. BOUNDS CHECK (Thuần Go, kiểm tra biên)
	if in.GridX < 0 || in.GridY < 0 || in.GridX+in.EffectiveWidth > in.GridSize || in.GridY+in.EffectiveHeight > in.GridSize {
		return &apperr.ValidationError{Message: "placement out of bounds"}
	}

	// 2. OVERLAP CHECK BẰNG SQL (AABB Collision)
	query := `
		SELECT EXISTS (
			SELECT 1 FROM public.garden_placements
			WHERE user_garden_id = $1
			  AND (NULLIF($2, '') IS NULL OR id::text != $2)
			  AND $3 < grid_x + effective_width
			  AND $3 + $4 > grid_x
			  AND $5 < grid_y + effective_height
			  AND $5 + $6 > grid_y
		)
	`

	var isOverlap bool
	err := r.db.QueryRow(ctx, query,
		in.UserGardenID,
		in.ExcludePlacementID,
		in.GridX, in.EffectiveWidth,
		in.GridY, in.EffectiveHeight,
	).Scan(&isOverlap)

	if err != nil {
		return fmt.Errorf("validate placement overlap: %w", err)
	}

	if isOverlap {
		return &apperr.ValidationError{Message: "placement overlaps existing item"}
	}

	return nil
}

// CreatePlacement thêm một item mới vào khu vườn
func (r *Repository) CreatePlacement(ctx context.Context, arg CreatePlacementParams) (*Placement, error) {
	query := `
		INSERT INTO public.garden_placements (
			user_garden_id, inventory_id, 
			grid_x, grid_y, effective_width, effective_height, rotation
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		)
		RETURNING id, health_status, wilted_at, placed_at
	`

	var p Placement
	err := r.db.QueryRow(ctx, query,
		arg.UserGardenID,
		arg.InventoryID,
		arg.GridX,
		arg.GridY,
		arg.EffectiveWidth,
		arg.EffectiveHeight,
		arg.Rotation,
	).Scan(
		&p.ID,
		&p.HealthStatus,
		&p.WiltedAt,
		&p.PlacedAt,
	)

	if err != nil {
		// Bắt lỗi Unique Constraint (23505) nếu item đã được đặt
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, &apperr.DuplicateError{Message: "item is already placed in a garden"}
		}
		return nil, fmt.Errorf("insert placement: %w", err)
	}

	// Gán ngược lại dữ liệu input vào object trả về
	p.UserGardenID = arg.UserGardenID
	p.InventoryID = arg.InventoryID
	p.GridX = arg.GridX
	p.GridY = arg.GridY
	p.EffectiveWidth = arg.EffectiveWidth
	p.EffectiveHeight = arg.EffectiveHeight
	p.Rotation = arg.Rotation

	return &p, nil
}
