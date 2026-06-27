package profile

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
// 1. PROFILE READ OPERATIONS
// ==========================================

func (r *Repository) GetProfileByID(ctx context.Context, userID string) (*Profile, error) {
	var p Profile
	err := r.db.QueryRow(ctx, `
		SELECT id, display_name, bio, avatar_url, level, created_at, updated_at
		FROM public.users
		WHERE id = $1
	`, userID).Scan(
		&p.ID,
		&p.DisplayName,
		&p.Bio,
		&p.AvatarURL,
		&p.Level,
		&p.CreatedAt,
		&p.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &apperr.NotFoundError{Resource: "profile"}
		}
		return nil, fmt.Errorf("query profile: %w", err)
	}

	return &p, nil
}

// ==========================================
// 2. PROFILE UPDATE OPERATIONS
// ==========================================

// UpdateProfile cập nhật Avatar và Bio (Những mục miễn phí)
func (r *Repository) UpdateProfile(ctx context.Context, userID string, params UpdateProfileParams) (*Profile, error) {
	query := `
		UPDATE public.users
		SET 
			bio = COALESCE($1, bio),
			avatar_url = COALESCE($2, avatar_url)
		WHERE id = $3
		RETURNING id, display_name, bio, avatar_url, level, created_at, updated_at
	`
	var p Profile
	err := r.db.QueryRow(ctx, query, params.Bio, params.AvatarURL, userID).Scan(
		&p.ID, &p.DisplayName, &p.Bio, &p.AvatarURL, &p.Level, &p.CreatedAt, &p.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &apperr.NotFoundError{Resource: "profile"}
		}
		return nil, fmt.Errorf("update profile: %w", err)
	}

	return &p, nil
}

// GetNameChangeCount lấy số lần đã đổi tên để tính phí
func (r *Repository) GetNameChangeCount(ctx context.Context, userID string) (int, error) {
	var count int
	query := `SELECT name_change_count FROM public.user_private WHERE user_id = $1`
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, &apperr.NotFoundError{Resource: "user_private"}
		}
		return 0, fmt.Errorf("get name change count: %w", err)
	}

	return count, nil
}

// ==========================================
// 3. TRANSACTIONAL OPERATIONS
// ==========================================

// UpdateNameAndCount thực hiện đổi tên và tăng biến đếm trong transaction
func (r *Repository) UpdateNameAndCount(ctx context.Context, tx pgx.Tx, userID, newName string) error {
	// 1. Cập nhật tên ở bảng users
	_, err := tx.Exec(ctx, `
		UPDATE public.users 
		SET display_name = $1 
		WHERE id = $2
	`, newName, userID)

	if err != nil {
		return fmt.Errorf("update user display_name: %w", err)
	}

	// 2. Tăng số lần đổi tên ở bảng user_private
	_, err = tx.Exec(ctx, `
		UPDATE public.user_private 
		SET name_change_count = name_change_count + 1, updated_at = NOW() 
		WHERE user_id = $1
	`, userID)

	if err != nil {
		return fmt.Errorf("increment name change count: %w", err)
	}

	return nil
}
