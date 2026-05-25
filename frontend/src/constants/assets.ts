export interface AssetConfig {
  fileName: string
  anchorX: number
  anchorY: number
  paddingZoom: number
}


// TODO: Need to config all of this, find the way to test efficiently. Need to understand the meaning of anchorX/Y and paddingZoom more clearly
export const ASSET_MAP: Record<string, AssetConfig> = {
  'path_stone': {
    fileName: 'path_stone',
    anchorX: 0.5,
    anchorY: 0.91,
    paddingZoom: 1.285,
  },
  'blossom_tree': {
    fileName: 'blossom_tree',
    anchorX: 0,
    anchorY: 0,
    paddingZoom: 0,
  },
}

// TODO: Chia asset thành các "Design Archetype" (Nhóm thiết kế chuẩn hóa): Flat, Small, Tall
export const DEFAULT_ASSET_CONFIG: AssetConfig = {
  fileName: 'default',
  anchorX: 0.5,
  anchorY: 0.91,
  paddingZoom: 1.285,
}