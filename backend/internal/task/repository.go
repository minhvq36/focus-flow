package task

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetAllByUser(ctx context.Context, userID string) ([]Task, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, title, todos, penalty_mode, status,
		       registered_duration_min, actual_duration_sec,
		       started_at, created_at, updated_at, completed_at
		FROM tasks
		WHERE user_id = $1
		  AND deleted_at IS NULL
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("GetAllByUser: %w", err)
	}
	defer rows.Close()

	var tasks []Task // TODO: Dont need deleted_ate for now because we don't handle restore for this phase
	for rows.Next() {
		var t Task
		var todosJSON []byte
		err := rows.Scan(
			&t.ID, &t.UserID, &t.Title, &todosJSON, &t.PenaltyMode,
			&t.Status, &t.RegisteredDurationMin, &t.ActualDurationSec,
			&t.StartedAt, &t.CreatedAt, &t.UpdatedAt, &t.CompletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("GetAllByUser scan: %w", err)
		}
		if err := json.Unmarshal(todosJSON, &t.Todos); err != nil {
			return nil, fmt.Errorf("GetAllByUser unmarshal todos: %w", err)
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}
