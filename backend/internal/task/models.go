package task

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/minhvq36/focus-flow/backend/internal/reward"
)

type TaskStatus string

const (
	TaskStatusActive    TaskStatus = "active"
	TaskStatusPaused    TaskStatus = "paused"
	TaskStatusSubmitted TaskStatus = "submitted"
	TaskStatusGivenUp   TaskStatus = "given_up"
)

type TodoItem struct {
	ID       string     `json:"id"`
	Text     string     `json:"text"`
	Done     bool       `json:"done"`
	Children []TodoItem `json:"children,omitempty"` // indent (checkbox con)
}

type Task struct {
	ID                    string     `json:"id"`
	UserID                string     `json:"user_id"`
	Title                 string     `json:"title"`
	Todos                 []TodoItem `json:"todos"`
	PenaltyMode           bool       `json:"penalty_mode"`
	Status                TaskStatus `json:"status"`
	RegisteredDurationMin int        `json:"registered_duration_min"`
	ActualDurationSec     int        `json:"actual_duration_sec"`
	StartedAt             *time.Time `json:"started_at"` // NULL = paused, submitted, or given up
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
	CompletedAt           *time.Time `json:"completed_at"` // NULL = not completed
}

// TODO: Also need to validate on FE
var uuidRegex = regexp.MustCompile(
	`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`,
)

func isValidUUID(s string) bool {
	return uuidRegex.MatchString(strings.ToLower(s))
}

func validateTodosRecursive(todos []TodoItem, depth int) error {
	if depth > 5 { // TODO: Check if needs to move to config or env
		return fmt.Errorf("Hierarchy depth cannot exceed 5 levels")
	}

	for _, todo := range todos {
		if !isValidUUID(todo.ID) {
			return fmt.Errorf("Invalid todo ID: %s", todo.ID)
		}
		if len(todo.Children) > 0 {
			if err := validateTodosRecursive(todo.Children, depth+1); err != nil {
				return err
			}
		}
	}
	return nil
}

func countTodos(todos []TodoItem) int {
	count := 0
	for _, todo := range todos {
		count++
		count += countTodos(todo.Children)
	}
	return count
}

func ValidateTodos(todos []TodoItem) error {
	if len(todos) == 0 {
		return fmt.Errorf("At least 1 todo is required")
	}

	total := countTodos(todos)
	if total > 50 {
		return fmt.Errorf("Total number of todos cannot exceed 50 (current: %d)", total)
	}

	return validateTodosRecursive(todos, 1) // start from level 1
}

// TODO: To Remove because no more need?
func ValidateTodosAllDone(todos []TodoItem) error {
	for _, todo := range todos {
		if !todo.Done {
			return fmt.Errorf("Todo '%s' is not completed", todo.Text)
		}
		if len(todo.Children) > 0 {
			if err := ValidateTodosAllDone(todo.Children); err != nil {
				return err
			}
		}
	}
	return nil
}

func markAllTodosDone(todos []TodoItem) []TodoItem {
	result := make([]TodoItem, len(todos))
	for i, todo := range todos {
		todo.Done = true
		if len(todo.Children) > 0 {
			todo.Children = markAllTodosDone(todo.Children)
		}
		result[i] = todo
	}
	return result
}

// TaskFilter — parsed from query params by handler, passed down to repository
type TaskFilter struct {
	DateRange string   // "today" | "yesterday" | "7days" | "30days"
	Statuses  []string // empty = all 4 statuses
}

// TaskSummary — Used for list view (Dashboard)
// Does not load full todos, only count
type TaskSummary struct {
	ID                    string     `json:"id"`
	Title                 string     `json:"title"`
	Status                TaskStatus `json:"status"`
	PenaltyMode           bool       `json:"penalty_mode"`
	RegisteredDurationMin int        `json:"registered_duration_min"`
	ActualDurationSec     int        `json:"actual_duration_sec"`
	StartedAt             *time.Time `json:"started_at"`
	CreatedAt             time.Time  `json:"created_at"`
	CompletedAt           *time.Time `json:"completed_at"`
	TodoCount             int        `json:"todo_count"`
	TodoDoneCount         int        `json:"todo_done_count"`
}

type TaskNote struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	UserID    string    `json:"user_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type QuotaToday struct {
	Used  int `json:"used"`
	Limit int `json:"limit"`
}

// --- DTOs (request/response) ---

// CreateTaskRequest — Sent from FE when creating a task
type CreateTaskRequest struct {
	Title                 string     `json:"title"                validate:"required,min=1,max=255"`
	Todos                 []TodoItem `json:"todos"                validate:"required,min=1"`
	RegisteredDurationMin int        `json:"registered_duration_min" validate:"required,min=25,max=480"` // TODO: Check if all these config should add to contract or spec
	PenaltyMode           bool       `json:"penalty_mode"`
}

// UpdateTodosRequest — Sent from FE when autosaving todos
type UpdateTodosRequest struct {
	Todos []TodoItem `json:"todos" validate:"required,min=1,max=50"`
}

// ExtendRequest — Sent from FE when extending time
type ExtendRequest struct {
	AddMinutes int `json:"add_minutes" validate:"required,min=1,max=480"`
}

type EditTaskTitleRequest struct {
	Title string `json:"title" validate:"required,min=1,max=255"`
}

type CreateTaskNoteRequest struct {
	Content string `json:"content" validate:"required,min=1,max=12000"`
}

type UpdateTaskNoteRequest struct {
	Content string `json:"content" validate:"required,min=1,max=12000"`
}

type SubmitResult struct {
	Reward *reward.RollResult
}
