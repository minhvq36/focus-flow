import { useEffect, useRef, useState } from 'react'
import { GardenApp } from './utils/garden-app'
import { GardenGrid } from './utils/garden-grid'
import { useGardenList, useGarden, getLastGardenId, setLastGardenId } from './hooks/use-garden'
import type { PlacementResponse } from '@/types/garden'

const ZOOM_KEY = (gardenId: string) => `garden_zoom_${gardenId}`

function getSavedZoom(gardenId: string): number | null {
  try {
    const raw = localStorage.getItem(ZOOM_KEY(gardenId))
    if (raw === null) return null
    const n = parseFloat(raw)
    return isFinite(n) ? n : null
  } catch {
    return null
  }
}

function saveZoom(gardenId: string, zoom: number): void {
  try {
    localStorage.setItem(ZOOM_KEY(gardenId), String(zoom))
  } catch {}
}

const TILE_WIDTH = 64
const TILE_HEIGHT = 64

export default function Garden() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gardenAppRef = useRef<GardenApp | null>(null)
  const gardenGridRef = useRef<GardenGrid | null>(null)

  const { data: gardenList } = useGardenList()
  const [activeGardenId, setActiveGardenId] = useState<string | null>(getLastGardenId())

  // 🌟 FIX 1: Thêm state isCanvasReady để theo dõi khi nào Canvas khởi tạo xong
  const [isCanvasReady, setIsCanvasReady] = useState(false)

  useEffect(() => {
    if (!activeGardenId && gardenList && gardenList.length > 0) {
      setActiveGardenId(gardenList.at(-1)!.id)
    }
  }, [gardenList, activeGardenId])

  const { data: garden, isLoading } = useGarden(activeGardenId)

  const [selectedTile, setSelectedTile] = useState<{
    col: number
    row: number
    placement: PlacementResponse | null
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const app = new GardenApp()
    gardenAppRef.current = app

    app.init({
      container: containerRef.current,
      onReady: () => {
        const grid = new GardenGrid()
        grid.getIsDragging = () => app.isDragging
        grid.onTileClick = (col, row, placement) => {
          setSelectedTile({ col, row, placement })
        }
        app.cameraContainer.addChild(grid)
        gardenGridRef.current = grid
        
        // 🌟 FIX 2: Cập nhật state báo hiệu Canvas và Grid đã sẵn sàng
        setIsCanvasReady(true)
      },
    })

    return () => {
      app.destroy()
      gardenAppRef.current = null
      gardenGridRef.current = null
      // Reset lại state khi unmount
      setIsCanvasReady(false)
    }
  }, [])

  useEffect(() => {
    if (!garden || !gardenGridRef.current || !gardenAppRef.current) return

    const app = gardenAppRef.current
    gardenGridRef.current.load(garden)

    const size: number = garden.current_size ?? garden.base_size ?? 5

    setLastGardenId(garden.id)
    setSelectedTile(null)

    const savedZoom = getSavedZoom(garden.id)
    app.applyFitZoom(size, size, TILE_WIDTH, TILE_HEIGHT, savedZoom)

    const handleZoom = ({ zoom }: { zoom: number }) => saveZoom(garden.id, zoom)
    app.app.stage.on('garden:zoom', handleZoom)
    
    return () => {
      // 🌟 FIX 3: Thêm Optional Chaining (?.) để tránh lỗi khi Component Unmount
      app?.app?.stage?.off('garden:zoom', handleZoom)
    }
  }, [garden, isCanvasReady]) // 🌟 FIX 4: Thêm isCanvasReady vào dependency array

  return (
    <div className="relative w-[90vw] md:w-[85vw] max-w-6xl min-w-[320px] md:min-w-[500px] h-[85vh] min-h-[500px] mx-auto my-8 border border-border rounded-xl shadow-sm overflow-hidden bg-background">
      
      <div ref={containerRef} className="absolute inset-0" />

      {/* Recenter button */}
      <button
        onClick={() => {
          if (garden && gardenAppRef.current) {
            const size = garden.current_size ?? garden.base_size ?? 5
            gardenAppRef.current.applyFitZoom(size, size, TILE_WIDTH, TILE_HEIGHT, null)
            
            saveZoom(garden.id, gardenAppRef.current.zoom) 
            
            setSelectedTile(null)
          }
        }}
        className="absolute bottom-6 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-background/90 backdrop-blur shadow border border-border hover:bg-background transition text-muted-foreground"
        title="Recenter Camera"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
      </button>

      {gardenList && gardenList.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {gardenList.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setActiveGardenId(g.id)
                setSelectedTile(null)
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium shadow-sm transition-colors border ${
                g.id === activeGardenId
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'bg-background/80 backdrop-blur border-border hover:bg-background'
              }`}
            >
              Garden {g.garden_index}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading garden…</p>
        </div>
      )}

      {selectedTile && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 rounded-2xl bg-card/95 backdrop-blur shadow-lg px-6 py-3 text-sm flex items-center gap-4 border border-border">
          <span className="text-muted-foreground">
            Tile ({selectedTile.col}, {selectedTile.row})
          </span>
          {selectedTile.placement ? (
            <span className="font-medium text-primary">
              {selectedTile.placement.item_id} · {selectedTile.placement.health_status}
            </span>
          ) : (
            <span className="text-muted-foreground">Empty</span>
          )}
          <button
            onClick={() => setSelectedTile(null)}
            className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}