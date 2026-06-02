import { useEffect, useRef, useState } from 'react'
import { GardenApp } from './utils/garden-app'
import { GardenGrid } from './utils/garden-grid'
import { useGardenList, useGarden, getLastGardenId, setLastGardenId } from './hooks/use-garden'
import type { PlacementResponse } from '@/types/garden'

// Nhập các component nội bộ
import { RecenterButton } from './components/recenter-button'
import { GardenTabs } from './components/garden-tabs'
import { LoadingOverlay } from './components/loading-overlay'
import { TilePopup } from './components/tile-popup'
import { GardenToolbar } from './components/garden-toolbar'

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

  const [isCanvasReady, setIsCanvasReady] = useState(false)

  // Fallback về Garden cuối cùng nếu không có Cache
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

  // Khởi tạo PixiJS Canvas
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
        
        setIsCanvasReady(true)
      },
    })

    return () => {
      app.destroy()
      gardenAppRef.current = null
      gardenGridRef.current = null
      setIsCanvasReady(false)
    }
  }, [])

  // Load Data vào Canvas
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
      app?.app?.stage?.off('garden:zoom', handleZoom)
    }
  }, [garden, isCanvasReady])

  // --- HANDLERS CHO CÁC COMPONENTS ---
  const handleRecenter = () => {
    if (garden && gardenAppRef.current) {
      const size = garden.current_size ?? garden.base_size ?? 5
      gardenAppRef.current.applyFitZoom(size, size, TILE_WIDTH, TILE_HEIGHT, null)
      saveZoom(garden.id, gardenAppRef.current.zoom) 
      setSelectedTile(null)
    }
  }

  const handleGardenChange = (id: string) => {
    setActiveGardenId(id)
    setSelectedTile(null)
  }

  // Khối DOM HTML gọn gàng hơn hẳn
  return (
    <div className="relative w-[90vw] md:w-[85vw] max-w-6xl min-w-[320px] md:min-w-[500px] h-[85vh] min-h-[500px] mx-auto my-8 border border-border rounded-xl shadow-sm overflow-hidden bg-background">
      
      {/* Lớp Canvas PixiJS */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Các lớp UI xếp chồng lên trên (Overlays) */}
      <RecenterButton onRecenter={handleRecenter} />

      <GardenTabs 
        gardenList={gardenList} 
        activeGardenId={activeGardenId}
        onChange={handleGardenChange}
      />

      <GardenToolbar />

      {isLoading && <LoadingOverlay />}

      {selectedTile && (
        <TilePopup 
          selectedTile={selectedTile} 
          onClose={() => setSelectedTile(null)} 
        />
      )}
      
    </div>
  )
}