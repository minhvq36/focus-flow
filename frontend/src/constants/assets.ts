export interface AssetConfig {
  fileName: string
  anchorX: number
  anchorY: number
  visualBaseY: number
  paddingZoom: number
  castShadow: boolean // <-- THÊM CÁI NÀY
  shadowStyle?: 'flat' | 'upright' // <-- VÀ CÁI NÀY
}

export const ASSET_MAP: Record<string, AssetConfig> = {
  'path_stone': {
    fileName: 'path_stone',
    anchorX: 0.5,
    anchorY: 0.75,     // Item phẳng nên tâm thường ở giữa
    visualBaseY: 0.8,
    paddingZoom: 1.285,
    castShadow: true, // TODO: To change this
    shadowStyle: 'upright', // TODO: To change this
  },
  'blossom_tree': {
    fileName: 'blossom_tree',
    anchorX: 0.5,
    anchorY: 0.91,    // Gốc cây chạm đất ở 91% chiều cao ảnh
    visualBaseY: 0.8,
    paddingZoom: 1.285,
    castShadow: true,  // <-- Cây đứng thẳng thì CÓ bóng
    shadowStyle: 'upright', // <-- Cây đứng thẳng thì bóng có texture
  },
}

export const DEFAULT_ASSET_CONFIG: AssetConfig = {
  fileName: 'default',
  anchorX: 0.5,
  anchorY: 0.91,
  visualBaseY: 0.8,
  paddingZoom: 1.285,
  castShadow: true,
  shadowStyle: 'upright',
}