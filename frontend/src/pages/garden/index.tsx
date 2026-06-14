import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GardenApp } from './utils/garden-app'
import { GardenGrid } from './utils/garden-grid'
import { useGardenList, useGarden, getLastGardenId, setLastGardenId, useBatchPlaceItems } from './hooks/use-garden'
import type { PlacementResponse, GardenResponse, PlaceItemReq } from '@/types/garden'
import type { InBagItem } from '@/types/inventory'

import { RecenterButton } from './components/recenter-button'
import { GardenTabs } from './components/garden-tabs'
import { LoadingOverlay } from './components/loading-overlay'
import { TilePopup } from './components/tile-popup'
import { GardenToolbar } from './components/garden-toolbar'

import { usePlacementStore } from '@/store/placement-store'
import { toast } from 'sonner'

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
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const gardenAppRef = useRef<GardenApp | null>(null)
  const gardenGridRef = useRef<GardenGrid | null>(null)

  const { data: gardenList } = useGardenList()
  const [activeGardenId, setActiveGardenId] = useState<string | null>(getLastGardenId())

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

  const { activeItem, rotation, clearPlacement, rotateItem, consumeActiveItem } = usePlacementStore()
  
  // ==========================================
  // HỆ THỐNG QUEUE & BATCH PLACEMENT
  // ==========================================
  const batchMutation = useBatchPlaceItems(activeGardenId)
  const batchQueueRef = useRef<PlaceItemReq[]>([])
  const rollbackSnapshotRef = useRef<{ garden: GardenResponse | undefined, inventory: InBagItem[] | undefined } | null>(null)

  const flushBatchQueue = () => {
    if (batchQueueRef.current.length === 0) return

    const payloadToSend = [...batchQueueRef.current]
    batchQueueRef.current = [] 

    batchMutation.mutate(payloadToSend, {
      onError: (err) => {
        if (activeGardenId && rollbackSnapshotRef.current?.garden) {
          queryClient.setQueryData(['garden', activeGardenId], rollbackSnapshotRef.current.garden)
        }
        if (rollbackSnapshotRef.current?.inventory) {
          queryClient.setQueryData(['inventory', 'bag'], rollbackSnapshotRef.current.inventory)
        }
        toast.error("Failed to save. Action undone!")
        console.error("Batch placement error:", err)
      },
      onSettled: () => {
        rollbackSnapshotRef.current = null 
      }
    })
  }

  // BẢO VỆ KẼ HỞ BẰNG EVENT LISTENER
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') flushBatchQueue()
    }

    const handleWindowBlur = () => {
      flushBatchQueue()
      clearPlacement()
    }

    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)
    
    return () => {
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
      flushBatchQueue()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGardenId]) 

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

        // ==========================================
        // LOGIC CLICK ĐỂ ĐẶT ĐỒ
        // ==========================================
        grid.onRequestPlace = async (col, row, item, rot) => {
          if (!item.instance_ids || item.instance_ids.length === 0) return
          
          const instanceId = item.instance_ids[0]

          // ✅ FIX 3: Báo ngay cho PixiJS biết ô này đã bị chiếm trước khi React kịp Update
          const isRotated = rot === 90 || rot === 270
          const effW = isRotated ? item.height : item.width
          const effH = isRotated ? item.width : item.height
          grid.markTileOccupied(col, row, effW, effH)

          // 1. TẠO SNAPSHOT ROLLBACK CHO LƯỢT ĐẦU TIÊN
          if (batchQueueRef.current.length === 0) {
            await queryClient.cancelQueries({ queryKey: ['garden', activeGardenId] })
            await queryClient.cancelQueries({ queryKey: ['inventory', 'bag'] })

            rollbackSnapshotRef.current = {
              garden: queryClient.getQueryData<GardenResponse>(['garden', activeGardenId]),
              inventory: queryClient.getQueryData<InBagItem[]>(['inventory', 'bag'])
            }
          }

          // 2. NHÉT VÀO QUEUE
          batchQueueRef.current.push({
            inventory_id: instanceId,
            grid_x: col,
            grid_y: row,
            rotation: rot,
          })

          // 3. OPTIMISTIC UPDATE CHO VƯỜN (TỨC THÌ)
          queryClient.setQueryData<GardenResponse>(['garden', activeGardenId], (old) => {
            if (!old) return old
            const fakePlacement: PlacementResponse = {
              id: `temp_${Date.now()}_${Math.random()}`,
              inventory_id: instanceId,
              item_id: 'temp', 
              asset_key: item.asset_key,
              grid_x: col,
              grid_y: row,
              item_width: item.width, 
              item_height: item.height,
              effective_width: effW, 
              effective_height: effH,
              rotation: rot,
              health_status: 'healthy',
              wilted_at: null,
              placed_at: new Date().toISOString(),
            }
            return { ...old, placements: [...old.placements, fakePlacement] }
          })

          // 4. OPTIMISTIC UPDATE CHO TÚI ĐỒ (TỨC THÌ)
          queryClient.setQueryData<InBagItem[]>(['inventory', 'bag'], (oldBag) => {
            if (!oldBag) return []
            return oldBag.map(invItem => {
              if (invItem.asset_key === item.asset_key) {
                return { 
                  ...invItem, 
                  quantity: invItem.quantity - 1,
                  instance_ids: invItem.instance_ids?.filter(id => id !== instanceId) || []
                }
              }
              return invItem
            }).filter(invItem => invItem.quantity > 0)
          })

          // 5. CẬP NHẬT GIAO DIỆN ZUSTAND
          const isShiftPressed = window.event && (window.event as MouseEvent).shiftKey
          
          if (isShiftPressed) {
            consumeActiveItem() 
          } else {
            consumeActiveItem()
            clearPlacement()
            flushBatchQueue() 
          }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGardenId]) 

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden, isCanvasReady])

  // --- IMPERATIVE BRIDGE: Đồng bộ từ Zustand -> PixiJS ---
  useEffect(() => {
    if (gardenGridRef.current && isCanvasReady) {
      gardenGridRef.current.setPlacementMode(activeItem, rotation)
    }
  }, [activeItem, rotation, isCanvasReady])

  // --- LẮNG NGHE BÀN PHÍM ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return

      const { activeItem, rotateItem, clearPlacement } = usePlacementStore.getState()
      if (!activeItem) return
      if (e.code === 'KeyR') rotateItem()
      if (e.code === 'Escape') clearPlacement()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  return (
    <div className="relative w-[90vw] md:w-[85vw] max-w-6xl min-w-[320px] md:min-w-[500px] h-[85vh] min-h-[500px] mx-auto my-8 border border-border rounded-xl shadow-sm overflow-hidden bg-background">
      
      <div ref={containerRef} className="absolute inset-0" />

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

      {activeItem && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-6 py-2.5 bg-slate-900/80 backdrop-blur-md text-white text-sm font-medium rounded-full shadow-lg pointer-events-none flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <div className="flex gap-1.5 items-center">
            <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 font-mono">R</span> Xoay
          </div>
          <div className="w-1 h-1 bg-slate-500 rounded-full" />
          <div className="flex gap-1.5 items-center">
            <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 font-mono">ESC</span> Huỷ
          </div>
          <div className="w-1 h-1 bg-slate-500 rounded-full" />
          <div className="flex gap-1.5 items-center">
            <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 font-mono">Shift</span> Đặt liên tục
          </div>
          <div className="ml-2 pl-3 border-l border-slate-600 font-bold text-amber-400">
            Còn lại: {activeItem.instance_ids?.length || 0}
          </div>
        </div>
      )}
      
    </div>
  )
}