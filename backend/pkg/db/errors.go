// pkg/db/errors.go
// Database error codes mapped from PostgreSQL custom exceptions (Z0001-Z0007)
// These codes originate from SQL migration triggers and functions
package db

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

const (
	// App-level business errors (PostgreSQL custom errcode P0001 with detail code Z0xxx)
	// Mapped from infra/supabase/migrations/*.sql
	
	// Z0001: System initialization error (from 003_init_users.sql)
	// "SYSTEM NOT READY: starter garden is missing"
	ErrZ0001SystemNotReady = "Z0001"
	
	// Z0002: Immutable field error (from 004_init_tasks.sql)
	// "Cannot modify created_at" - system-protected field
	ErrZ0002ImmutableField = "Z0002"
	
	// Z0003: System-managed field error (from 004_init_tasks.sql)
	// "System-managed fields cannot be modified directly"
	// Fields: penalty_mode, status, started_at, actual_duration_sec, completed_at, deleted_at
	ErrZ0003SystemManagedField = "Z0003"
	
	// Z0004: Quota exceeded error (from 005_init_quotas.sql)
	// "User has exceeded the daily task limit"
	ErrZ0004QuotaExceeded = "Z0004"
	
	// Z0005: Ownership error (from 006_init_task_notes.sql)
	// "Task not owned by user"
	ErrZ0005OwnershipError = "Z0005"
	
	// Z0006: Resource limit exceeded (from 006_init_task_notes.sql)
	// "Task note limit exceeded" (max 5 notes per task)
	ErrZ0006ResourceLimitExceeded = "Z0006"
	
	// Z0007: Resource not found (from 009_init_reward_rolls.sql)
	// "User wallet not found"
	ErrZ0007ResourceNotFound = "Z0007"
	
	// Z0008: Invalid state error (from 009_init_reward_rolls.sql)
	// "Task already submitted or not found"
	ErrZ0008InvalidTaskState = "Z0008"

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
