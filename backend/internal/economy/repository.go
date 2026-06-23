package economy

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

// ==========================================
// 1. WALLET OPERATIONS
// ==========================================

// GetUserWallet lấy thông tin ví của user (chỉ focus vào tiền tệ)
func (r *Repository) GetUserWallet(ctx context.Context, userID string) (*UserWallet, error) {
	var wallet UserWallet
	err := r.db.QueryRow(ctx, `
		SELECT user_id, silver_balance, gold_balance, updated_at
		FROM public.user_wallets
		WHERE user_id = $1
	`, userID).Scan(
		&wallet.UserID,
		&wallet.SilverBalance,
		&wallet.GoldBalance,
		&wallet.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &apperr.NotFoundError{Resource: "user_wallet"}
		}
		return nil, fmt.Errorf("query user wallet: %w", err)
	}

	return &wallet, nil
}

// ==========================================
// 2. SHOP DISPLAY (BUY TAB)
// ==========================================

// GetPurchasableItems lấy danh sách các item hệ thống đang bán
func (r *Repository) GetPurchasableItems(ctx context.Context) ([]Item, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			id, name, type, rarity, asset_key, 
			height, width, silver_price, is_purchasable, 
			can_wilt, details
		FROM public.items
		WHERE is_purchasable = true AND silver_price IS NOT NULL
		ORDER BY silver_price ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query purchasable items: %w", err)
	}
	defer rows.Close()

	var items []Item
	for rows.Next() {
		var i Item
		if err := rows.Scan(
			&i.ID, &i.Name, &i.Type, &i.Rarity, &i.AssetKey,
			&i.Height, &i.Width, &i.SilverPrice, &i.IsPurchasable,
			&i.CanWilt, &i.Details,
		); err != nil {
			return nil, fmt.Errorf("scan item row: %w", err)
		}
		items = append(items, i)
	}

	return items, rows.Err()
}

// ==========================================
// 3. INVENTORY DISPLAY (SELL TAB)
// ==========================================

// GetInventoryForSale lấy đồ trong túi để hiển thị lên Shop
func (r *Repository) GetInventoryForSale(ctx context.Context, userID string) ([]SellableInventoryRow, error) {
	query := `
		SELECT 
			i.id AS item_id,
			i.name,
			i.type,
			i.rarity,
			i.asset_key,
			i.height,
			i.width,
			i.silver_price,
			COUNT(inv.id) AS quantity,
			array_agg(inv.id::text) AS instance_ids
		FROM public.inventory inv
		JOIN public.items i ON i.id = inv.item_id
		WHERE inv.user_id = $1 AND inv.status = 'in_bag'
		GROUP BY i.id, i.name, i.type, i.rarity, i.asset_key, i.height, i.width, i.silver_price
		ORDER BY i.type, i.name;
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query inventory for sale: %w", err)
	}
	defer rows.Close()

	var details []SellableInventoryRow
	for rows.Next() {
		var d SellableInventoryRow
		if err := rows.Scan(
			&d.ItemID,
			&d.Name,
			&d.Type,
			&d.Rarity,
			&d.AssetKey,
			&d.Height,
			&d.Width,
			&d.OriginalPrice,
			&d.Quantity,
			&d.InstanceIDs,
		); err != nil {
			return nil, fmt.Errorf("scan grouped inventory row: %w", err)
		}
		details = append(details, d)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error in inventory for sale: %w", err)
	}

	return details, nil
}

// ==========================================
// 4. TRANSACTION SUPPORT (Cho Buy & Sell)
// ==========================================

func (r *Repository) GetItemByID(ctx context.Context, itemID string) (*Item, error) {
	var i Item
	err := r.db.QueryRow(ctx, `
		SELECT id, name, type, rarity, asset_key, height, width, silver_price, is_purchasable, can_wilt
		FROM public.items WHERE id = $1
	`, itemID).Scan(
		&i.ID, &i.Name, &i.Type, &i.Rarity, &i.AssetKey,
		&i.Height, &i.Width, &i.SilverPrice, &i.IsPurchasable, &i.CanWilt,
	)
	if err != nil {
		return nil, err
	}
	return &i, nil
}

// GetWalletForUpdate khóa ví của user lại để xử lý cộng/trừ tiền an toàn
func (r *Repository) GetWalletForUpdate(ctx context.Context, tx pgx.Tx, userID string) (*UserWallet, error) {
	var wallet UserWallet
	err := tx.QueryRow(ctx, `
		SELECT user_id, silver_balance, gold_balance 
		FROM public.user_wallets 
		WHERE user_id = $1 FOR UPDATE
	`, userID).Scan(&wallet.UserID, &wallet.SilverBalance, &wallet.GoldBalance)

	if err != nil {
		return nil, fmt.Errorf("lock user wallet: %w", err)
	}
	return &wallet, nil
}

// UpdateWalletBalance thực hiện thay đổi số dư (hỗ trợ số âm để trừ)
func (r *Repository) UpdateWalletBalance(ctx context.Context, tx pgx.Tx, userID string, silverChange int, goldChange int) error {
	_, err := tx.Exec(ctx, `
		UPDATE public.user_wallets
		SET silver_balance = silver_balance + $1,
		    gold_balance = gold_balance + $2
		WHERE user_id = $3
	`, silverChange, goldChange, userID)
	return err
}

// RecordTransaction lưu lịch sử biến động số dư
func (r *Repository) RecordTransaction(ctx context.Context, tx pgx.Tx, txn EconomyTransaction) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO public.economy_transactions 
			(user_id, silver_change, gold_change, action_type, reference_id, description)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, txn.UserID, txn.SilverChange, txn.GoldChange, txn.ActionType, txn.ReferenceID, txn.Description)
	return err
}

// ==========================================
// 5. INVENTORY OPERATIONS
// ==========================================

// AddInventoryItems thêm đồ vào túi và trả về danh sách các UUID vừa tạo
func (r *Repository) AddInventoryItems(ctx context.Context, tx pgx.Tx, userID, itemID string, quantity int) ([]string, error) {
	// Dùng batch insert thông qua generate_series
	rows, err := tx.Query(ctx, `
		INSERT INTO public.inventory (user_id, item_id, status)
		SELECT $1, $2, 'in_bag'
		FROM generate_series(1, $3)
		RETURNING id
	`, userID, itemID, quantity)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var newIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		newIDs = append(newIDs, id)
	}
	return newIDs, nil
}

// GetInventoryItemsForUpdate khóa các vật phẩm trong kho trước khi bán
func (r *Repository) GetInventoryItemsForUpdate(ctx context.Context, tx pgx.Tx, userID string, inventoryIDs []string) ([]LockedInventoryItem, error) {
	rows, err := tx.Query(ctx, `
		SELECT inv.id, inv.item_id, i.rarity, i.silver_price
		FROM public.inventory inv
		JOIN public.items i ON i.id = inv.item_id
		WHERE inv.id = ANY($1) 
		  AND inv.user_id = $2 
		  AND inv.status = 'in_bag'
		FOR UPDATE
	`, inventoryIDs, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []LockedInventoryItem
	for rows.Next() {
		var item LockedInventoryItem
		if err := rows.Scan(&item.InventoryID, &item.ItemID, &item.Rarity, &item.SilverPrice); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

// DeleteInventoryItems xóa vật phẩm khỏi túi đồ
func (r *Repository) DeleteInventoryItems(ctx context.Context, tx pgx.Tx, inventoryIDs []string) error {
	_, err := tx.Exec(ctx, `
		DELETE FROM public.inventory WHERE id = ANY($1)
	`, inventoryIDs)
	return err
}
