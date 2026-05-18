import { Application, Container, Rectangle, FederatedPointerEvent } from 'pixi.js'

export const MIN_ZOOM = 0.05
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

  setZoom(newZoom: number, pivotX?: number, pivotY?: number): void {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom))
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
    this.gridCols = gridCols

    const vw = this.app.screen.width
    const vh = this.app.screen.height

    const totalW = gridCols * tileWidth
    const totalH = gridRows * tileHeight

    this._fitZoom = Math.min(vw / totalW, vh / totalH) * 1.04
    const targetZoom = savedZoom ?? this._fitZoom

    this._zoom = targetZoom
    this.cameraContainer.scale.set(targetZoom)

    // 🛑 VÌ LƯỚI ĐÃ CÓ PIVOT Ở GIỮA -> CHỈ CẦN QUĂNG NÓ RA GIỮA MÀN HÌNH!
    this.cameraContainer.x = vw / 2
    
    // VISUAL OFFSET: Nếu bạn thấy đồ vật (cây cối mọc lên trên) làm chóp đảo bị chật đỉnh, 
    // bạn có thể bù trừ bằng cách +30 hoặc +50 px để hòn đảo tụt xuống một tí xíu cho thuận mắt.
    // Nếu không muốn, cứ để nguyên vh/2.
    this.cameraContainer.y = (vh / 2) + 20 

    this.clampCamera()
  }

  // ── THUẬT TOÁN KẸP CAMERA (SIÊU ĐƠN GIẢN NHỜ PIVOT) ──
  private clampCamera(): void {
    if (this.gridCols === 0) return

    const vw = this.app.screen.width
    const vh = this.app.screen.height

    // Tọa độ an toàn: Tâm hòn đảo không được ra khỏi hình chữ nhật an toàn (cách mép 10% màn hình)
    const padX = vw * 0.1
    const padY = vh * 0.1

    const minX = padX
    const maxX = vw - padX
    const minY = padY
    const maxY = vh - padY

    if (minX > maxX) this.cameraContainer.x = vw / 2
    else this.cameraContainer.x = Math.max(minX, Math.min(maxX, this.cameraContainer.x))

    if (minY > maxY) this.cameraContainer.y = vh / 2
    else this.cameraContainer.y = Math.max(minY, Math.min(maxY, this.cameraContainer.y))
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