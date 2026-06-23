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

var validate = validator.New()

func init() {
	validate = validator.New()
	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" || name == "" {
			return fld.Name
		}
		return name
	})
}

func BindAndValidate(w http.ResponseWriter, r *http.Request, dest interface{}) bool {
	// 1. Parse JSON
	if err := json.NewDecoder(r.Body).Decode(dest); err != nil {
		response.BadRequest(w, "INVALID_JSON", "Invalid JSON format in request body")
		return false
	}

	if err := validate.Struct(dest); err != nil {
		msg := FormatValidationError(err)
		response.BadRequest(w, "VALIDATION_ERROR", msg)
		return false
	}

	return true
}

func FormatValidationError(err error) string {
	var errs validator.ValidationErrors
	if !errors.As(err, &errs) {
		return err.Error()
	}

	var messages []string
	for _, e := range errs {
		switch e.Tag() {
		case "required":
			messages = append(messages, fmt.Sprintf("'%s' is required", e.Field()))
		case "min":
			messages = append(messages, fmt.Sprintf("'%s' must be at least %s", e.Field(), e.Param()))
		case "max":
			messages = append(messages, fmt.Sprintf("'%s' must be at most %s", e.Field(), e.Param()))
		case "uuid":
			messages = append(messages, fmt.Sprintf("'%s' must be a valid UUID", e.Field()))
		case "oneof":
			allowedValues := strings.ReplaceAll(e.Param(), " ", ", ")
			messages = append(messages, fmt.Sprintf("'%s' must be one of: [%s]", e.Field(), allowedValues))
		default:
			messages = append(messages, fmt.Sprintf("'%s' failed on '%s' validation", e.Field(), e.Tag()))
		}
	}

	return strings.Join(messages, ", ")
}
