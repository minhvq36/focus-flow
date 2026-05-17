// ============================================================
// Isometric math — Age of Empires / diamond-tile style
//
// Coordinate convention:
//   grid_x (col) → increases to the right  (→ screen right-down)
//   grid_y (row) → increases downward      (→ screen left-down)
//
// Visual layout (col=x, row=y):
//
//          (0,0)
//        (1,0) (0,1)
//      (2,0) (1,1) (0,2)
//
// All functions are pure — no PixiJS imports.
// PixiJS layer just reads screenX/screenY and uses them directly.
// ============================================================

export interface TileConfig {
  tileWidth: number   // full width of diamond in pixels  (e.g. 64)
  tileHeight: number  // full height of diamond in pixels (e.g. 32)
}

export interface ScreenPoint {
  x: number
  y: number
}

// ============================================================
// (col, row) → screen position (top vertex of diamond tile)
// ============================================================
export function gridToScreen(
  col: number,
  row: number,
  config: TileConfig,
): ScreenPoint {
  const { tileWidth, tileHeight } = config
  return {
    x: (col - row) * (tileWidth / 2),
    y: (col + row) * (tileHeight / 2),
  }
}

// ============================================================
// Screen position → (col, row)
// Used for hit-testing: mouse click → which tile?
// originX/originY = screen offset of tile (0,0) top vertex
// ============================================================
export function screenToGrid(
  screenX: number,
  screenY: number,
  originX: number,
  originY: number,
  config: TileConfig,
): { col: number; row: number } {
  const { tileWidth, tileHeight } = config
  const relX = screenX - originX
  const relY = screenY - originY

  const col = (relX / (tileWidth / 2) + relY / (tileHeight / 2)) / 2
  const row = (relY / (tileHeight / 2) - relX / (tileWidth / 2)) / 2

  return {
    col: Math.floor(col),
    row: Math.floor(row),
  }
}

// ============================================================
// Compute the screen origin (where tile (0,0) top vertex goes)
// so that the entire grid is centered in a canvas of given size.
// ============================================================
export function computeGridOrigin(
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number,
  config: TileConfig,
): ScreenPoint {
  const { tileWidth, tileHeight } = config

  // Bounding box of the full diamond map:
  //   width  = gridSize * tileWidth
  //   height = gridSize * tileHeight
  const mapWidth = gridSize * tileWidth
  const mapHeight = gridSize * tileHeight

  return {
    x: canvasWidth / 2,                          // top vertex of (0,0) is at horizontal center
    y: (canvasHeight - mapHeight) / 2,           // vertically centered
  }
}

// ============================================================
// Returns the 4 vertices of a diamond tile, relative to its
// top vertex. Useful for PixiJS Graphics.drawPolygon().
// ============================================================
export function diamondVertices(config: TileConfig): number[] {
  const hw = config.tileWidth / 2
  const hh = config.tileHeight / 2

  // top, right, bottom, left (relative to top vertex at 0,0)
  return [
    0,   0,    // top
    hw,  hh,   // right
    0,   config.tileHeight, // bottom
    -hw, hh,   // left
  ]
}

// ============================================================
// Check if a (col, row) is inside the valid grid area
// ============================================================
export function isInBounds(col: number, row: number, gridSize: number): boolean {
  return col >= 0 && row >= 0 && col < gridSize && row < gridSize
}