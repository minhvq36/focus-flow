package task

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	dbpkg "github.com/minhvq36/focus-flow/backend/pkg/db"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type Repository struct {
	db  *pgxpool.Pool
	log *logger.Logger
}

func NewRepository(db *pgxpool.Pool, log *logger.Logger) *Repository {
	return &Repository{
		db:  db,
		log: log,
	}
}

// TODO: Add filter by date, status, pagination, etc. for endpoints
// GetAllByUser — list view, does not load full todos, TODAY
func (r *Repository) GetAllByUser(ctx context.Context, userID string) ([]TaskSummary, error) {
	// TODO: Need to contract todos with FE
	r.log.Info("GetAllByUser", "user_id", userID)

	rows, err := r.db.Query(ctx, `
		SELECT id, title, status, penalty_mode,
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
		  AND created_at::date = CURRENT_DATE
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		r.log.Error("GetAllByUser failed", "user_id", userID, "error", err.Error())
		return nil, fmt.Errorf("GetAllByUser: %w", err)
	}
	defer rows.Close()
	var tasks []TaskSummary
	for rows.Next() {
		var t TaskSummary
		err := rows.Scan(
			&t.ID, &t.Title, &t.Status, &t.PenaltyMode,
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

func (r *Repository) GetByID(ctx context.Context, taskID, userID string) (*Task, error) {
	var t Task
	var todosJSON []byte

	r.log.Info("GetByID", "user_id", userID, "task_id", taskID)

	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, title, todos, penalty_mode, status,
		       registered_duration_min, actual_duration_sec,
		       started_at, created_at, updated_at, completed_at
		FROM tasks
		WHERE id = $1
		  AND user_id = $2
		  AND deleted_at IS NULL
	`, taskID, userID).Scan(
		&t.ID, &t.UserID, &t.Title, &todosJSON, &t.PenaltyMode,
		&t.Status, &t.RegisteredDurationMin, &t.ActualDurationSec,
		&t.StartedAt, &t.CreatedAt, &t.UpdatedAt, &t.CompletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &apperr.NotFoundError{Resource: "Task"}
		}
		r.log.Error("GetByID failed", "user_id", userID, "task_id", taskID, "error", err.Error())
		return nil, fmt.Errorf("GetByID: %w", err)
	}
	if err := json.Unmarshal(todosJSON, &t.Todos); err != nil {
		return nil, fmt.Errorf("GetByID unmarshal todos: %w", err)
	}
	return &t, nil
}

// TODO: quota exceed trigger db single source of truth, REPO to convert error
func (r *Repository) Create(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error) {
	todosJSON, err := json.Marshal(req.Todos)
	if err != nil {
		return nil, fmt.Errorf("Create marshal todos: %w", err)
	}

	r.log.Info("Create", "user_id", userID, "title", req.Title)

	var t Task
	var todosRaw []byte

	err = r.db.QueryRow(ctx, `
		INSERT INTO tasks (user_id, title, todos, penalty_mode, status, registered_duration_min)
		VALUES ($1, $2, $3, $4, 'active', $5)
		RETURNING id, user_id, title, todos, penalty_mode, status,
		          registered_duration_min, actual_duration_sec,
		          started_at, created_at, updated_at, completed_at
	`, userID, req.Title, todosJSON, req.PenaltyMode, req.RegisteredDurationMin).Scan(
		&t.ID, &t.UserID, &t.Title, &todosRaw, &t.PenaltyMode,
		&t.Status, &t.RegisteredDurationMin, &t.ActualDurationSec,
		&t.StartedAt, &t.CreatedAt, &t.UpdatedAt, &t.CompletedAt,
	)
	if err != nil {
		switch dbpkg.AppErrCode(err) {
		case dbpkg.ErrZ0004QuotaExceeded:
			return nil, &apperr.QuotaExceededError{}
		}
		r.log.Error("Create failed", "user_id", userID, "error", err.Error())
		return nil, fmt.Errorf("Create: %w", err)
	}

	if err := json.Unmarshal(todosRaw, &t.Todos); err != nil {
		return nil, fmt.Errorf("Create unmarshal todos: %w", err)
	}
	return &t, nil
}

// UpdateTodos — autosave todos from focus screen
func (r *Repository) UpdateTodos(ctx context.Context, taskID, userID string, req UpdateTodosRequest) error {
	todosJSON, err := json.Marshal(req.Todos)
	if err != nil {
		return fmt.Errorf("UpdateTodos marshal: %w", err)
	}

	result, err := r.db.Exec(ctx, `
		UPDATE tasks
		SET todos = $1
		WHERE id = $2
		  AND user_id = $3
		  AND status = 'active'
		  AND deleted_at IS NULL
	`, todosJSON, taskID, userID)
	if err != nil {
		return fmt.Errorf("UpdateTodos: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &apperr.NotFoundError{Resource: "Task"}
	}
	return nil
}

// Extend time
func (r *Repository) Extend(ctx context.Context, taskID, userID string, req ExtendRequest) error {
	result, err := r.db.Exec(ctx, `
		UPDATE tasks
		SET registered_duration_min = registered_duration_min + $1
		WHERE id = $2
		  AND user_id = $3
		  AND status = 'active'
		  AND deleted_at IS NULL
	`, req.AddMinutes, taskID, userID)
	if err != nil {
		return fmt.Errorf("Extend: %w", err)
	}
	if result.RowsAffected() == 0 {
		return &apperr.NotFoundError{Resource: "Task"}
	}
	return nil
}

func (r *Repository) PauseTask(ctx context.Context, taskID, userID string, req PauseTaskRequest) (int, error) {
	var newDuration int
	err := r.db.QueryRow(ctx, `
        UPDATE tasks
        SET status = 'paused',
            actual_duration_sec = LEAST(
                actual_duration_sec + EXTRACT(EPOCH FROM (NOW() - started_at))::int,
                registered_duration_min * 60
            ),
			todos = $3,
            started_at = NULL
        WHERE id = $1
          AND user_id = $2
          AND status = 'active'
          AND started_at IS NOT NULL
          AND deleted_at IS NULL
        RETURNING actual_duration_sec
    `, taskID, userID, req.Todos).Scan(&newDuration)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, &apperr.NotFoundError{Resource: "Task"}
		}
		return 0, fmt.Errorf("PauseTask: %w", err)
	}
	return newDuration, nil
}

func (r *Repository) Submit(ctx context.Context, taskID, userID string, req SubmitTaskRequest) error {
	// Allow paused submission
	result, err := r.db.Exec(ctx, `
        UPDATE tasks
        SET status = 'submitted',
            actual_duration_sec = LEAST(
                actual_duration_sec + COALESCE(EXTRACT(EPOCH FROM (NOW() - started_at))::int, 0),
                registered_duration_min * 60
            ),
			todos = $3,
            started_at = NULL,
            completed_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND status in ('active', 'paused')
          AND deleted_at IS NULL
    `, taskID, userID, req.Todos)
	if err != nil {
		return fmt.Errorf("Submit: %w", err)
	}
	if result.RowsAffected() == 0 {
		return &apperr.NotFoundError{Resource: "Task"}
	}
	return nil
}

func (r *Repository) GiveUp(ctx context.Context, taskID, userID string, req GiveUpTaskRequest) error {
	result, err := r.db.Exec(ctx, `
        UPDATE tasks
        SET status = 'given_up',
            actual_duration_sec = LEAST(
                actual_duration_sec + EXTRACT(EPOCH FROM (NOW() - started_at))::int,
                registered_duration_min * 60
            ),
			todos = $3,
            started_at = NULL,
            completed_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND status = 'active'
		  AND started_at IS NOT NULL
          AND deleted_at IS NULL
    `, taskID, userID, req.Todos)
	if err != nil {
		return fmt.Errorf("GiveUp: %w", err)
	}
	if result.RowsAffected() == 0 {
		return &apperr.NotFoundError{Resource: "Task"}
	}
	return nil
}

func (r *Repository) ResumeTask(ctx context.Context, taskID, userID string) error {
	// TODO: Future allow resume given_up, submitted, not only paused
	result, err := r.db.Exec(ctx, `
        UPDATE tasks
        SET status = 'active',
            started_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND status = 'paused'
          AND deleted_at IS NULL
    `, taskID, userID)
	if err != nil {
		return fmt.Errorf("ResumeTask: %w", err)
	}
	if result.RowsAffected() == 0 {
		return &apperr.NotFoundError{Resource: "Task"}
	}
	return nil
}

func (r *Repository) CreateNote(ctx context.Context, taskID, userID string, req CreateTaskNoteRequest) (*TaskNote, error) {
	var n TaskNote
	err := r.db.QueryRow(ctx, `
        INSERT INTO task_notes (task_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, task_id, user_id, content, created_at, updated_at
    `, taskID, userID, req.Content).Scan(
		&n.ID, &n.TaskID, &n.UserID, &n.Content, &n.CreatedAt, &n.UpdatedAt,
	)
	if err != nil {
		switch dbpkg.AppErrCode(err) {
		case dbpkg.ErrZ0005OwnershipError:
			return nil, &apperr.ForbiddenError{}
		case dbpkg.ErrZ0006ResourceLimitExceeded:
			return nil, &apperr.NoteLimitExceededError{}
		}
		return nil, fmt.Errorf("CreateNote: %w", err)
	}
	return &n, nil
}

func (r *Repository) GetNotes(ctx context.Context, taskID, userID string) ([]*TaskNote, error) {
	// TODO: Check if in the future need to check if task soft deleted
	rows, err := r.db.Query(ctx, `
        SELECT id, task_id, user_id, content, created_at, updated_at
        FROM task_notes
        WHERE task_id = $1 AND user_id = $2
        ORDER BY created_at ASC
    `, taskID, userID)
	if err != nil {
		return nil, fmt.Errorf("GetNotes: %w", err)
	}
	defer rows.Close()

	var notes []*TaskNote
	for rows.Next() {
		var n TaskNote
		if err := rows.Scan(&n.ID, &n.TaskID, &n.UserID, &n.Content, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, fmt.Errorf("GetNotes scan: %w", err)
		}
		notes = append(notes, &n)
	}
	return notes, nil
}

func (r *Repository) UpdateNote(ctx context.Context, noteID, userID, taskID string, req UpdateTaskNoteRequest) (*TaskNote, error) {
	var n TaskNote
	err := r.db.QueryRow(ctx, `
        UPDATE task_notes
        SET content = $1
        WHERE id = $2 AND user_id = $3 AND task_id = $4
        RETURNING id, task_id, user_id, content, created_at, updated_at
    `, req.Content, noteID, userID, taskID).Scan(
		&n.ID, &n.TaskID, &n.UserID, &n.Content, &n.CreatedAt, &n.UpdatedAt,
	)
	if err != nil {
		if dbpkg.IsNoRows(err) {
			return nil, &apperr.NotFoundError{Resource: "Note"}
		}
		return nil, fmt.Errorf("UpdateNote: %w", err)
	}
	return &n, nil
}

func (r *Repository) DeleteNote(ctx context.Context, noteID, userID, taskID string) error {
	tag, err := r.db.Exec(ctx, `
        DELETE FROM task_notes
        WHERE id = $1 AND user_id = $2 AND task_id = $3
    `, noteID, userID, taskID)
	if err != nil {
		return fmt.Errorf("DeleteNote: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return &apperr.NotFoundError{Resource: "Note"}
	}
	return nil
}

func (r *Repository) GetQuotaToday(ctx context.Context, userID string) (used, limit int, err error) {
	// Keep the system use UTC
	err = r.db.QueryRow(ctx, `
        SELECT 
            COALESCE(q.usage_count, 0),
            p.daily_task_limit
        FROM user_private up
        JOIN plan_quotas p ON p.plan_type = up.plan_type
        LEFT JOIN task_daily_quotas q 
            ON q.user_id = up.user_id AND q.target_date = CURRENT_DATE
        WHERE up.user_id = $1
    `, userID).Scan(&used, &limit)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, 0, &apperr.UserNotFoundError{}
		}
		return 0, 0, err
	}
	return used, limit, nil
}
