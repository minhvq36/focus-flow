import { Container, Graphics, Sprite, Assets } from 'pixi.js'
import type { GardenResponse, PlacementResponse } from '@/types/garden'
import {
  gridToScreen,
  placementToScreen,
  diamondVertices,
  isInBounds,
  type TileConfig,
} from './isometric'
import { ASSET_MAP, DEFAULT_ASSET_CONFIG } from '@/constants/assets'
import { createShadow } from './shadow'
import { getAssetUrl } from '@/lib/storage'
import type { InBagItem } from '@/types/inventory'

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
  private shadowSprites = new Map<string, Container>() // Thay đổi kiểu dữ liệu
  
  private hoveredTile: { col: number; row: number } | null = null
  private selectedTile: { col: number; row: number } | null = null

  private floorLayer = new Container()
  private shadowLayer = new Container()
  private objectLayer = new Container()

    // THÊM BIẾN CHO GHOST MODE
  private currentPlacements: PlacementResponse[] = []
  private ghostSprite: Sprite | null = null
  private ghostShadow: Container | null = null
  private activeItem: InBagItem | null = null
  private activeRotation: number = 0
  private isValidPlacement: boolean = false

  onRequestPlace?: (col: number, row: number, item: InBagItem, rotation: number) => void

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
    this.currentPlacements = garden.placements 

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

  public async setPlacementMode(item: InBagItem | null, rotation: number) {
    this.activeItem = item
    this.activeRotation = rotation

    // Nếu tắt -> Dọn dẹp Ghost
    if (!item) {
      if (this.ghostSprite) { this.ghostSprite.destroy(); this.ghostSprite = null }
      if (this.ghostShadow) { this.ghostShadow.destroy(); this.ghostShadow = null }
      return
    }

    // Xoá ghost cũ nếu có
    if (this.ghostSprite) { this.ghostSprite.destroy(); this.ghostSprite = null }
    if (this.ghostShadow) { this.ghostShadow.destroy(); this.ghostShadow = null }

    const config = ASSET_MAP[item.asset_key] || { ...DEFAULT_ASSET_CONFIG, fileName: item.asset_key }
    const textureUrl = getAssetUrl(config.fileName)

    try {
      const texture = await Assets.load(textureUrl)
      const targetScreenWidth = (item.width + item.height) * (TILE_CONFIG.tileWidth / 2)
      const autoScale = targetScreenWidth / texture.width
      const finalScale = autoScale * config.paddingZoom

      // Tạo bóng mờ
      if (config.castShadow) {
        this.ghostShadow = createShadow(texture, config, finalScale)
        this.ghostShadow.alpha = 0.5
        this.ghostShadow.visible = false
        this.shadowLayer.addChild(this.ghostShadow)
      }

      // Tạo Sprite Ghost
      this.ghostSprite = new Sprite(texture)
      this.ghostSprite.anchor.set(config.anchorX, config.anchorY)
      this.ghostSprite.scale.set(finalScale)
      this.ghostSprite.alpha = 0.6
      this.ghostSprite.eventMode = 'none'
      this.ghostSprite.visible = false
      this.objectLayer.addChild(this.ghostSprite)

    } catch (e) {
      console.warn("Error loading ghost", e)
    }
  }

  // HÀM MỚI 2: THUẬT TOÁN AABB
  private checkCollision(col: number, row: number, effW: number, effH: number): boolean {
    // 1. Check văng ra ngoài map
    if (col < 0 || row < 0 || col + effW > this.gridSize || row + effH > this.gridSize) {
      return true
    }
    // 2. Check đè lên item khác
    for (const p of this.currentPlacements) {
      if (
        col < p.grid_x + p.effective_width &&
        col + effW > p.grid_x &&
        row < p.grid_y + p.effective_height &&
        row + effH > p.grid_y
      ) {
        return true // Có va chạm
      }
    }
    return false
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
      // A. SHADOW LAYER (Render siêu gọn gàng)
      // ==========================================
      if (config.castShadow) {
        // Chỉ việc gọi hàm từ file shadow.ts
        const shadowNode = createShadow(texture, config, finalScale)
        
        shadowNode.x = screen.x
        shadowNode.y = screen.y

        if (!this.objectLayer.destroyed) {
          // Map giờ lưu được kiểu Container thay vì Sprite riêng lẻ
          this.shadowSprites.set(`${col}_${row}`, shadowNode) 
          this.shadowLayer.addChild(shadowNode)
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

    // --- LOGIC GHOST SPRITE ---
    if (this.activeItem && this.ghostSprite) {
      this.ghostSprite.visible = true
      if (this.ghostShadow) this.ghostShadow.visible = true

      const isRotated = this.activeRotation === 90 || this.activeRotation === 270
      const effW = isRotated ? this.activeItem.height : this.activeItem.width
      const effH = isRotated ? this.activeItem.width : this.activeItem.height

      const screen = placementToScreen(col, row, effW, effH, TILE_CONFIG)
      
      this.ghostSprite.x = screen.x
      this.ghostSprite.y = screen.y
      this.ghostSprite.zIndex = col + row + effW + effH // Tính Z-index chuẩn
      
      if (this.ghostShadow) {
        this.ghostShadow.x = screen.x
        this.ghostShadow.y = screen.y
      }

      // Đổi màu Đỏ/Bình thường
      const isColliding = this.checkCollision(col, row, effW, effH)
      this.isValidPlacement = !isColliding
      
      if (isColliding) {
        this.ghostSprite.tint = 0xff4444 // Đỏ
      } else {
        this.ghostSprite.tint = 0xffffff // Xanh/Mặc định
      }
      return // Bỏ qua highlight vàng của map
    }

    // --- LOGIC HOVER BÌNH THƯỜNG (CŨ) ---
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

    // --- LOGIC CLICK ĐẶT ĐỒ ---
    if (this.activeItem) {
      if (this.isValidPlacement) {
        this.onRequestPlace?.(col, row, this.activeItem, this.activeRotation)
      } else {
        // Tương lai: Phát âm thanh bíp bíp lỗi ở đây
      }
      return
    }

    // --- LOGIC CHỌN ĐỒ BÌNH THƯỜNG (CŨ) ---
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