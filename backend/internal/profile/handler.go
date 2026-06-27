package profile

import (
	"context"
	"errors"
	"net/http"

	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/request"
	"github.com/minhvq36/focus-flow/backend/pkg/response"
)

// ServiceInterface định nghĩa các hàm mà Handler cần gọi từ Service
type ServiceInterface interface {
	GetProfile(ctx context.Context, userID string) (*Profile, error)
	UpdateProfile(ctx context.Context, userID string, params UpdateProfileParams) (*Profile, error)
	ChangeDisplayName(ctx context.Context, userID string, params ChangeNameParams) error
}

type Handler struct {
	service ServiceInterface
	log     *logger.Logger
}

func NewHandler(service ServiceInterface, log *logger.Logger) *Handler {
	return &Handler{
		service: service,
		log:     log,
	}
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	h.log.Info("GetProfile", "user_id", userID)
	profile, err := h.service.GetProfile(r.Context(), userID)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Profile")
		default:
			h.log.Error("GetProfile failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, profile)
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	var req UpdateProfileParams
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	h.log.Info("UpdateProfile", "user_id", userID)
	profile, err := h.service.UpdateProfile(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Profile")
		default:
			h.log.Error("UpdateProfile failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, profile)
}

func (h *Handler) ChangeDisplayName(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		response.Unauthorized(w)
		return
	}

	var req ChangeNameParams
	if ok := request.BindAndValidate(w, r, &req); !ok {
		return
	}

	h.log.Info("ChangeDisplayName", "user_id", userID, "new_name", req.DisplayName)
	err := h.service.ChangeDisplayName(r.Context(), userID, req)
	if err != nil {
		switch {
		// Bắt lỗi Validation (ví dụ: chứa từ cấm, độ dài không hợp lệ)
		case errors.Is(err, apperr.ErrValidation):
			response.BadRequest(w, "VALIDATION_ERROR", err.Error())

		// Bắt lỗi không đủ tiền từ module Economy truyền lên
		case errors.Is(err, apperr.ErrInsufficientBalance):
			response.BadRequest(w, "INSUFFICIENT_BALANCE", err.Error())
			// Lưu ý: Có thể dùng response.PaymentRequired hoặc Conflict tùy cách bạn định nghĩa hàm trong package response

		case errors.Is(err, apperr.ErrNotFound):
			response.NotFound(w, "Profile")

		default:
			h.log.Error("ChangeDisplayName failed", "user_id", userID, "error", err.Error())
			response.InternalError(w)
		}
		return
	}

	response.Success(w, map[string]string{"message": "Display name changed successfully"})
}
