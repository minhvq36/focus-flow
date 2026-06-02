package garden

import (
	"time"
)

// --- DB row types ---

type UserGarden struct {
	ID             string     `db:"id"`
	UserID         string     `db:"user_id"`
	GardenID       string     `db:"garden_id"`
	ExpansionLevel int        `db:"expansion_level"`
	CreatedAt      time.Time  `db:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at"`
	LastWateredAt  *time.Time `db:"last_watered_at"`
	AutoWaterUntil *time.Time `db:"auto_water_until"`
}

type GardenListItem struct {
	ID             string `json:"id"`
	GardenID       string `json:"garden_id"`
	GardenIndex    int    `json:"garden_index"`
	ExpansionLevel int    `json:"expansion_level"`
	IsExpandable   bool   `json:"is_expandable"`
	CanExpand      bool   `json:"can_expand"`
}

type Placement struct {
	ID              string     `db:"id"`
	UserGardenID    string     `db:"user_garden_id"`
	InventoryID     string     `db:"inventory_id"`
	ItemID          string     `db:"item_id"` // joined từ inventory
	AssetKey        string     `db:"asset_key"`
	GridX           int        `db:"grid_x"`
	GridY           int        `db:"grid_y"`
	ItemWidth       int        `db:"item_width"`
	ItemHeight      int        `db:"item_height"`
	EffectiveWidth  int        `db:"effective_width"` // sau khi xoay
	EffectiveHeight int        `db:"effective_height"`
	Rotation        int        `db:"rotation"`
	HealthStatus    string     `db:"health_status"`
	WiltedAt        *time.Time `db:"wilted_at"`
	PlacedAt        time.Time  `db:"placed_at"`
}

// --- Response types ---

type PlacementResponse struct {
	ID              string     `json:"id"`
	InventoryID     string     `json:"inventory_id"`
	ItemID          string     `json:"item_id"`
	AssetKey        string     `json:"asset_key"`
	GridX           int        `json:"grid_x"`
	GridY           int        `json:"grid_y"`
	ItemWidth       int        `json:"item_width"`
	ItemHeight      int        `json:"item_height"`
	EffectiveWidth  int        `json:"effective_width"`
	EffectiveHeight int        `json:"effective_height"`
	Rotation        int        `json:"rotation"`
	HealthStatus    string     `json:"health_status"`
	WiltedAt        *time.Time `json:"wilted_at"`
	PlacedAt        time.Time  `json:"placed_at"`
}

type GardenResponse struct {
	ID             string              `json:"id"`
	GardenID       string              `json:"garden_id"`
	GardenIndex    int                 `json:"garden_index"`
	ExpansionLevel int                 `json:"expansion_level"`
	BaseSize       int                 `json:"base_size"`
	CurrentSize    int                 `json:"current_size"`  // chỉ meaningful ở map cuối
	IsExpandable   bool                `json:"is_expandable"` // từ gardens table (by design)
	CanExpand      bool                `json:"can_expand"`    // is_expandable && expansion_level < 5
	LastWateredAt  *time.Time          `json:"last_watered_at"`
	AutoWaterUntil *time.Time          `json:"auto_water_until"`
	Placements     []PlacementResponse `json:"placements"`
}

const (
	expansionStep     = 5
	maxExpansionLevel = 5
)

func computeCurrentSize(baseSize, expansionLevel int) int {
	return baseSize + expansionLevel*expansionStep
}

type PlaceRequest struct {
	UserGardenID string `json:"user_garden_id"`
	InventoryID  string `json:"inventory_id"`
	GridX        int    `json:"grid_x"`
	GridY        int    `json:"grid_y"`
	Rotation     int    `json:"rotation"`
}

type UpdatePlacementRequest struct {
	GridX    *int `json:"grid_x"`
	GridY    *int `json:"grid_y"`
	Rotation *int `json:"rotation"`
}

type ValidationInput struct {
	UserGardenID       string
	ExcludePlacementID string
	GridX, GridY       int
	EffectiveWidth     int // Compute from ItemWidth, Height + Rotation
	EffectiveHeight    int //
	GridSize           int
}

type CreatePlacementParams struct {
	UserGardenID    string
	InventoryID     string
	GridX           int
	GridY           int
	EffectiveWidth  int
	EffectiveHeight int
	Rotation        int
}

func GetEffectiveDimensions(w, h, rotation int) (effectiveW, effectiveH int) {
	if rotation == 90 || rotation == 270 {
		return h, w
	}
	return w, h
}

type InventoryItemDetails struct {
	ItemID   string
	AssetKey string
	Width    int
	Height   int
}
