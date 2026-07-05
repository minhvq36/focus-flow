package economy

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

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

// Thêm referenceID vào tham số
func (a *Auditor) LogTransaction(ctx context.Context, tx pgx.Tx, userID string, silverChange, goldChange int, actionType, referenceID, desc string) error {
	if silverChange == 0 && goldChange == 0 {
		return nil
	}

	// Xử lý referenceID thành pointer (bảo vệ trường hợp truyền chuỗi rỗng)
	var ref *string
	if referenceID != "" {
		ref = &referenceID
	}

	txn := EconomyTransaction{
		UserID:       userID,
		SilverChange: silverChange,
		GoldChange:   goldChange,
		ActionType:   actionType,
		ReferenceID:  ref,
		Description:  desc,
	}

	if err := a.repo.RecordTransaction(ctx, tx, txn); err != nil {
		a.log.Error("Failed to record economy transaction", "user_id", userID, "error", err)
		return err
	}

	return nil
}
