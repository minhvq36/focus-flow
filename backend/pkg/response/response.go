package response

import (
	"encoding/json"
	"net/http"
)

// ErrorPayload — chi tiết lỗi
type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ApiResponse — wrapper chuẩn cho tất cả response
type ApiResponse struct {
	Success bool          `json:"success"`
	Data    interface{}   `json:"data,omitempty"` // object, array, or null, etc.
	Error   *ErrorPayload `json:"error,omitempty"`
}

// JSON — ghi response ra http.ResponseWriter
func JSON(w http.ResponseWriter, status int, resp ApiResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

// Success — trả data thành công
func Success(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, ApiResponse{
		Success: true,
		Data:    data,
	})
}

// Created — trả data vừa tạo
func Created(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, ApiResponse{
		Success: true,
		Data:    data,
	})
}

// NoContent — thành công, không có data (204)
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// Error — trả lỗi với code và message
func Error(w http.ResponseWriter, status int, code, message string) {
	JSON(w, status, ApiResponse{
		Success: false,
		Error: &ErrorPayload{
			Code:    code,
			Message: message,
		},
	})
}

// --- Shorthand errors hay dùng nhất ---
// TODO: To add contract with error from DB
func BadRequest(w http.ResponseWriter, code, message string) {
	Error(w, http.StatusBadRequest, code, message)
}

func Unauthorized(w http.ResponseWriter) {
	Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Bạn cần đăng nhập")
}

func Forbidden(w http.ResponseWriter) {
	Error(w, http.StatusForbidden, "FORBIDDEN", "Bạn không có quyền thực hiện hành động này")
}

func NotFound(w http.ResponseWriter, resource string) {
	Error(w, http.StatusNotFound, "NOT_FOUND", resource+" không tồn tại")
}

func Conflict(w http.ResponseWriter, code, message string) {
	Error(w, http.StatusConflict, code, message)
}

func InternalError(w http.ResponseWriter) {
	Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Có lỗi xảy ra, vui lòng thử lại")
}
