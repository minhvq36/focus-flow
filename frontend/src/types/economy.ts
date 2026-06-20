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
  inventory_id: string;
  item_id: string;
  name: string;
  type: string;
  rarity: string;
  asset_key: string;
  buyback_silver: number;
  buyback_gold: number;
}