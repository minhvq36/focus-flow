export interface WalletResponse {
  silver_balance: number;
  gold_balance: number;
}

export interface ShopItemResponse {
  id: string;
  name: string;
  type: string;
  rarity: string;
  asset_key: string;
  silver_price: number;
}

export interface SellableItemResponse {
  item_id: string;         // Backend giờ đã gom theo item_id
  name: string;
  type: string;
  rarity: string;
  asset_key: string;
  quantity: number;        // Lấy thẳng từ Backend (COUNT)
  instance_ids: string[];  // Lấy thẳng từ Backend (array_agg)
  buyback_silver: number;
  buyback_gold: number;
}