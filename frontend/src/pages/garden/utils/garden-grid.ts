import { Container, Graphics, Sprite, Assets, BlurFilter } from 'pixi.js'
import type { GardenResponse, PlacementResponse } from '@/types/garden'
import {
  gridToScreen,
  placementToScreen,
  diamondVertices,
  isInBounds,
  type TileConfig,
} from './isometric'
import { ASSET_MAP, DEFAULT_ASSET_CONFIG } from '@/constants/assets'
import { getShadowTransform } from './shadow'
import { getAssetUrl } from '@/lib/storage'

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
  
  private placementSprites = new Map<string, Sprite>()
  private shadowSprites = new Map<string, Sprite>() 
  
  private hoveredTile: { col: number; row: number } | null = null
  private selectedTile: { col: number; row: number } | null = null

  private floorLayer = new Container()
  private shadowLayer = new Container()
  private objectLayer = new Container()

  onTileClick?: (col: number, row: number, placement: PlacementResponse | null) => void
  onTileHover?: (col: number, row: number) => void
  getIsDragging?: () => boolean

  constructor() {
    super()
    this.eventMode = 'static'
    this.objectLayer.sortableChildren = true
    
    this.addChild(this.floorLayer)
    this.addChild(this.shadowLayer)
    this.addChild(this.objectLayer)
  }

  load(garden: GardenResponse): void {
    this.clear()
    this.gridSize = garden.current_size

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
        this.floorLayer.addChild(tile)
      }
    }

    for (const p of garden.placements) {
      this.createPlacementSprite(p)
    }
  }

  private async createPlacementSprite(placement: PlacementResponse): Promise<void> {
    const config = ASSET_MAP[placement.asset_key] || {
      ...DEFAULT_ASSET_CONFIG,
      fileName: placement.asset_key, 
    }

    const textureUrl = getAssetUrl(config.fileName)

    try {
      const texture = await Assets.load(textureUrl)
      
      const { grid_x: col, grid_y: row, item_width: w, item_height: h } = placement
      const screen = placementToScreen(col, row, w, h, TILE_CONFIG)
      
      const targetScreenWidth = (w + h) * (TILE_CONFIG.tileWidth / 2)
      const autoScale = targetScreenWidth / texture.width
      const finalScale = autoScale * config.paddingZoom

      // ==========================================
      // A. SHADOW SPRITE (Dynamic calculation with visualBaseY)
      // ==========================================
      if (config.castShadow) {
        const shadowSprite = new Sprite(texture)
        
        // 1. Set anchor to actual tree base (visualBaseY) instead of grid center
        const actualPivotY = config.visualBaseY ?? config.anchorY
        shadowSprite.anchor.set(config.anchorX, actualPivotY) 
        
        // 2. Adjust Y coordinate to compensate for the anchor difference
        const pixelDiffY = (config.anchorY - actualPivotY) * texture.height * finalScale
        shadowSprite.x = screen.x
        shadowSprite.y = screen.y - pixelDiffY
        
        // 3. Apply shadow transform
        const { skewX, alpha, scaleYMultiplier } = getShadowTransform()
        
        shadowSprite.scale.set(finalScale, finalScale * 0.35 * scaleYMultiplier)
        shadowSprite.skew.x = skewX
        shadowSprite.tint = 0x000000 
        shadowSprite.alpha = alpha
        shadowSprite.filters = [new BlurFilter(2)]

        if (!this.objectLayer.destroyed) {
          this.shadowSprites.set(`${col}_${row}`, shadowSprite)
          this.shadowLayer.addChild(shadowSprite)
        }
      }

      // ==========================================
      // B. MAIN SPRITE
      // ==========================================
      const sprite = new Sprite(texture)
      sprite.x = screen.x
      sprite.y = screen.y
      sprite.anchor.set(config.anchorX, config.anchorY) 
      sprite.scale.set(finalScale)
      sprite.zIndex = col + row + w + h
      sprite.eventMode = 'none'

      if (!this.objectLayer.destroyed) {
        this.placementSprites.set(`${col}_${row}`, sprite)
        this.objectLayer.addChild(sprite)
      }

    } catch (error) {
      console.warn(`[Fallback] Cannot load asset: ${textureUrl}`, error)
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
    this.floorLayer.removeChildren()

    for (const sprite of this.placementSprites.values()) sprite.destroy()
    this.placementSprites.clear()
    this.objectLayer.removeChildren()

    for (const shadow of this.shadowSprites.values()) shadow.destroy()
    this.shadowSprites.clear()
    this.shadowLayer.removeChildren()

    this.hoveredTile = null
    this.selectedTile = null
  }
}