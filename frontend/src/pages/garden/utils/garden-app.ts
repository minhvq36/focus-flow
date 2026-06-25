import { Application, Container, Rectangle, FederatedPointerEvent } from 'pixi.js'

// Đã bỏ MIN_ZOOM ở đây, chỉ giữ lại MAX_ZOOM
export const MAX_ZOOM = 3.0

export interface GardenAppOptions {
  container: HTMLDivElement
  onReady?: (app: Application) => void
}

export class GardenApp {
  app: Application
  stage: Container
  cameraContainer: Container

  private resizeObserver: ResizeObserver | null = null
  private initialized = false
  private destroyed = false

  private _zoom = 1
  private _fitZoom = 1

  private gridCols = 0

  private mapBaseWidth = 0
  private mapBaseHeight = 0

  private dragState = {
    isDown: false,
    startX: 0,
    startY: 0,
    initialCamX: 0,
    initialCamY: 0,
    hasDragged: false,
  }

  constructor() {
    this.app = new Application()
    this.stage = new Container()
    this.cameraContainer = new Container()
    this.stage.addChild(this.cameraContainer)
  }

  get zoom(): number { return this._zoom }
  get fitZoom(): number { return this._fitZoom }
  public get isDragging(): boolean { return this.dragState.hasDragged }

  // THÊM: Tính toán MIN_ZOOM linh hoạt dựa trên size của map (gridCols)
  private get minZoom(): number {
    if (this.gridCols <= 0) return 1.0;
    const calculatedZoom = Math.sqrt(5 / this.gridCols);
    return Math.min(1.0, calculatedZoom);
  }

  setZoom(newZoom: number, pivotX?: number, pivotY?: number): void {
    // Sử dụng this.minZoom động thay vì hằng số
    const clamped = Math.min(MAX_ZOOM, Math.max(this.minZoom, newZoom))
    if (clamped === this._zoom) return

    const cx = pivotX ?? this.app.screen.width / 2
    const cy = pivotY ?? this.app.screen.height / 2

    const worldX = (cx - this.cameraContainer.x) / this._zoom
    const worldY = (cy - this.cameraContainer.y) / this._zoom

    this._zoom = clamped
    this.cameraContainer.scale.set(clamped)

    this.cameraContainer.x = cx - worldX * clamped
    this.cameraContainer.y = cy - worldY * clamped

    this.clampCamera()
  }

  applyFitZoom(
    gridCols: number,
    gridRows: number,
    tileWidth: number,
    tileHeight: number,
    savedZoom?: number | null,
  ): void {
    // Gán gridCols trước để getter minZoom hoạt động đúng
    this.gridCols = gridCols 

    this.mapBaseWidth = gridCols * tileWidth
    this.mapBaseHeight = gridRows * tileHeight

    const vw = this.app.screen.width
    const vh = this.app.screen.height

    const f = (size: number) => 1.04 + ((size - 5) / 45) * 1.16;
    this._fitZoom = Math.min(vw / this.mapBaseWidth, vh / this.mapBaseHeight) * f(gridCols)
    
    let targetZoom = savedZoom ?? this._fitZoom
    
    // Đảm bảo fitZoom ban đầu cũng không vi phạm luật minZoom/maxZoom
    targetZoom = Math.min(MAX_ZOOM, Math.max(this.minZoom, targetZoom))

    this._zoom = targetZoom
    this.cameraContainer.scale.set(targetZoom)

    this.cameraContainer.x = vw / 2
    this.cameraContainer.y = (vh / 2)

    this.clampCamera()
  }

  private clampCamera(): void {
    if (this.gridCols === 0) return

    const vw = this.app.screen.width
    const vh = this.app.screen.height

    const currentMapWidth = this.mapBaseWidth * this._zoom
    const currentMapHeight = this.mapBaseHeight * this._zoom

    const padX = vw * 0.1
    const padY = vh * 0.1

    const minDragX = Math.max(0, vw / 2 - padX)
    const minDragY = Math.max(0, vh / 2 - padY)

    const maxDragX = Math.max(minDragX, (currentMapWidth - (vw - 2 * padX)) / 2)
    const maxDragY = Math.max(minDragY, (currentMapHeight * 0.85 - (vh - 2 * padY)) / 2)

    const centerX = vw / 2
    const centerY = vh / 2 

    let dx = this.cameraContainer.x - centerX
    let dy = this.cameraContainer.y - centerY

    if (maxDragX > 0 && maxDragY > 0) {
      const distanceSq = (dx * dx) / (maxDragX * maxDragX) + (dy * dy) / (maxDragY * maxDragY)
      if (distanceSq > 1) {
        const scale = Math.sqrt(1 / distanceSq)
        dx *= scale
        dy *= scale
      }
    } else {
      dx = 0; dy = 0
    }

    this.cameraContainer.x = centerX + dx
    this.cameraContainer.y = centerY + dy
  }

  async init({ container, onReady }: GardenAppOptions): Promise<void> {
    await this.app.init({
      resizeTo: container, backgroundAlpha: 0, antialias: true, resolution: window.devicePixelRatio ?? 1, autoDensity: true,
    })
    if (this.destroyed) { this.app.destroy(true, { children: true }); return }
    this.initialized = true
    container.appendChild(this.app.canvas)
    this.app.stage.addChild(this.stage)

    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = new Rectangle(0, 0, this.app.screen.width, this.app.screen.height)
    this.app.stage.on('pointerdown', this.onPointerDown, this)
    this.app.stage.on('globalpointermove', this.onPointerMove, this)
    this.app.stage.on('pointerup', this.onPointerUp, this)
    this.app.stage.on('pointerupoutside', this.onPointerUp, this)

    this.resizeObserver = new ResizeObserver(() => this.onResize())
    this.resizeObserver.observe(container)
    this.app.canvas.addEventListener('wheel', this.onWheel, { passive: false })
    onReady?.(this.app)
  }

  private onPointerDown(e: FederatedPointerEvent): void {
    if (e.button !== 0 && e.button !== 1 && e.pointerType !== 'touch') return
    this.dragState.isDown = true
    this.dragState.startX = e.global.x
    this.dragState.startY = e.global.y
    this.dragState.initialCamX = this.cameraContainer.x
    this.dragState.initialCamY = this.cameraContainer.y
    this.dragState.hasDragged = false
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    if (!this.dragState.isDown) return
    const dx = e.global.x - this.dragState.startX
    const dy = e.global.y - this.dragState.startY
    if (!this.dragState.hasDragged && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      this.dragState.hasDragged = true
      this.app.canvas.style.cursor = 'grabbing'
    }
    if (this.dragState.hasDragged) {
      this.cameraContainer.x = this.dragState.initialCamX + dx
      this.cameraContainer.y = this.dragState.initialCamY + dy
      this.clampCamera()
    }
  }

  private onPointerUp(): void {
    this.dragState.isDown = false
    this.app.canvas.style.cursor = ''
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const rect = this.app.canvas.getBoundingClientRect()
    this.setZoom(this._zoom * factor, e.clientX - rect.left, e.clientY - rect.top)
    this.app.stage.emit('garden:zoom', { zoom: this._zoom })
  }

  private onResize(): void {
    if (this.app?.stage) {
      this.app.stage.hitArea = new Rectangle(0, 0, this.app.screen.width, this.app.screen.height)
      this.clampCamera()
    }
  }

  destroy(): void {
    this.destroyed = true
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    if (this.initialized) {
      this.app.canvas.removeEventListener('wheel', this.onWheel)
      this.app.destroy(true, { children: true })
    }
  }
}