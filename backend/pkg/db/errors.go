// pkg/db/errors.go
package db

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

const (
	// App-level business errors (P0001 + detail errcode=Z0xxx)
	ErrZ0001QuotaExceeded       = "Z0001"
	ErrZ0002Forbidden           = "Z0002"
	ErrZ0003InvalidState        = "Z0003"
	ErrZ0004InsufficientBalance = "Z0004"
	ErrZ0005NotFound            = "Z0005"
	ErrZ0006Duplicate           = "Z0006"
	ErrZ0007MarketplacePrice    = "Z0007"

	// Postgres native SQLSTATE — for future migration to BE validation
	PgErrUniqueViolation     = "23505"
	PgErrForeignKeyViolation = "23503"
	PgErrNotNullViolation    = "23502"
	PgErrCheckViolation      = "23514"
)

// pkg/db/errors.go

func AppErrCode(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code
	}
	return ""
}

// For future
func PgSQLState(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code
	}
	return ""
}
