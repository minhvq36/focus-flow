import { Container, Graphics } from 'pixi.js'
import type { GardenResponse, PlacementResponse } from '@/types/garden'
import {
  gridToScreen,
  diamondVertices,
  isInBounds,
  type TileConfig,
} from './isometric'

export const TILE_CONFIG: TileConfig = {
  tileWidth: 64,
  tileHeight: 32,
}

const COLOR = {
  TILE_FILL:        0x7ec850,
  TILE_FILL_ALT:    0x6db842,
  TILE_STROKE:      0x5a9e30,
  TILE_HOVER:       0xffd966,
  TILE_SELECTED:    0xff9900,
  PLACEMENT_FILL:   0x4a90d9,
} as const

export class GardenGrid extends Container {
  private gridSize: number = 0
  private tiles = new Map<string, Graphics>()
  private hoveredTile: { col: number; row: number } | null = null
  private selectedTile: { col: number; row: number } | null = null

  onTileClick?: (col: number, row: number, placement: PlacementResponse | null) => void
  onTileHover?: (col: number, row: number) => void
  getIsDragging?: () => boolean

  constructor() {
    super()
    this.eventMode = 'static'
  }

  load(garden: GardenResponse): void {
    this.clear()
    this.gridSize = garden.current_size

    // 🛑 DỜI TRỌNG TÂM CỦA GRID VÀO CHÍNH GIỮA
    // Chiều X của Isometric luôn cân xứng nên trung tâm là 0
    // Chiều Y kéo dài từ 0 đến (gridSize * tileHeight). Trung tâm là chia đôi.
    this.pivot.x = 0
    this.pivot.y = (this.gridSize * TILE_CONFIG.tileHeight) / 2

    const placementMap = new Map<string, PlacementResponse>()
    for (const p of garden.placements) {
      placementMap.set(`${p.grid_x}_${p.grid_y}`, p)
    }

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

  private createTile(col: number, row: number, placement: PlacementResponse | null): Graphics {
    const g = new Graphics()
    const screen = gridToScreen(col, row, TILE_CONFIG)
    g.x = screen.x
    g.y = screen.y

    this.drawTile(g, col, row, placement, false)
    g.eventMode = 'static'
    g.cursor = 'pointer'

    g.on('pointerover', () => this.handleHover(col, row))
    g.on('pointerout',  () => this.handleHoverOut(col, row))
    g.on('pointertap',  () => this.handleClick(col, row, placement))

    return g
  }

  // ... (Các hàm drawTile, handleHover, handleHoverOut, handleClick, clear giữ nguyên 100%)
  private drawTile(g: Graphics, col: number, row: number, placement: PlacementResponse | null, isHovered: boolean): void {
    g.clear()
    const vertices = diamondVertices(TILE_CONFIG)
    const isSelected = this.selectedTile?.col === col && this.selectedTile?.row === row
    let fillColor: number
    if (isSelected) fillColor = COLOR.TILE_SELECTED
    else if (isHovered) fillColor = COLOR.TILE_HOVER
    else if (placement) fillColor = COLOR.PLACEMENT_FILL
    else fillColor = (col + row) % 2 === 0 ? COLOR.TILE_FILL : COLOR.TILE_FILL_ALT
    g.poly(vertices).fill(fillColor).stroke({ color: COLOR.TILE_STROKE, width: 1 })
  }

  private handleHover(col: number, row: number): void {
    if (!isInBounds(col, row, this.gridSize)) return
    if (this.hoveredTile) {
      const prev = this.hoveredTile
      const prevTile = this.tiles.get(`${prev.col}_${prev.row}`)
      if (prevTile) this.drawTile(prevTile, prev.col, prev.row, null, false)
    }
    this.hoveredTile = { col, row }
    const tile = this.tiles.get(`${col}_${row}`)
    if (tile) this.drawTile(tile, col, row, null, true)
    this.onTileHover?.(col, row)
  }

  private handleHoverOut(col: number, row: number): void {
    const tile = this.tiles.get(`${col}_${row}`)
    if (tile) this.drawTile(tile, col, row, null, false)
    this.hoveredTile = null
  }

  private handleClick(col: number, row: number, placement: PlacementResponse | null): void {
    if (this.getIsDragging?.()) return
    if (!isInBounds(col, row, this.gridSize)) return
    if (this.selectedTile?.col === col && this.selectedTile?.row === row) {
      this.selectedTile = null
    } else {
      this.selectedTile = { col, row }
    }
    const tile = this.tiles.get(`${col}_${row}`)
    if (tile) this.drawTile(tile, col, row, placement, false)
    this.onTileClick?.(col, row, placement)
  }

  private clear(): void {
    for (const tile of this.tiles.values()) tile.destroy()
    this.tiles.clear()
    this.removeChildren()
    this.hoveredTile = null
    this.selectedTile = null
  }
}