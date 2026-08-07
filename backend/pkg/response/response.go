package response

import (
	"encoding/json"
	"net/http"
	"strconv"
)

// ErrorPayload — Error details
type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ApiResponse — Standard wrapper for all responses
type ApiResponse struct {
	Success bool          `json:"success"`
	Data    interface{}   `json:"data,omitempty"` // object, array, or null, etc.
	Error   *ErrorPayload `json:"error,omitempty"`
}

// JSON — Write response to http.ResponseWriter
func JSON(w http.ResponseWriter, status int, resp ApiResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

// Success — Return successful data
func Success(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, ApiResponse{
		Success: true,
		Data:    data,
	})
}

// Created — Return newly created data
func Created(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, ApiResponse{
		Success: true,
		Data:    data,
	})
}

// NoContent — Success with no data (204)
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// Error — Return error with code and message
func Error(w http.ResponseWriter, status int, code, message string) {
	JSON(w, status, ApiResponse{
		Success: false,
		Error: &ErrorPayload{
			Code:    code,
			Message: message,
		},
	})
}

// --- Most common shorthand errors ---
// TODO: To add contract with error from DB
func BadRequest(w http.ResponseWriter, code, message string) {
	Error(w, http.StatusBadRequest, code, message)
}

func Unauthorized(w http.ResponseWriter) {
	Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "You need to login")
}

func Forbidden(w http.ResponseWriter) {
	Error(w, http.StatusForbidden, "FORBIDDEN", "You don't have permission to perform this action")
}

func NotFound(w http.ResponseWriter, resource string) {
	Error(w, http.StatusNotFound, "NOT_FOUND", resource+" does not exist")
}

func Conflict(w http.ResponseWriter, code, message string) {
	Error(w, http.StatusConflict, code, message)
}

// TooManyRequests — rate limit vượt ngưỡng (429).
// retryAfterSeconds > 0 sẽ gắn header Retry-After để FE biết chờ bao lâu.
func TooManyRequests(w http.ResponseWriter, retryAfterSeconds int) {
	if retryAfterSeconds > 0 {
		w.Header().Set("Retry-After", strconv.Itoa(retryAfterSeconds))
	}
	Error(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many requests, please slow down")
}

func InternalError(w http.ResponseWriter) {
	Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An error occurred, please try again")
}
