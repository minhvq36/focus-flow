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

// UpdateBioParams updates only the user bio.
type UpdateBioParams struct {
	Bio *string `json:"bio" validate:"omitempty,max=255"`
}

// UpdateAvatarURLParams updates only the user avatar URL.
type UpdateAvatarURLParams struct {
	AvatarURL *string `json:"avatar_url" validate:"omitempty,url"`
}

// ChangeNameParams is dedicated to display name changes and may incur a fee.
type ChangeNameParams struct {
	DisplayName string `json:"display_name" validate:"required,min=1,max=50"`
}
