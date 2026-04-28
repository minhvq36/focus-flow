package task

import "errors"

var (
	ErrNotFound   = errors.New("task not found")
	ErrValidation = errors.New("validation error")
)

type NotFoundError struct{}

func (e *NotFoundError) Error() string { return ErrNotFound.Error() }
func (e *NotFoundError) Unwrap() error { return ErrNotFound }

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }
func (e *ValidationError) Unwrap() error { return ErrValidation }
