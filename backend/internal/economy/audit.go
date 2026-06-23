package economy

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

// Auditor chịu trách nhiệm ghi log giao dịch
type Auditor struct {
	repo RepositoryInterface
	log  *logger.Logger
}

func NewAuditor(repo RepositoryInterface, log *logger.Logger) *Auditor {
	return &Auditor{
		repo: repo,
		log:  log,
	}
}

// LogTransaction lưu lại biến động số dư. (Bắt buộc chạy trong 1 transaction)
func (a *Auditor) LogTransaction(ctx context.Context, tx pgx.Tx, userID string, silverChange, goldChange int, actionType, desc string) error {
	// Bỏ qua nếu không có biến động tiền tệ
	if silverChange == 0 && goldChange == 0 {
		return nil
	}

	txn := EconomyTransaction{
		UserID:       userID,
		SilverChange: silverChange,
		GoldChange:   goldChange,
		ActionType:   actionType,
		Description:  desc,
	}

	if err := a.repo.RecordTransaction(ctx, tx, txn); err != nil {
		a.log.Error("Failed to record economy transaction", "user_id", userID, "error", err)
		return err
	}

	return nil
}
