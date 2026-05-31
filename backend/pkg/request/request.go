package request

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

// Khởi tạo một instance duy nhất cho toàn bộ app để tiết kiệm bộ nhớ
var validate = validator.New()

func init() {
	validate = validator.New()

	// Dạy validator: Hãy dùng tag `json` làm tên field báo lỗi thay vì tên Struct Go
	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" || name == "" {
			return fld.Name
		}
		return name
	})
}

// BindAndValidate đọc JSON từ request, map vào struct và chạy kiểm tra tag validate
// Trả về true nếu thành công, false nếu có lỗi (đã tự động trả HTTP error)
func BindAndValidate(w http.ResponseWriter, r *http.Request, dest interface{}) bool {
	// 1. Parse JSON
	if err := json.NewDecoder(r.Body).Decode(dest); err != nil {
		response.BadRequest(w, "INVALID_JSON", "Invalid JSON format in request body")
		return false
	}

	// 2. Validate struct tags
	if err := validate.Struct(dest); err != nil {
		msg := FormatValidationError(err)
		response.BadRequest(w, "VALIDATION_ERROR", msg)
		return false
	}

	return true
}

// FormatValidationError dịch lỗi của thư viện validator thành chuỗi dễ đọc
func FormatValidationError(err error) string {
	var errs validator.ValidationErrors
	if !errors.As(err, &errs) {
		return err.Error()
	}

	var messages []string
	for _, e := range errs {
		// e.Field() trả về tên field trong Struct (VD: Title, AddMinutes)
		switch e.Tag() {
		case "required":
			messages = append(messages, fmt.Sprintf("'%s' is required", e.Field()))
		case "min":
			messages = append(messages, fmt.Sprintf("'%s' must be at least %s", e.Field(), e.Param()))
		case "max":
			messages = append(messages, fmt.Sprintf("'%s' must be at most %s", e.Field(), e.Param()))
		default:
			messages = append(messages, fmt.Sprintf("'%s' failed on '%s' validation", e.Field(), e.Tag()))
		}
	}

	// Trả về chuỗi lỗi: "'Title' is required, 'AddMinutes' must be at most 120"
	return strings.Join(messages, ", ")
}
