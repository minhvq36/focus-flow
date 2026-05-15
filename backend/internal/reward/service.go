package reward

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type Rewarder struct {
	db   *pgxpool.Pool
	repo *Repository
	log  *logger.Logger
}

func NewRewarder(db *pgxpool.Pool, repo *Repository, log *logger.Logger) *Rewarder {
	return &Rewarder{db: db, repo: repo, log: log}
}

// Grant rolls and inserts reward within the caller's tx.
// userLevel dùng để chọn tier và tính exp/silver.

func (rw *Rewarder) GetUserLevel(ctx context.Context, tx pgx.Tx, userID string) (int, error) {
	return rw.repo.GetUserLevel(ctx, tx, userID)
}

func (rw *Rewarder) Grant(ctx context.Context, tx pgx.Tx, userID, taskID string, userLevel int) (*RollResult, error) {
	// 1. Roll rarity
	rolledRarity, err := RollRarity(userLevel, taskID, userID)
	if err != nil {
		return nil, fmt.Errorf("Grant roll rarity: %w", err)
	}

	result := &RollResult{RolledRarity: rolledRarity}

	// 2. Fallback loop — lấy item từ DB
	cur := rolledRarity
	for cur != "" {
		item, err := rw.repo.GetRandomItemByRarity(ctx, tx, cur)
		if err != nil {
			return nil, fmt.Errorf("Grant get item: %w", err)
		}
		if item != nil {
			result.ItemID = item.ItemID
			result.ItemRarity = item.ItemRarity
			break
		}
		rw.log.Warn("no item at rarity, falling back",
			"rarity", cur,
			"userID", userID,
		)
		cur = FallbackRarity(cur)
	}

	// 3. Roll silver + lấy exp theo level
	silver, err := RollSilver(userLevel)
	if err != nil {
		return nil, fmt.Errorf("Grant roll silver: %w", err)
	}
	result.Silver = silver
	result.Exp = ExpPerTask(userLevel)

	// 4. Insert item nếu có
	if result.ItemID != "" {
		if err := rw.repo.InsertItem(ctx, tx, userID, result.ItemID); err != nil {
			return nil, fmt.Errorf("Grant insert item: %w", err)
		}
	}

	// 5. Insert exp (update wallet + level)
	if err := rw.repo.InsertExp(ctx, tx, userID, result.Exp); err != nil {
		return nil, fmt.Errorf("Grant insert exp: %w", err)
	}

	// 6. Insert silver
	if err := rw.repo.InsertSilver(ctx, tx, userID, result.Silver); err != nil {
		return nil, fmt.Errorf("Grant insert silver: %w", err)
	}

	// 7. Log roll
	if err := rw.repo.InsertRoll(ctx, tx, taskID, userID, result); err != nil {
		return nil, fmt.Errorf("Grant insert roll: %w", err)
	}

	return result, nil
}
