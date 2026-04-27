package task

import (
	"fmt"
	"regexp"
	"strings"
	"time"
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

// Task — mapping với bảng tasks trong DB
type Task struct {
	ID                    string     `json:"id"`
	UserID                string     `json:"user_id"`
	Title                 string     `json:"title"`
	Todos                 []TodoItem `json:"todos"`
	PenaltyMode           bool       `json:"penalty_mode"`
	Status                TaskStatus `json:"status"`
	RegisteredDurationMin int        `json:"registered_duration_min"`
	ActualDurationSec     int        `json:"actual_duration_sec"`
	StartedAt             *time.Time `json:"started_at"` // NULL = đang dừng
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
	CompletedAt           *time.Time `json:"completed_at"` // NULL = chưa xong
}

// TODO: Also need to validate on FE
var uuidRegex = regexp.MustCompile(
	`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`,
)

func isValidUUID(s string) bool {
	return uuidRegex.MatchString(strings.ToLower(s))
}

func validateTodosRecursive(todos []TodoItem, depth int) error {
	if depth > 5 { // TODO: Check if need to move to config or env
		return fmt.Errorf("độ sâu phân cấp không được vượt quá 5 cấp")
	}

	for _, todo := range todos {
		if !isValidUUID(todo.ID) {
			return fmt.Errorf("todo ID không hợp lệ: %s", todo.ID)
		}
		if strings.TrimSpace(todo.Text) == "" {
			return fmt.Errorf("todo không được để trống text")
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
		return fmt.Errorf("cần ít nhất 1 todo")
	}

	total := countTodos(todos)
	if total > 50 {
		return fmt.Errorf("tổng số todo không được vượt quá 50 (hiện tại: %d)", total)
	}

	return validateTodosRecursive(todos, 1) // bắt đầu từ cấp 1
}

func ValidateTodosAllDone(todos []TodoItem) error {
	for _, todo := range todos {
		if !todo.Done {
			return fmt.Errorf("todo '%s' chưa hoàn thành", todo.Text)
		}
		if len(todo.Children) > 0 {
			if err := ValidateTodosAllDone(todo.Children); err != nil {
				return err
			}
		}
	}
	return nil
}

type TaskNote struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	UserID    string    `json:"user_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// --- DTOs (request/response) ---

// CreateTaskRequest — FE gửi lên khi tạo task
type CreateTaskRequest struct {
	Title                 string     `json:"title"                validate:"required,min=1,max=255"`
	Todos                 []TodoItem `json:"todos"                validate:"required,min=1"`
	RegisteredDurationMin int        `json:"registered_duration_min" validate:"required,min=25"` // TODO: Check if all these config should add to contract or spec
}

// AddNoteRequest — FE gửi lên khi thêm note
type AddNoteRequest struct {
	Content string `json:"content" validate:"required,min=1,max=22000"`
}

// UpdateTodosRequest — FE gửi lên khi autosave todos
type UpdateTodosRequest struct {
	Todos []TodoItem `json:"todos" validate:"required,min=1,max=50"`
}

// ExtendRequest — FE gửi lên khi extend thêm thời gian
type ExtendRequest struct {
	AddMinutes int `json:"add_minutes" validate:"required,min=1"`
}
