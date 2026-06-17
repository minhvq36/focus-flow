import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GardenApp } from './utils/garden-app'
import { GardenGrid } from './utils/garden-grid'
import { 
  useGardenList, 
  useGarden, 
  getLastGardenId, 
  setLastGardenId, 
  useBatchPlaceItems,
  useBatchRemoveItems // ✅ Thêm import mới
} from './hooks/use-garden'
import type { PlacementResponse, GardenResponse, PlaceItemReq } from '@/types/garden'
import type { InBagItem } from '@/types/inventory'

import { RecenterButton } from './components/recenter-button'
import { GardenTabs } from './components/garden-tabs'
import { LoadingOverlay } from './components/loading-overlay'
import { TilePopup } from './components/tile-popup'
import { GardenToolbar } from './components/garden-toolbar'
import { GardenTooltip } from './components/garden-tooltip'

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

  // ✅ Lấy thêm activeTool từ store
  const { activeItem, rotation, activeTool, clearPlacement, consumeActiveItem } = usePlacementStore()
  
  const batchMutation = useBatchPlaceItems(activeGardenId)
  const removeMutation = useBatchRemoveItems(activeGardenId) // ✅ Init Remove Mutation

  const batchQueueRef = useRef<PlaceItemReq[]>([])
  
  const rollbackSnapshotRef = useRef<{ 
    garden: GardenResponse | undefined, 
    inventory: InBagItem[] | undefined,
    activeItem: InBagItem | null
  } | null>(null)

  const performRollback = (isNetworkError: boolean = true) => {
    const snap = rollbackSnapshotRef.current
    if (!snap) return

    if (activeGardenId) {
      queryClient.setQueryData<GardenResponse>(['garden', activeGardenId], (old) => {
        if (!old) return old
        return {
          ...old,
          placements: old.placements.filter(p => !p.id.toString().startsWith('temp_'))
        }
      })
    }

    if (isNetworkError) {
      if (snap.inventory) {
        queryClient.setQueryData(['inventory', 'bag'], snap.inventory)
      }
      const currentHand = usePlacementStore.getState().activeItem
      if (snap.activeItem && currentHand && currentHand.asset_key === snap.activeItem.asset_key) {
        usePlacementStore.getState().restoreActiveItem(snap.activeItem)
      }
    }
  }

  const flushBatchQueue = () => {
    if (batchQueueRef.current.length === 0) return

    const payloadToSend = [...batchQueueRef.current]
    batchQueueRef.current = []

    batchMutation.mutate(payloadToSend, {
      onSuccess: (data) => {
        const failedItems = data.results.filter(r => !r.success)
        if (failedItems.length > 0) {
          performRollback(false)
        }
      },
      onError: (err) => {
        performRollback(true)
        toast.error("Failed to save. Action undone!")
        console.error("Batch placement error:", err)
      },
      onSettled: async () => {
        if (activeGardenId) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['garden', activeGardenId] }),
            queryClient.invalidateQueries({ queryKey: ['inventory', 'bag'] })
          ])

          const currentHand = usePlacementStore.getState().activeItem
          if (currentHand) {
            const freshInventory = queryClient.getQueryData<InBagItem[]>(['inventory', 'bag'])
            if (freshInventory) {
              const freshItem = freshInventory.find(i => i.asset_key === currentHand.asset_key)
              if (freshItem) {
                usePlacementStore.getState().restoreActiveItem(freshItem)
              } else {
                usePlacementStore.getState().clearPlacement()
              }
            }
          }
        }
        rollbackSnapshotRef.current = null
      }
    })
  }

  // ✅ Xử lý nhả Shift / Blur window để Hủy thao tác
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        flushBatchQueue()
        // Ngừng vẽ vùng xóa nếu đang dùng xẻng
        if (gardenGridRef.current) {
          gardenGridRef.current.abortRemoveSelection()
        }
      }
    }

    const handleWindowBlur = () => {
      flushBatchQueue()
      clearPlacement()
      if (gardenGridRef.current) {
        gardenGridRef.current.abortRemoveSelection()
      }
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
        // ✅ XỬ LÝ LỆNH XÓA (SINGLE & BATCH) TỪ GRID
        // ==========================================
        grid.onRequestRemoveBatch = (inventoryIds: string[]) => {
          if (!activeGardenId || inventoryIds.length === 0) return

          // 1. Optimistic Update: Xóa ngay lập tức trên UI
          queryClient.setQueryData<GardenResponse>(['garden', activeGardenId], (old) => {
            if (!old) return old
            return {
              ...old,
              placements: old.placements.filter(p => !inventoryIds.includes(p.inventory_id))
            }
          })

          // 2. Gửi API
          removeMutation.mutate({ inventory_ids: inventoryIds }, {
            onError: (err) => {
              console.error("Remove failed:", err)
              // Rollback: Fetch lại toàn bộ map nếu lỗi
              queryClient.invalidateQueries({ queryKey: ['garden', activeGardenId] })
            },
            onSettled: () => {
              // Cập nhật lại UI và Túi đồ sau khi xóa thành công
              queryClient.invalidateQueries({ queryKey: ['garden', activeGardenId] })
              queryClient.invalidateQueries({ queryKey: ['inventory', 'bag'] })
            }
          })
        }

        grid.onRequestPlace = (col, row, item, rot, isShift) => {
          if (!item.instance_ids || item.instance_ids.length === 0) return

          const instanceId = item.instance_ids[0]

          const alreadyQueued = batchQueueRef.current.some(q => q.inventory_id === instanceId)
          if (alreadyQueued) return

          const isRotated = rot === 90 || rot === 270
          const effW = isRotated ? item.height : item.width
          const effH = isRotated ? item.width : item.height
          grid.markTileOccupied(col, row, effW, effH)

          if (batchQueueRef.current.length === 0) {
            queryClient.cancelQueries({ queryKey: ['garden', activeGardenId] })
            queryClient.cancelQueries({ queryKey: ['inventory', 'bag'] })

            rollbackSnapshotRef.current = {
              garden: queryClient.getQueryData<GardenResponse>(['garden', activeGardenId]),
              inventory: queryClient.getQueryData<InBagItem[]>(['inventory', 'bag']),
              activeItem: usePlacementStore.getState().activeItem
            }
          }

          batchQueueRef.current.push({
            inventory_id: instanceId,
            grid_x: col,
            grid_y: row,
            rotation: rot,
          })

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

          if (isShift) {
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

  // ✅ Đưa activeTool vào để Sync với Grid
  useEffect(() => {
    if (gardenGridRef.current && isCanvasReady) {
      gardenGridRef.current.setPlacementMode(activeItem, rotation)
      gardenGridRef.current.setTool(activeTool) // Báo cho Grid biết tay đang cầm gì
    if (gardenAppRef.current && gardenAppRef.current.app) {
        const canvas = gardenAppRef.current.app.canvas
        if (canvas instanceof HTMLCanvasElement) {
          
          if (activeTool === 'shovel') {
            // 1. Đang dùng xẻng -> Ép ra hình xẻng lập tức
            canvas.style.cursor = "url('/shovel-cursor.png') 14 64, auto"
            
          } else if (activeItem) {
            // 2. Đang cầm hạt giống -> Ép ra chuột thường lập tức
            canvas.style.cursor = "default" 
            
          } else {
            // 3. Trạng thái bình thường (ESC) -> Xóa style ép buộc
            canvas.style.cursor = "" 
          } 
        }
      } 
    }
  }, [activeItem, rotation, activeTool, isCanvasReady])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return

      const { activeItem, rotateItem, clearPlacement } = usePlacementStore.getState()
      
      // ✅ Nhấn ESC để Hủy tool
      if (e.code === 'Escape') {
        clearPlacement() // Hàm này tự đưa tool về cursor
        if (gardenGridRef.current) {
          gardenGridRef.current.abortRemoveSelection() // Hủy vẽ vùng xóa nếu có
        }
      }

      if (!activeItem) return
      if (e.code === 'KeyR') rotateItem()
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
      
      {/* ✅ Thêm style con trỏ chuột tạm thời khi xài xẻng */}
      <div 
        ref={containerRef} 
        className={`absolute inset-0 ${activeTool === 'shovel' ? "cursor-[url('/shovel-cursor.png')_14_64,_auto]" : ""}`} 
      />

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

      <GardenTooltip activeItem={activeItem} activeTool={activeTool} />
      
    </div>
  )
}