package economy

import "time"

// ==========================================
// 1. DATABASE ROW TYPES (Mapping với Database)
// ==========================================

type UserWallet struct {
	UserID        string    `db:"user_id"`
	SilverBalance int64     `db:"silver_balance"`
	GoldBalance   int       `db:"gold_balance"`
	UpdatedAt     time.Time `db:"updated_at"`
}

type Item struct {
	ID            string `db:"id"`
	Name          string `db:"name"`
	Type          string `db:"type"`
	Rarity        string `db:"rarity"`
	AssetKey      string `db:"asset_key"`
	Height        int    `db:"height"`
	Width         int    `db:"width"`
	SilverPrice   *int   `db:"silver_price"` // Dùng pointer vì có thể NULL
	IsPurchasable bool   `db:"is_purchasable"`
	CanWilt       bool   `db:"can_wilt"`
	Details       []byte `db:"details"`
}

type EconomyTransaction struct {
	ID           string    `db:"id"`
	UserID       string    `db:"user_id"`
	SilverChange int       `db:"silver_change"`
	GoldChange   int       `db:"gold_change"`
	ActionType   string    `db:"action_type"`
	ReferenceID  *string   `db:"reference_id"` // Pointer vì có thể NULL
	Description  string    `db:"description"`
	CreatedAt    time.Time `db:"created_at"`
}

// Struct dùng để JOIN giữa Inventory và Items (Dùng cho tab Sell)
type InventoryItemDetail struct {
	InventoryID   string    `db:"inventory_id"`
	ItemID        string    `db:"item_id"`
	Name          string    `db:"name"`
	Type          string    `db:"type"`
	Rarity        string    `db:"rarity"`
	AssetKey      string    `db:"asset_key"`
	OriginalPrice *int      `db:"silver_price"`
	AcquiredAt    time.Time `db:"acquired_at"`
}

// ==========================================
// 2. REQUEST TYPES (Từ Frontend gửi lên)
// ==========================================

type BuyRequest struct {
	ItemID   string `json:"item_id" validate:"required,uuid"`
	Quantity int    `json:"quantity" validate:"required,min=1,max=99"`
}

type SellBatchRequest struct {
	InventoryIDs []string `json:"inventory_ids" validate:"required,min=1,dive,uuid"`
}

// ==========================================
// 3. RESPONSE TYPES (Trả về cho Frontend)
// ==========================================

type SellBatchResponse struct {
	SuccessfulInventoryIDs []string `json:"successful_inventory_ids"`
	TotalSilverEarned      int      `json:"total_silver_earned"`
	TotalGoldEarned        int      `json:"total_gold_earned"`
}

// ==========================================
// 3. RESPONSE TYPES (Trả về cho Frontend)
// ==========================================

type WalletResponse struct {
	SilverBalance int64 `json:"silver_balance"`
	GoldBalance   int   `json:"gold_balance"`
}

// Trả về cho Tab "Buy" trong Shop
type ShopItemResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Rarity      string `json:"rarity"`
	AssetKey    string `json:"asset_key"`
	SilverPrice int    `json:"silver_price"`
}

// Trả về cho Tab "Sell" trong Shop (Hiển thị kho đồ đang có)
type SellableItemResponse struct {
	InventoryID   string `json:"inventory_id"`
	ItemID        string `json:"item_id"`
	Name          string `json:"name"`
	Type          string `json:"type"`
	Rarity        string `json:"rarity"`
	AssetKey      string `json:"asset_key"`
	BuybackSilver int    `json:"buyback_silver"` // Tính toán bằng Go
	BuybackGold   int    `json:"buyback_gold"`   // Tính toán bằng Go
}

// ==========================================
// 4. CONSTANTS & DOMAIN LOGIC
// ==========================================

const (
	ActionShopBuy  = "shop_buy"
	ActionShopSell = "shop_sell"

	SilverBuybackRate = 0.5 // Bán lại nhận 50%
)
