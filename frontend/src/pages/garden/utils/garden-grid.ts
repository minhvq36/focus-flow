import { Container, Graphics } from 'pixi.js'
import type { GardenResponse, PlacementResponse } from '@/types/garden'
import {
  gridToScreen,
  computeGridOrigin,
  diamondVertices,
  isInBounds,
  type TileConfig,
  type ScreenPoint,
} from './isometric'

// ============================================================
// Visual config
// ============================================================

export const TILE_CONFIG: TileConfig = {
  tileWidth: 64,
  tileHeight: 32,
}

const COLOR = {
  TILE_FILL:        0x7ec850,  // grass green
  TILE_FILL_ALT:    0x6db842,  // checkerboard alt
  TILE_STROKE:      0x5a9e30,  // border
  TILE_HOVER:       0xffd966,  // hovered tile
  TILE_SELECTED:    0xff9900,  // selected tile
  PLACEMENT_FILL:   0x4a90d9,  // placeholder for placed item
  OUT_OF_BOUNDS:    0xcccccc,  // should never render, debug only
} as const

// ============================================================
// GardenGrid
// A PixiJS Container that owns all tile graphics.
// Usage:
//   const grid = new GardenGrid(app.screen.width, app.screen.height)
//   grid.load(gardenResponse)
//   app.stage.addChild(grid)
// ============================================================

export class GardenGrid extends Container {
  private canvasWidth: number
  private canvasHeight: number
  private gridSize: number = 0
  private gridOrigin: ScreenPoint = { x: 0, y: 0 }

  // tile graphics indexed by `${col}_${row}`
  private tiles = new Map<string, Graphics>()

  private hoveredTile: { col: number; row: number } | null = null
  private selectedTile: { col: number; row: number } | null = null

  // callbacks
  onTileClick?: (col: number, row: number, placement: PlacementResponse | null) => void
  onTileHover?: (col: number, row: number) => void

  constructor(canvasWidth: number, canvasHeight: number) {
    super()
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.eventMode = 'static'
  }

  // ============================================================
  // Public: load a GardenResponse and render the grid
  // ============================================================
  load(garden: GardenResponse): void {
    this.clear()

    this.gridSize = garden.current_size

    this.gridOrigin = computeGridOrigin(
      this.gridSize,
      this.canvasWidth,
      this.canvasHeight,
      TILE_CONFIG,
    )

    // Build placement lookup: "col_row" → PlacementResponse
    const placementMap = new Map<string, PlacementResponse>()
    for (const p of garden.placements) {
      placementMap.set(`${p.grid_x}_${p.grid_y}`, p)
    }

    // Render tiles back-to-front (painter's algorithm)
    // row 0..gridSize, col 0..gridSize
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const key = `${col}_${row}`
        const placement = placementMap.get(key) ?? null
        const tile = this.createTile(col, row, placement)
        this.tiles.set(key, tile)
        this.addChild(tile)
      }
    }
  }

  // ============================================================
  // Public: call when canvas resizes (from garden:resize event)
  // ============================================================
  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight

    if (this.gridSize === 0) return

    this.gridOrigin = computeGridOrigin(
      this.gridSize,
      this.canvasWidth,
      this.canvasHeight,
      TILE_CONFIG,
    )

    // Reposition all tiles
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const key = `${col}_${row}`
        const tile = this.tiles.get(key)
        if (!tile) continue
        const screen = gridToScreen(col, row, TILE_CONFIG)
        tile.x = this.gridOrigin.x + screen.x
        tile.y = this.gridOrigin.y + screen.y
      }
    }
  }

  // ============================================================
  // Private: create a single diamond tile Graphics
  // ============================================================
  private createTile(
    col: number,
    row: number,
    placement: PlacementResponse | null,
  ): Graphics {
    const g = new Graphics()

    const screen = gridToScreen(col, row, TILE_CONFIG)
    g.x = this.gridOrigin.x + screen.x
    g.y = this.gridOrigin.y + screen.y

    this.drawTile(g, col, row, placement, false)

    // Interaction
    g.eventMode = 'static'
    g.cursor = 'pointer'

    g.on('pointerover', () => this.handleHover(col, row))
    g.on('pointerout',  () => this.handleHoverOut(col, row))
    g.on('pointertap',  () => this.handleClick(col, row, placement))

    return g
  }

  // ============================================================
  // Private: draw (or redraw) tile appearance
  // ============================================================
  private drawTile(
    g: Graphics,
    col: number,
    row: number,
    placement: PlacementResponse | null,
    isHovered: boolean,
  ): void {
    g.clear()

    const vertices = diamondVertices(TILE_CONFIG)

    const isSelected =
      this.selectedTile?.col === col && this.selectedTile?.row === row

    let fillColor: number
    if (isSelected) {
      fillColor = COLOR.TILE_SELECTED
    } else if (isHovered) {
      fillColor = COLOR.TILE_HOVER
    } else if (placement) {
      fillColor = COLOR.PLACEMENT_FILL
    } else {
      // checkerboard pattern
      fillColor = (col + row) % 2 === 0 ? COLOR.TILE_FILL : COLOR.TILE_FILL_ALT
    }

    g.poly(vertices).fill(fillColor).stroke({ color: COLOR.TILE_STROKE, width: 1 })
  }

  // ============================================================
  // Interaction handlers
  // ============================================================
  private handleHover(col: number, row: number): void {
    if (!isInBounds(col, row, this.gridSize)) return

    // Restore previous hovered tile
    if (this.hoveredTile) {
      const prev = this.hoveredTile
      const prevKey = `${prev.col}_${prev.row}`
      const prevTile = this.tiles.get(prevKey)
      if (prevTile) {
        const prevPlacement = null  // TODO: pass placement map as class field if needed
        this.drawTile(prevTile, prev.col, prev.row, prevPlacement, false)
      }
    }

    this.hoveredTile = { col, row }
    const key = `${col}_${row}`
    const tile = this.tiles.get(key)
    if (tile) this.drawTile(tile, col, row, null, true)

    this.onTileHover?.(col, row)
  }

  private handleHoverOut(col: number, row: number): void {
    const key = `${col}_${row}`
    const tile = this.tiles.get(key)
    if (tile) this.drawTile(tile, col, row, null, false)
    this.hoveredTile = null
  }

  private handleClick(
    col: number,
    row: number,
    placement: PlacementResponse | null,
  ): void {
    if (!isInBounds(col, row, this.gridSize)) return

    // Deselect if clicking same tile
    if (this.selectedTile?.col === col && this.selectedTile?.row === row) {
      this.selectedTile = null
    } else {
      this.selectedTile = { col, row }
    }

    const key = `${col}_${row}`
    const tile = this.tiles.get(key)
    if (tile) this.drawTile(tile, col, row, placement, false)

    this.onTileClick?.(col, row, placement)
  }

  // ============================================================
  // Private: clear all tiles
  // ============================================================
  private clear(): void {
    for (const tile of this.tiles.values()) {
      tile.destroy()
    }
    this.tiles.clear()
    this.removeChildren()
    this.hoveredTile = null
    this.selectedTile = null
  }
}