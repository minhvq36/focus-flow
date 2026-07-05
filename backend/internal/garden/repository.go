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

func (r *Repository) LockUserGarden(ctx context.Context, tx pgx.Tx, userGardenID, userID string) (int, int, error) {
	var baseSize, expansionLevel int
	err := tx.QueryRow(ctx, `
		SELECT g.grid_size, ug.expansion_level
		FROM public.user_gardens ug
		JOIN public.gardens g ON g.id = ug.garden_id
		WHERE ug.id = $1 AND ug.user_id = $2
		FOR UPDATE OF ug
	`, userGardenID, userID).Scan(&baseSize, &expansionLevel)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, 0, &apperr.NotFoundError{Resource: "user garden"}
		}
		return 0, 0, fmt.Errorf("lock user garden: %w", err)
	}

	// Trả về cả kích thước gốc và cấp độ mở rộng
	return baseSize, expansionLevel, nil
}

// Lấy danh sách BoundingBox của các Placement hiện tại TRONG TRANSACTION
func (r *Repository) GetPlacementsBoundingBoxesTx(ctx context.Context, tx pgx.Tx, userGardenID string) ([]BoundingBox, error) {
	// Chỉ select đúng các cột cần thiết để tiết kiệm RAM (O(k))
	query := `
		SELECT id, grid_x, grid_y, effective_width, effective_height 
		FROM public.garden_placements 
		WHERE user_garden_id = $1
	`
	rows, err := tx.Query(ctx, query, userGardenID)
	if err != nil {
		return nil, fmt.Errorf("query bounding boxes: %w", err)
	}
	defer rows.Close()

	var boxes []BoundingBox
	for rows.Next() {
		var b BoundingBox
		if err := rows.Scan(&b.ID, &b.X, &b.Y, &b.W, &b.H); err != nil {
			return nil, fmt.Errorf("scan bounding box row: %w", err)
		}
		boxes = append(boxes, b)
	}
	return boxes, rows.Err()
}

// Lấy thông tin nhiều Inventory items cùng 1 lúc và trả về MAP để tra cứu O(1)
func (r *Repository) GetInventoryItemsMap(ctx context.Context, inventoryIDs []string, userID string) (map[string]InventoryItemDetails, error) {
	query := `
		SELECT inv.id, i.id, i.asset_key, i.width, i.height 
		FROM public.inventory inv
		JOIN public.items i ON i.id = inv.item_id
		WHERE inv.id = ANY($1) AND inv.user_id = $2 AND inv.status != 'placed'
	`

	// Ép mảng string sang kiểu mảng của pgx để query IN
	rows, err := r.db.Query(ctx, query, inventoryIDs, userID)
	if err != nil {
		return nil, fmt.Errorf("query bulk inventory items: %w", err)
	}
	defer rows.Close()

	resultMap := make(map[string]InventoryItemDetails)
	for rows.Next() {
		var invID string
		var item InventoryItemDetails
		if err := rows.Scan(&invID, &item.ItemID, &item.AssetKey, &item.Width, &item.Height); err != nil {
			return nil, fmt.Errorf("scan bulk inventory item: %w", err)
		}
		resultMap[invID] = item
	}
	return resultMap, rows.Err()
}

// Ghi một danh sách Placement mới vào DB sử dụng pgx.Batch (1 Round-trip)
func (r *Repository) CreatePlacementsAndUpdateInventory(ctx context.Context, tx pgx.Tx, params []CreatePlacementParams, userID string) ([]Placement, error) {
	if len(params) == 0 {
		return nil, nil
	}

	batch := &pgx.Batch{}

	insertQuery := `
		INSERT INTO public.garden_placements 
		(user_garden_id, inventory_id, grid_x, grid_y, effective_width, effective_height, rotation) 
		VALUES ($1, $2, $3, $4, $5, $6, $7) 
		RETURNING id, health_status, wilted_at, placed_at
	`

	updateQuery := `UPDATE public.inventory SET status = $1 WHERE id = $2 AND user_id = $3`

	// 1. Nhét toàn bộ lệnh INSERT vào hàng đợi
	for _, p := range params {
		batch.Queue(insertQuery, p.UserGardenID, p.InventoryID, p.GridX, p.GridY, p.EffectiveWidth, p.EffectiveHeight, p.Rotation)
	}

	// 2. Nhét tiếp toàn bộ lệnh UPDATE vào hàng đợi
	for _, p := range params {
		batch.Queue(updateQuery, "placed", p.InventoryID, userID)
	}

	// Gửi đi 1 lần duy nhất
	br := tx.SendBatch(ctx, batch)
	defer br.Close()

	// 3. Đọc kết quả của tập lệnh INSERT (Phải đọc theo đúng thứ tự đã Queue)
	var results []Placement
	for _, p := range params {
		var placed Placement
		err := br.QueryRow().Scan(&placed.ID, &placed.HealthStatus, &placed.WiltedAt, &placed.PlacedAt)

		if err != nil {
			// Bắt lỗi Unique Constraint (Race condition)
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				return nil, &apperr.DuplicateError{Message: "item is already placed in a garden"}
			}
			return nil, fmt.Errorf("batch insert scan failed for inventory %s: %w", p.InventoryID, err)
		}

		placed.UserGardenID = p.UserGardenID
		placed.InventoryID = p.InventoryID
		placed.GridX = p.GridX
		placed.GridY = p.GridY
		placed.EffectiveWidth = p.EffectiveWidth
		placed.EffectiveHeight = p.EffectiveHeight
		placed.Rotation = p.Rotation

		results = append(results, placed)
	}

	// 4. Đọc kết quả của tập lệnh UPDATE
	for _, p := range params {
		tag, err := br.Exec()
		if err != nil {
			return nil, fmt.Errorf("batch update inventory %s failed: %w", p.InventoryID, err)
		}
		if tag.RowsAffected() == 0 {
			r.log.Warn(fmt.Sprintf("inventory item %s not updated during batch", p.InventoryID))
		}
	}

	return results, nil
}

// TODO: When add on_market, need to delete garden_placements for defensive
func (r *Repository) RemovePlacementsAndUpdateInventory(ctx context.Context, tx pgx.Tx, userGardenID string, inventoryIDs []string, userID string) ([]string, error) {
	if len(inventoryIDs) == 0 {
		return nil, nil
	}

	query := `
		WITH valid_inventory AS (
			SELECT id FROM public.inventory 
			WHERE id = ANY($1) 
			  AND user_id = $2 
			  AND status != 'on_market'
		),
		deleted_placements AS (
			DELETE FROM public.garden_placements
			WHERE user_garden_id = $3 
			  AND inventory_id IN (SELECT id FROM valid_inventory)
			RETURNING inventory_id
		)
		UPDATE public.inventory
		SET status = 'in_bag'
		WHERE id IN (SELECT inventory_id FROM deleted_placements)
		RETURNING id;
	`

	rows, err := tx.Query(ctx, query, inventoryIDs, userID, userGardenID)
	if err != nil {
		return nil, fmt.Errorf("remove placements CTE failed: %w", err)
	}
	defer rows.Close()

	var successfulIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan removed inventory_id: %w", err)
		}
		successfulIDs = append(successfulIDs, id)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error in remove placements: %w", err)
	}

	return successfulIDs, nil
}
