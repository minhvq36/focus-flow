package economy

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type CurrencyService struct {
	repo    RepositoryInterface
	auditor *Auditor
	log     *logger.Logger
}

func NewCurrencyService(repo RepositoryInterface, auditor *Auditor, log *logger.Logger) *CurrencyService {
	return &CurrencyService{
		repo:    repo,
		auditor: auditor,
		log:     log,
	}
}

func (cs *CurrencyService) ChangeBalance(ctx context.Context, tx pgx.Tx, userID string, silverChange, goldChange int, actionType, referenceID, description string) (*UserWallet, error) {
	wallet, err := cs.repo.GetWalletForUpdate(ctx, tx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to lock wallet: %w", err)
	}

	if silverChange < 0 && wallet.SilverBalance < int64(-silverChange) {
		return nil, fmt.Errorf("%w: require %d silver, but have %d", apperr.ErrInsufficientBalance, -silverChange, wallet.SilverBalance)
	}
	if goldChange < 0 && wallet.GoldBalance < -goldChange {
		return nil, fmt.Errorf("%w: require %d gold, but have %d", apperr.ErrInsufficientBalance, -goldChange, wallet.GoldBalance)
	}

	if err := cs.repo.UpdateWalletBalance(ctx, tx, userID, silverChange, goldChange); err != nil {
		return nil, fmt.Errorf("failed to update wallet balance: %w", err)
	}

	if err := cs.auditor.LogTransaction(ctx, tx, userID, silverChange, goldChange, actionType, referenceID, description); err != nil {
		return nil, fmt.Errorf("failed to audit transaction: %w", err)
	}

	wallet.SilverBalance += int64(silverChange)
	wallet.GoldBalance += goldChange

	return wallet, nil
}
