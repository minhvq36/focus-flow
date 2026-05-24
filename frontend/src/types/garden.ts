// ============================================================
// Mirror of Go backend structs
// Keep in sync with PlacementResponse and GardenResponse
// ============================================================

export interface PlacementResponse {
  id: string
  inventory_id: string
  item_id: string
  asset_key: string
  grid_x: number
  grid_y: number
  rotation: number          // 0 | 90 | 180 | 270
  health_status: string     // e.g. "healthy" | "wilted" | "dead"
  wilted_at: string | null  // ISO 8601 or null
  placed_at: string         // ISO 8601
}

export interface GardenResponse {
  id: string
  garden_id: string
  garden_index: number
  expansion_level: number   // 0–5
  base_size: number
  current_size: number      // meaningful only on last map (max garden_index)
  is_expandable: boolean    // by design of the map template
  can_expand: boolean       // is_expandable && expansion_level < 5
  last_watered_at: string | null
  auto_water_until: string | null
  placements: PlacementResponse[]
}

// Lightweight version returned by GET /api/garden (list)
// No placements, just meta
export interface GardenListItem {
  id: string
  garden_id: string
  garden_index: number
  expansion_level: number
  base_size: number
  current_size: number
  is_expandable: boolean
  can_expand: boolean
  last_watered_at: string | null
  auto_water_until: string | null
}

// ============================================================
// Client-side grid coordinate
// grid_x = col, grid_y = row  (matches backend naming)
// ============================================================
export interface GridCoord {
  col: number  // grid_x
  row: number  // grid_y
}