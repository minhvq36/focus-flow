package profile

import "time"

// Profile trả về cho client
type Profile struct {
	ID          string    `json:"id"`
	DisplayName string    `json:"display_name"`
	Bio         *string   `json:"bio"`
	AvatarURL   *string   `json:"avatar_url"`
	Level       int       `json:"level"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UpdateProfileParams (Chỉ dành cho Bio, Avatar - Miễn phí)
type UpdateProfileParams struct {
	Bio       *string `json:"bio" validate:"omitempty,max=255"`
	AvatarURL *string `json:"avatar_url" validate:"omitempty,url"`
}

// ChangeNameParams (Dành riêng cho đổi tên - Có thể tốn phí)
type ChangeNameParams struct {
	DisplayName string `json:"display_name" validate:"required,min=1,max=50"`
}
