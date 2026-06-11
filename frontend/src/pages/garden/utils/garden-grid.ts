import { Container, Graphics, Sprite, Assets, Polygon } from 'pixi.js'
import type { GardenResponse, PlacementResponse } from '@/types/garden'
import type { InBagItem } from '@/types/inventory'
import { gridToScreen, placementToScreen, diamondVertices, isInBounds, type TileConfig } from './isometric'
import { ASSET_MAP, DEFAULT_ASSET_CONFIG } from '@/constants/assets'
import { createShadow } from './shadow'
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
  
  // --- BẢNG MÀU CHO CHẾ ĐỘ ĐẶT ĐỒ (BLUEPRINT) ---
  BP_VALID:         0x4ade80, // Xanh lá sáng (Đặt được)
  BP_INVALID:       0xf87171, // Đỏ rực (Bị vướng)
  BP_OCCUPIED:      0x64748b, // Xám (Đất đã có vật thể)
  BP_DIM:           0x6ea543, // Xanh lá sẫm (Đất trống bị làm chìm đi)
} as const

export class GardenGrid extends Container {
  private gridSize: number = 0
  private tiles = new Map<string, Graphics>()
  private placementSprites = new Map<string, Sprite>()
  private shadowSprites = new Map<string, Container>()
  
  private hoveredTile: { col: number; row: number } | null = null
  private selectedTile: { col: number; row: number } | null = null

  private floorLayer = new Container()
  private shadowLayer = new Container()
  private objectLayer = new Container()

  // --- STATE DÀNH CHO GHOST MODE ---
  private currentPlacements: PlacementResponse[] = []
  private ghostSprite: Sprite | null = null
  private ghostShadow: Container | null = null
  private activeItem: InBagItem | null = null
  private activeRotation: number = 0
  private isValidPlacement: boolean = false

  // Biến tối ưu chống Lag
  private occupiedTiles = new Set<string>() 
  private currentFootprint = new Set<string>() 

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
    // 1. CHỈ TẠO LẠI NỀN ĐẤT NẾU LÀ LẦN ĐẦU TIÊN HOẶC MAP BỊ MỞ RỘNG
    if (this.gridSize !== garden.current_size || this.tiles.size === 0) {
      this.clear() // Chỉ nuke toàn bộ nếu size thay đổi
      this.gridSize = garden.current_size
      
      this.pivot.x = 0
      this.pivot.y = (this.gridSize * TILE_CONFIG.tileHeight) / 2

      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const key = `${col}_${row}`
          // Tile ban đầu chưa có placement, màu sắc sẽ được update ở hàm redrawAllTiles
          const tile = this.createTile(col, row, null)
          this.tiles.set(key, tile)
          this.floorLayer.addChild(tile)
        }
      }
    }

    // Cập nhật state nội bộ
    this.currentPlacements = garden.placements

    // 2. THUẬT TOÁN DIFFING CHO SPRITE (Chống nháy)
    const newPlacementKeys = new Set<string>()

    // A. Thêm sprite mới nếu chưa có trên Canvas
    for (const p of garden.placements) {
      const key = `${p.grid_x}_${p.grid_y}`
      newPlacementKeys.add(key)
      
      if (!this.placementSprites.has(key)) {
        this.createPlacementSprite(p) // Chỉ tạo sprite thực sự mới
      }
    }

    // B. Xóa sprite cũ trên Canvas nếu Data từ DB không còn (vd: lỗi rollback)
    for (const [key, sprite] of this.placementSprites.entries()) {
      if (!newPlacementKeys.has(key)) {
        sprite.destroy()
        this.placementSprites.delete(key)
        
        const shadow = this.shadowSprites.get(key)
        if (shadow) {
          shadow.destroy()
          this.shadowSprites.delete(key)
        }
      }
    }

    // 3. Cập nhật lại màu sắc cho sàn đất (Floor) dựa trên data mới nhất
    this.redrawAllTiles()

    // 4. Nếu đang cầm đồ khi data load lại, cập nhật lại mảng chiếm chỗ
    if (this.activeItem) {
      this.calculateOccupiedTiles()
      this.redrawAllTiles()
    }
  }

  public async setPlacementMode(item: InBagItem | null, rotation: number) {
    // ✅ CHỐT CHẶN: Nếu đang cầm đúng cái item đó, góc xoay đó -> BỎ QUA KHÔNG LÀM GÌ CẢ
    if (
      item !== null &&
      this.activeItem !== null &&
      this.activeItem.asset_key === item.asset_key &&
      this.activeRotation === rotation
    ) {
      this.activeItem = item
      return 
    }
    
    this.activeItem = item
    this.activeRotation = rotation

    if (this.ghostSprite) { this.ghostSprite.destroy(); this.ghostSprite = null }
    if (this.ghostShadow) { this.ghostShadow.destroy(); this.ghostShadow = null }
    this.currentFootprint.clear()

    if (!item) {
      this.redrawAllTiles() // Khôi phục map về bình thường
      return
    }

    // 1. Lưu lại các ô bị chiếm để check nhanh
    this.calculateOccupiedTiles()
    
    // 2. Làm mờ toàn bộ map
    this.redrawAllTiles()

    // 3. Tạo Sprite bóng mờ
    const config = ASSET_MAP[item.asset_key] || { ...DEFAULT_ASSET_CONFIG, fileName: item.asset_key }
    const textureUrl = getAssetUrl(config.fileName)

    try {
      const texture = await Assets.load(textureUrl)
      const targetScreenWidth = (item.width + item.height) * (TILE_CONFIG.tileWidth / 2)
      const autoScale = targetScreenWidth / texture.width
      const finalScale = autoScale * config.paddingZoom

      if (config.castShadow) {
        this.ghostShadow = createShadow(texture, config, finalScale)
        this.ghostShadow.alpha = 0.5
        this.ghostShadow.visible = false
        this.ghostShadow.eventMode = 'none'
        this.shadowLayer.addChild(this.ghostShadow)
      }

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

  private calculateOccupiedTiles() {
    this.occupiedTiles.clear()
    for (const p of this.currentPlacements) {
      // Dùng fallback phòng trường hợp DB cũ effective_width = 0
      const w = p.effective_width || p.item_width || 1
      const h = p.effective_height || p.item_height || 1
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          this.occupiedTiles.add(`${p.grid_x + c}_${p.grid_y + r}`)
        }
      }
    }
  }

  private checkCollision(col: number, row: number, effW: number, effH: number): boolean {
    if (col < 0 || row < 0 || col + effW > this.gridSize || row + effH > this.gridSize) return true
    for (let r = 0; r < effH; r++) {
      for (let c = 0; c < effW; c++) {
        if (this.occupiedTiles.has(`${col + c}_${row + r}`)) return true
      }
    }
    return false
  }

  private handleHover(col: number, row: number): void {
    if (!isInBounds(col, row, this.gridSize)) return

    // --- CHẾ ĐỘ ĐẶT ĐỒ ---
    if (this.activeItem && this.ghostSprite) {
      this.ghostSprite.visible = true
      if (this.ghostShadow) this.ghostShadow.visible = true

      const isRotated = this.activeRotation === 90 || this.activeRotation === 270
      const effW = isRotated ? this.activeItem.height : this.activeItem.width
      const effH = isRotated ? this.activeItem.width : this.activeItem.height

      const screen = placementToScreen(col, row, effW, effH, TILE_CONFIG)
      this.ghostSprite.x = screen.x; this.ghostSprite.y = screen.y
      this.ghostSprite.zIndex = col + row + effW + effH
      if (this.ghostShadow) { this.ghostShadow.x = screen.x; this.ghostShadow.y = screen.y }

      this.isValidPlacement = !this.checkCollision(col, row, effW, effH)
      this.ghostSprite.tint = this.isValidPlacement ? 0xffffff : 0xff4444

      // TỐI ƯU HOÁ: CHỈ VẼ LẠI Ô BỊ THAY ĐỔI
      const oldFootprint = Array.from(this.currentFootprint)
      this.currentFootprint.clear()
      
      for (let r = 0; r < effH; r++) {
        for (let c = 0; c < effW; c++) {
          this.currentFootprint.add(`${col + c}_${row + r}`)
        }
      }

      const tilesToRedraw = new Set([...oldFootprint, ...Array.from(this.currentFootprint)])
      tilesToRedraw.forEach(key => {
        const [c, r] = key.split('_').map(Number)
        if (isInBounds(c, r, this.gridSize)) this.drawTileSpecific(c, r)
      })
      return
    }

    // --- CHẾ ĐỘ THƯỜNG ---
    if (this.hoveredTile) {
      const prev = this.hoveredTile
      this.hoveredTile = null
      this.drawTileSpecific(prev.col, prev.row)
    }
    this.hoveredTile = { col, row }
    this.drawTileSpecific(col, row)
    this.onTileHover?.(col, row)
  }

  private handleHoverOut(col: number, row: number): void {
    if (this.activeItem) {
      if (this.ghostSprite) this.ghostSprite.visible = false
      if (this.ghostShadow) this.ghostShadow.visible = false
      
      const oldFootprint = Array.from(this.currentFootprint)
      this.currentFootprint.clear()
      oldFootprint.forEach(key => {
        const [c, r] = key.split('_').map(Number)
        if (isInBounds(c, r, this.gridSize)) this.drawTileSpecific(c, r)
      })
      return
    }
    const prev = this.hoveredTile
    this.hoveredTile = null
    if (prev) this.drawTileSpecific(prev.col, prev.row)
  }

  private handleClick(col: number, row: number, placement: PlacementResponse | null): void {
    if (this.getIsDragging?.()) return
    if (!isInBounds(col, row, this.gridSize)) return

    // TODO: Develop when delete mode
    // if (this.currentMode === 'DELETE_MODE' && placement) {
    //   this.api.deletePlacement(placement.id); // Chuẩn xác 100%, không bị vướng padding!
    //   return;
    // }

    if (this.activeItem) {
      if (this.isValidPlacement) this.onRequestPlace?.(col, row, this.activeItem, this.activeRotation)
      return
    }

    if (this.selectedTile?.col === col && this.selectedTile?.row === row) {
      this.selectedTile = null
    } else {
      this.selectedTile = { col, row }
    }
    this.redrawAllTiles()
    this.onTileClick?.(col, row, placement)
  }

  // --- HÀM RENDER RIÊNG LẺ CHỐNG LAG ---
  private drawTileSpecific(col: number, row: number) {
    const tile = this.tiles.get(`${col}_${row}`)
    if (tile) this.drawTile(tile, col, row, null, false)
  }

  private redrawAllTiles() {
    // Tạo map tra cứu nhanh
    const placementMap = new Map<string, PlacementResponse>()
    for (const p of this.currentPlacements) {
      placementMap.set(`${p.grid_x}_${p.grid_y}`, p)
    }

    this.tiles.forEach((tile, key) => {
      const [col, row] = key.split('_').map(Number)
      const placement = placementMap.get(key) ?? null
      this.drawTile(tile, col, row, placement, false)
    })
  }

  private drawTile(g: Graphics, col: number, row: number, placement: PlacementResponse | null, isHovered: boolean): void {
    g.clear()
    const vertices = diamondVertices(TILE_CONFIG)
    const key = `${col}_${row}`
    let fillColor: number
    
    if (this.activeItem) {
      if (this.currentFootprint.has(key)) {
        fillColor = this.isValidPlacement ? COLOR.BP_VALID : COLOR.BP_INVALID
      } else if (this.occupiedTiles.has(key)) {
        fillColor = COLOR.BP_OCCUPIED
      } else {
        fillColor = COLOR.BP_DIM
      }
    } else {
      const isSelected = this.selectedTile?.col === col && this.selectedTile?.row === row
      const isHoveredTile = this.hoveredTile?.col === col && this.hoveredTile?.row === row
      
      if (isSelected) fillColor = COLOR.TILE_SELECTED
      else if (isHoveredTile || isHovered) fillColor = COLOR.TILE_HOVER
      else if (placement) fillColor = COLOR.PLACEMENT_FILL
      else fillColor = (col + row) % 2 === 0 ? COLOR.TILE_FILL : COLOR.TILE_FILL_ALT
    }
    
    g.poly(vertices).fill(fillColor).stroke({ color: COLOR.TILE_STROKE, width: 1 })
  }

  private createTile(col: number, row: number, placement: PlacementResponse | null): Graphics {
    const g = new Graphics()
    const screen = gridToScreen(col, row, TILE_CONFIG)
    g.x = screen.x; g.y = screen.y

    // --- FIX LỖI NHẤP NHÁY (FLICKERING) ---
    // Định nghĩa cố định HitArea (Vùng nhận diện chuột).
    // Khi này g.clear() sẽ không làm mất nhận diện chuột nữa!
    const vertices = diamondVertices(TILE_CONFIG)
    g.hitArea = new Polygon(vertices)

    this.drawTile(g, col, row, placement, false)
    g.eventMode = 'static'
    g.cursor = 'pointer'

    g.on('pointerover', () => this.handleHover(col, row))
    g.on('pointerout',  () => this.handleHoverOut(col, row))
    g.on('pointertap',  () => this.handleClick(col, row, placement))
    return g
  }

  private async createPlacementSprite(placement: PlacementResponse): Promise<void> {
    const config = ASSET_MAP[placement.asset_key] || { ...DEFAULT_ASSET_CONFIG, fileName: placement.asset_key }
    const textureUrl = getAssetUrl(config.fileName)

    try {
      const texture = await Assets.load(textureUrl)
      // SỬA LỖI MẤT SPRITE Ở ĐÂY: Fallback về item_width nếu effective_width bị 0
      const w = placement.effective_width || placement.item_width || 1
      const h = placement.effective_height || placement.item_height || 1
      const screen = placementToScreen(placement.grid_x, placement.grid_y, w, h, TILE_CONFIG)
      
      const targetScreenWidth = (w + h) * (TILE_CONFIG.tileWidth / 2)
      const autoScale = targetScreenWidth / texture.width
      const finalScale = autoScale * config.paddingZoom

      if (config.castShadow) {
        const shadowNode = createShadow(texture, config, finalScale)
        shadowNode.x = screen.x; shadowNode.y = screen.y
        shadowNode.eventMode = 'none'
        if (!this.objectLayer.destroyed) {
          this.shadowSprites.set(`${placement.grid_x}_${placement.grid_y}`, shadowNode) 
          this.shadowLayer.addChild(shadowNode)
        }
      }

      const sprite = new Sprite(texture)
      sprite.x = screen.x; sprite.y = screen.y
      sprite.anchor.set(config.anchorX, config.anchorY) 
      sprite.scale.set(finalScale)
      sprite.zIndex = placement.grid_x + placement.grid_y + w + h
      sprite.eventMode = 'none'

      if (!this.objectLayer.destroyed) {
        this.placementSprites.set(`${placement.grid_x}_${placement.grid_y}`, sprite)
        this.objectLayer.addChild(sprite)
      }
    } catch (error) {
      console.warn(`[Fallback] Cannot load asset: ${textureUrl}`, error)
    }
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