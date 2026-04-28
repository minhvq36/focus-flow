package task

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// TODO: Add filter by date, status, pagination, etc.
// GetAllByUser — list view, không load todos đầy đủ
func (r *Repository) GetAllByUser(ctx context.Context, userID string) ([]TaskSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, title, status,
		       registered_duration_min, actual_duration_sec,
		       started_at, created_at, completed_at,
		       jsonb_array_length(todos) as todo_count,
		       (
		           SELECT COUNT(*)
		           FROM jsonb_array_elements(todos) t
		           WHERE (t->>'done')::boolean = true
		       ) as todo_done_count
		FROM tasks
		WHERE user_id = $1
		  AND deleted_at IS NULL
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("GetAllByUser: %w", err)
	}
	defer rows.Close()

	var tasks []TaskSummary
	for rows.Next() {
		var t TaskSummary
		err := rows.Scan(
			&t.ID, &t.Title, &t.Status,
			&t.RegisteredDurationMin, &t.ActualDurationSec,
			&t.StartedAt, &t.CreatedAt, &t.CompletedAt,
			&t.TodoCount, &t.TodoDoneCount,
		)
		if err != nil {
			return nil, fmt.Errorf("GetAllByUser scan: %w", err)
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}
