import { Application, Container } from 'pixi.js'

// ============================================================
// GardenApp — owns the PixiJS Application instance
// Created once, mounted to a canvas container div
// ============================================================

export interface GardenAppOptions {
  container: HTMLDivElement
  onReady?: (app: Application) => void
}

export class GardenApp {
  app: Application
  stage: Container  // root container, children go here

  private resizeObserver: ResizeObserver | null = null

  constructor() {
    this.app = new Application()
    this.stage = new Container()
  }

  async init({ container, onReady }: GardenAppOptions): Promise<void> {
    await this.app.init({
      resizeTo: container,          // auto-resize canvas to container
      background: 'transparent',
      backgroundAlpha: 0,           // transparent bg — island effect
      antialias: true,
      resolution: window.devicePixelRatio ?? 1,
      autoDensity: true,            // CSS size stays correct on HiDPI
    })

    // Mount canvas into the div
    container.appendChild(this.app.canvas)

    // Add root stage
    this.app.stage.addChild(this.stage)

    // Handle browser zoom / window resize
    this.resizeObserver = new ResizeObserver(() => {
      this.onResize()
    })
    this.resizeObserver.observe(container)

    onReady?.(this.app)
  }

  private onResize(): void {
    // app.resize() is called automatically by resizeTo
    // Emit a custom event so GardenGrid can re-center itself
    this.app.stage.emit('garden:resize', {
      width: this.app.screen.width,
      height: this.app.screen.height,
    })
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.app.destroy(true, { children: true })
  }
}