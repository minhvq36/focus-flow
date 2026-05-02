package apperr

import "errors"

// Sentinel errors — dùng để errors.Is() ở handler layer
var (
	ErrNotFound            = errors.New("not found")
	ErrValidation          = errors.New("validation error")
	ErrQuotaExceeded       = errors.New("quota exceeded")
	ErrInvalidState        = errors.New("invalid state")
	ErrInsufficientBalance = errors.New("insufficient balance")
	ErrForbidden           = errors.New("forbidden")
	ErrDuplicate           = errors.New("duplicate")
	ErrNoteLimitExceeded   = errors.New("task note limit exceeded")
	ErrUserNotFound        = errors.New("user not found")
)

type NotFoundError struct{ Resource string }

func (e *NotFoundError) Error() string { return e.Resource + " not found" }
func (e *NotFoundError) Unwrap() error { return ErrNotFound }

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
func (e *ValidationError) Unwrap() error { return ErrValidation }

type QuotaExceededError struct{ Limit int }

func (e *QuotaExceededError) Error() string { return "quota exceeded" }
func (e *QuotaExceededError) Unwrap() error { return ErrQuotaExceeded }

type InvalidStateError struct{ Current, Expected string }

func (e *InvalidStateError) Error() string {
	return "invalid state: " + e.Current + ", expected: " + e.Expected
}
func (e *InvalidStateError) Unwrap() error { return ErrInvalidState }

type ForbiddenError struct{}

func (e *ForbiddenError) Error() string { return "forbidden" }
func (e *ForbiddenError) Unwrap() error { return ErrForbidden }

type NoteLimitExceededError struct{}

func (e *NoteLimitExceededError) Error() string { return "task note limit exceeded" }
func (e *NoteLimitExceededError) Unwrap() error { return ErrNoteLimitExceeded }

type UserNotFoundError struct{}

func (e *UserNotFoundError) Error() string { return "user not found" }
func (e *UserNotFoundError) Unwrap() error { return ErrUserNotFound }
