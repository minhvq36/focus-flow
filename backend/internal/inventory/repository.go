package inventory

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type Repository struct {
	db  *pgxpool.Pool
	log *logger.Logger
}

func NewRepository(db *pgxpool.Pool, log *logger.Logger) *Repository {
	return &Repository{db: db, log: log}
}

// GetUserBagItems lấy toàn bộ vật phẩm có status = 'in_bag' và gom nhóm chúng lại
func (r *Repository) GetUserBagItems(ctx context.Context, userID string) ([]InBagItem, error) {
	query := `
		SELECT 
			i.id AS item_id,
			i.name,
			i.type,
			i.asset_key,
			i.width,
			i.height,
			COUNT(inv.id) AS quantity,
			array_agg(inv.id::text) AS instance_ids
		FROM public.inventory inv
		JOIN public.items i ON i.id = inv.item_id
		WHERE inv.user_id = $1 AND inv.status = 'in_bag'
		GROUP BY i.id, i.name, i.type, i.asset_key, i.width, i.height
		ORDER BY i.type, i.name;
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query user bag items: %w", err)
	}
	defer rows.Close()

	var items []InBagItem
	for rows.Next() {
		var item InBagItem
		err := rows.Scan(
			&item.ItemID,
			&item.Name,
			&item.Type,
			&item.AssetKey,
			&item.Width,
			&item.Height,
			&item.Quantity,
			&item.InstanceIDs,
		)
		if err != nil {
			return nil, fmt.Errorf("scan in_bag item: %w", err)
		}
		items = append(items, item)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	// Trả về slice rỗng (thay vì nil) nếu túi đồ trống để frontend dễ map()
	if items == nil {
		return []InBagItem{}, nil
	}

	return items, nil
}
