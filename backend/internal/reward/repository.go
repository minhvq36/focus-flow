package reward

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
	return &Repository{
		db:  db,
		log: log,
	}
}

func (r *Repository) GetUserLevel(ctx context.Context, tx pgx.Tx, userID string) (int, error) {
	var totalExp int
	err := tx.QueryRow(ctx, `
		SELECT total_exp FROM user_wallets WHERE user_id = $1
	`, userID).Scan(&totalExp)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 1, nil // user mới, default level 1
		}
		return 0, fmt.Errorf("GetUserLevel: %w", err)
	}
	return LevelFromExp(totalExp), nil
}

func (r *Repository) InsertExp(ctx context.Context, tx pgx.Tx, userID string, exp int) error {
	var totalExp int
	err := tx.QueryRow(ctx, `
		UPDATE user_wallets
		SET total_exp = total_exp + $1
		WHERE user_id = $2
		RETURNING total_exp
	`, exp, userID).Scan(&totalExp)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &apperr.UserNotFoundError{}
		}
		return fmt.Errorf("InsertExp update wallet: %w", err)
	}

	newLevel := LevelFromExp(totalExp)

	_, err = tx.Exec(ctx, `
		UPDATE users
		SET level = $1
		WHERE id = $2
	`, newLevel, userID)
	if err != nil {
		return fmt.Errorf("InsertExp update level: %w", err)
	}
	return nil
}

func (r *Repository) InsertSilver(ctx context.Context, tx pgx.Tx, userID string, silver int) error {
	_, err := tx.Exec(ctx, `
		UPDATE user_wallets
		SET silver_balance = silver_balance + $1
		WHERE user_id = $2
	`, silver, userID)
	if err != nil {
		return fmt.Errorf("InsertSilver: %w", err)
	}
	return nil
}

func (r *Repository) InsertItem(ctx context.Context, tx pgx.Tx, userID, itemID string) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO inventory (user_id, item_id)
		VALUES ($1, $2)
	`, userID, itemID)
	if err != nil {
		return fmt.Errorf("InsertItem: %w", err)
	}
	return nil
}

func (r *Repository) GetRandomItemByRarity(ctx context.Context, tx pgx.Tx, rarity Rarity) (*RollResult, error) {
	var itemID string
	var itemRarity Rarity

	// TODO: migrate to OFFSET pattern if items table grows large
	err := tx.QueryRow(ctx, `
        SELECT id, rarity
        FROM items
        WHERE rarity = $1
          AND is_purchasable = true
        ORDER BY RANDOM()
        LIMIT 1
    `, rarity).Scan(&itemID, &itemRarity)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // caller handles fallback
		}
		return nil, fmt.Errorf("GetRandomItemByRarity: %w", err)
	}

	return &RollResult{
		ItemRarity: itemRarity,
		ItemID:     itemID,
	}, nil
}
