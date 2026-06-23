package economy

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

// CurrencyService quản lý dòng tiền ra/vào của user
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

// ChangeBalance thay đổi số dư và tự động ghi log.
// Truyền số ÂM vào silver/gold nếu là trừ tiền (VD: mua đồ).
// Truyền số DƯƠNG nếu là nhận tiền (VD: bán đồ, làm task).
func (cs *CurrencyService) ChangeBalance(ctx context.Context, tx pgx.Tx, userID string, silverChange, goldChange int, actionType, description string) (*UserWallet, error) {
	// 1. Khóa Ví của User để tính toán an toàn
	wallet, err := cs.repo.GetWalletForUpdate(ctx, tx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to lock wallet: %w", err)
	}

	// 2. Kiểm tra xem có đủ tiền để trừ không (nếu là số âm)
	if silverChange < 0 && wallet.SilverBalance < int64(-silverChange) {
		return nil, fmt.Errorf("not enough silver")
	}
	if goldChange < 0 && wallet.GoldBalance < -goldChange {
		return nil, fmt.Errorf("not enough gold")
	}

	// 3. Cập nhật số dư trong DB
	if err := cs.repo.UpdateWalletBalance(ctx, tx, userID, silverChange, goldChange); err != nil {
		return nil, fmt.Errorf("failed to update wallet balance: %w", err)
	}

	// 4. Tự động ghi Log giao dịch
	if err := cs.auditor.LogTransaction(ctx, tx, userID, silverChange, goldChange, actionType, description); err != nil {
		return nil, fmt.Errorf("failed to audit transaction: %w", err)
	}

	// 5. Trả về ví mới (dự tính) để các Service khác dùng mà không cần query lại
	wallet.SilverBalance += int64(silverChange)
	wallet.GoldBalance += goldChange

	return wallet, nil
}
