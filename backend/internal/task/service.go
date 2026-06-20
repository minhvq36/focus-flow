package task

import (
	"context"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/internal/reward"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type RepositoryInterface interface {
	GetAllByUser(ctx context.Context, userID string, filter TaskFilter) ([]TaskSummary, error)
	GetByID(ctx context.Context, taskID, userID string) (*Task, error)
	Create(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error)
	UpdateTodos(ctx context.Context, taskID, userID string, req UpdateTodosRequest) error
	UpdateTitle(ctx context.Context, taskID, userID string, req EditTaskTitleRequest) error
	Extend(ctx context.Context, taskID, userID string, req ExtendRequest) error
	ResetTime(ctx context.Context, taskID, userID string) error
	PauseTask(ctx context.Context, taskID, userID string) (int, error)
	Submit(ctx context.Context, tx pgx.Tx, taskID, userID string, todos []TodoItem) error
	GiveUp(ctx context.Context, tx pgx.Tx, taskID, userID string) error
	ResumeTask(ctx context.Context, taskID, userID string) error
	ToggleStar(ctx context.Context, taskID, userID string) (bool, error)
	CreateNote(ctx context.Context, taskID, userID string, req CreateTaskNoteRequest) (*TaskNote, error)
	GetNotes(ctx context.Context, taskID, userID string) ([]*TaskNote, error)
	UpdateNote(ctx context.Context, noteID, userID, taskID string, req UpdateTaskNoteRequest) (*TaskNote, error)
	DeleteNote(ctx context.Context, noteID, userID, taskID string) error
	GetQuotaToday(ctx context.Context, userID string) (used, limit int, err error)
}

type Service struct {
	db       *pgxpool.Pool
	repo     RepositoryInterface
	rewarder *reward.Rewarder
	log      *logger.Logger
}

func NewService(db *pgxpool.Pool, repo RepositoryInterface, rewarder *reward.Rewarder, log *logger.Logger) *Service {
	return &Service{
		db:       db,
		repo:     repo,
		rewarder: rewarder,
		log:      log,
	}
}

// TODO: Check naming of service and repo
func (s *Service) GetUserTasks(ctx context.Context, userID string, filter TaskFilter) ([]TaskSummary, error) {
	return s.repo.GetAllByUser(ctx, userID, filter)
}

func (s *Service) GetTaskByID(ctx context.Context, taskID, userID string) (*Task, error) {
	return s.repo.GetByID(ctx, taskID, userID)
}

func (s *Service) CreateTask(ctx context.Context, userID string, req CreateTaskRequest) (*Task, error) {
	if strings.TrimSpace(req.Title) == "" {
		return nil, &apperr.ValidationError{Message: "Title cannot be empty"}
	}

	if utf8.RuneCountInString(req.Title) > 255 {
		return nil, &apperr.ValidationError{Message: "Title cannot exceed 255 characters"}
	}
	// Validate todos before creating
	if err := ValidateTodos(req.Todos); err != nil {
		return nil, &apperr.ValidationError{Message: err.Error()}
	}
	return s.repo.Create(ctx, userID, req)
}

func (s *Service) UpdateTodos(ctx context.Context, taskID, userID string, req UpdateTodosRequest) error {
	// Validate todos before updating
	if err := ValidateTodos(req.Todos); err != nil {
		return &apperr.ValidationError{Message: err.Error()}
	}

	// Verify task exists and is in editable state
	task, err := s.repo.GetByID(ctx, taskID, userID)
	if err != nil {
		return err
	}

	if task.Status != TaskStatusActive && task.Status != TaskStatusPaused {
		return &apperr.InvalidStateError{Current: string(task.Status), Expected: "active|paused"}
	}

	s.log.Info("UpdateTodos", "user_id", userID, "task_id", taskID)
	return s.repo.UpdateTodos(ctx, taskID, userID, req)
}

func (s *Service) EditTaskTitle(ctx context.Context, taskID, userID string, req EditTaskTitleRequest) error {
	// Validate title
	if strings.TrimSpace(req.Title) == "" {
		return &apperr.ValidationError{Message: "Title cannot be empty"}
	}
	if utf8.RuneCountInString(req.Title) > 255 {
		return &apperr.ValidationError{Message: "Title cannot exceed 255 characters"}
	}

	// Verify task exists and is in editable state
	task, err := s.repo.GetByID(ctx, taskID, userID)
	if err != nil {
		return err
	}

	if task.Status != TaskStatusActive && task.Status != TaskStatusPaused {
		return &apperr.InvalidStateError{Current: string(task.Status), Expected: "active|paused"}
	}

	s.log.Info("EditTaskTitle", "user_id", userID, "task_id", taskID)
	return s.repo.UpdateTitle(ctx, taskID, userID, req)
}

func (s *Service) ExtendTask(ctx context.Context, taskID, userID string, req ExtendRequest) error {
	// Validate extend minutes
	if req.AddMinutes <= 0 {
		return &apperr.ValidationError{Message: "Add minutes must be greater than 0"}
	}

	// Verify task exists and is in editable state
	task, err := s.repo.GetByID(ctx, taskID, userID)
	if err != nil {
		return err
	}

	if task.Status != TaskStatusActive && task.Status != TaskStatusPaused {
		return &apperr.InvalidStateError{Current: string(task.Status), Expected: "active|paused"}
	}

	// Check total registered duration does not exceed 999 minutes
	if task.RegisteredDurationMin+req.AddMinutes > 999 {
		return &apperr.ValidationError{Message: "Total registered duration cannot exceed 999 minutes"}
	}

	s.log.Info("ExtendTask", "user_id", userID, "task_id", taskID)
	return s.repo.Extend(ctx, taskID, userID, req)
}

func (s *Service) ResetTask(ctx context.Context, taskID, userID string) error {
	task, err := s.repo.GetByID(ctx, taskID, userID)
	if err != nil {
		return err
	}

	if task.Status != TaskStatusActive {
		return &apperr.InvalidStateError{Current: string(task.Status), Expected: string(TaskStatusActive)}
	}

	s.log.Info("ResetTask", "user_id", userID, "task_id", taskID)
	return s.repo.ResetTime(ctx, taskID, userID)
}

func (s *Service) PauseTask(ctx context.Context, taskID, userID string) error {
	task, err := s.repo.GetByID(ctx, taskID, userID)
	if err != nil {
		return err
	}

	if task.Status != TaskStatusActive {
		return &apperr.InvalidStateError{Current: string(task.Status), Expected: string(TaskStatusActive)}
	}

	if task.StartedAt == nil {
		return &apperr.InvalidStateError{Current: "timer_stopped", Expected: "timer_running"}
	}

	_, err = s.repo.PauseTask(ctx, taskID, userID)
	return err
}

// TODO: IMPORTANT: Add repo economy transaction audit web submit task
func (s *Service) SubmitTask(ctx context.Context, taskID, userID string) (*SubmitResult, error) {
	// 1. Validate state trước khi mở tx
	task, err := s.repo.GetByID(ctx, taskID, userID)
	if err != nil {
		return nil, err
	}
	if task.Status != TaskStatusActive && task.Status != TaskStatusPaused {
		return nil, &apperr.InvalidStateError{
			Current:  string(task.Status),
			Expected: "active|paused",
		}
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("SubmitTask begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// 2. Submit task
	doneTodos := markAllTodosDone(task.Todos)
	if err := s.repo.Submit(ctx, tx, taskID, userID, doneTodos); err != nil {
		return nil, err
	}

	// 3. Lấy level từ total_exp
	level, err := s.rewarder.GetUserLevel(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	// 4. Grant reward
	reward, err := s.rewarder.Grant(ctx, tx, userID, taskID, level)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("SubmitTask commit: %w", err)
	}

	return &SubmitResult{Reward: reward}, nil
}

func (s *Service) GiveUpTask(ctx context.Context, taskID, userID string) (*reward.PenaltyResult, error) {
	// 1. Đã có task, validate state
	task, err := s.repo.GetByID(ctx, taskID, userID)
	if err != nil {
		return nil, err
	}
	if task.Status != TaskStatusActive && task.Status != TaskStatusPaused {
		return nil, &apperr.InvalidStateError{
			Current:  string(task.Status),
			Expected: "active|paused",
		}
	}

	// 2. Không penalty mode — không cần tx
	if !task.PenaltyMode {
		return nil, s.repo.GiveUp(ctx, nil, taskID, userID)
	}

	// 3. Penalty mode — cần tx
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("GiveUpTask begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := s.repo.GiveUp(ctx, tx, taskID, userID); err != nil {
		return nil, err
	}

	penalty, err := s.rewarder.Penalty(ctx, tx, userID, taskID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("GiveUpTask commit: %w", err)
	}

	return penalty, nil
}

func (s *Service) ResumeTask(ctx context.Context, taskID, userID string) error {
	task, err := s.repo.GetByID(ctx, taskID, userID)
	if err != nil {
		return err
	}

	// TODO: Future allow resume given_up, submitted, not only paused
	if task.Status != TaskStatusPaused {
		return &apperr.InvalidStateError{Current: string(task.Status), Expected: string(TaskStatusPaused)}
	}

	return s.repo.ResumeTask(ctx, taskID, userID)
}

func (s *Service) ToggleStar(ctx context.Context, taskID, userID string) (bool, error) {
	// Verify task exists
	_, err := s.repo.GetByID(ctx, taskID, userID)
	if err != nil {
		return false, err
	}

	s.log.Info("ToggleStar", "user_id", userID, "task_id", taskID)
	return s.repo.ToggleStar(ctx, taskID, userID)
}

func (s *Service) CreateNote(ctx context.Context, taskID, userID string, req CreateTaskNoteRequest) (*TaskNote, error) {
	if strings.TrimSpace(req.Content) == "" {
		return nil, &apperr.ValidationError{Message: "Content cannot be empty"}
	}
	if utf8.RuneCountInString(req.Content) > 12000 {
		return nil, &apperr.ValidationError{Message: "Content exceeds 12000 characters"}
	}
	return s.repo.CreateNote(ctx, taskID, userID, req)
}

func (s *Service) DeleteNote(ctx context.Context, noteID, userID, taskID string) error {
	return s.repo.DeleteNote(ctx, noteID, userID, taskID)
}

func (s *Service) GetNotes(ctx context.Context, taskID, userID string) ([]*TaskNote, error) {
	return s.repo.GetNotes(ctx, taskID, userID)
}

func (s *Service) UpdateNote(ctx context.Context, noteID, userID, taskID string, req UpdateTaskNoteRequest) (*TaskNote, error) {
	if strings.TrimSpace(req.Content) == "" {
		return nil, &apperr.ValidationError{Message: "Content cannot be empty"}
	}
	if utf8.RuneCountInString(req.Content) > 12000 {
		return nil, &apperr.ValidationError{Message: "Content exceeds 12000 characters"}
	}
	return s.repo.UpdateNote(ctx, noteID, userID, taskID, req)
}

func (s *Service) GetQuotaToday(ctx context.Context, userID string) (*QuotaToday, error) {
	used, limit, err := s.repo.GetQuotaToday(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &QuotaToday{Used: used, Limit: limit}, nil
}
