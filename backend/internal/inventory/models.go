package inventory

// InBagItem đại diện cho một nhóm vật phẩm cùng loại đang có trong túi.
type InBagItem struct {
	ItemID   string `json:"item_id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	AssetKey string `json:"asset_key"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Quantity int    `json:"quantity"`
	// InstanceIDs chứa danh sách các inventory_id thật để Frontend dùng khi PlaceItem
	InstanceIDs []string `json:"instance_ids"`
}
