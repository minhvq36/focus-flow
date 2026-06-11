import { useEffect, useRef, useState } from 'react'
import { GardenApp } from './utils/garden-app'
import { GardenGrid } from './utils/garden-grid'
import { useGardenList, useGarden, getLastGardenId, setLastGardenId, usePlaceItem } from './hooks/use-garden'
import type { PlacementResponse } from '@/types/garden'

import { RecenterButton } from './components/recenter-button'
import { GardenTabs } from './components/garden-tabs'
import { LoadingOverlay } from './components/loading-overlay'
import { TilePopup } from './components/tile-popup'
import { GardenToolbar } from './components/garden-toolbar'

import { usePlacementStore } from '@/store/placement-store'

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

  // Lấy dữ liệu và hàm từ Zustand Store
  const { activeItem, rotation, clearPlacement, rotateItem, consumeActiveItem } = usePlacementStore()
  
  // Khởi tạo Mutation cho việc đặt đồ
  const placeMutation = usePlaceItem(activeGardenId)

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
        
        // CLICK THÔNG THƯỜNG (Để xem thông tin)
        grid.onTileClick = (col, row, placement) => {
          setSelectedTile({ col, row, placement })
        }

        // CLICK ĐỂ ĐẶT ĐỒ (Khi đang cầm item)
        grid.onRequestPlace = (col, row, item, rot) => {
          if (!item.instance_ids || item.instance_ids.length === 0) return
          
          const instanceId = item.instance_ids[0]

          // 1. GỌI API
          placeMutation.mutate({
            inventory_id: instanceId,
            grid_x: col,
            grid_y: row,
            rotation: rot,
            asset_key: item.asset_key,
            item_width: item.width,
            item_height: item.height
          })

          // 2. XỬ LÝ STORE GIAO DIỆN SAU KHI CLICK
          const isShiftPressed = window.event && (window.event as MouseEvent).shiftKey
          
          if (isShiftPressed) {
            // Nếu đè SHIFT: Gọi hàm consume để cắt bỏ ID vừa dùng và giảm số lượng trên tay.
            // (Lưu ý: Nếu hàm consume phát hiện hết đồ, nó sẽ tự động clearPlacement luôn)
            consumeActiveItem() 
          } else {
            // Nếu KHÔNG đè SHIFT: Đặt 1 cái rồi cất công cụ đi luôn
            clearPlacement()
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
  }, []) // Chỉ chạy 1 lần khi mount

  // Load Data vào Canvas
  useEffect(() => {
    if (!garden || !gardenGridRef.current || !gardenAppRef.current) return

    const app = gardenAppRef.current
    gardenGridRef.current.load(garden)

    // Mỗi khi load xong data, cập nhật luôn state của Blueprint (Tránh bị mất ghost khi refetch)
    // gardenGridRef.current.setPlacementMode(activeItem, rotation)

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

      {/* OVERLAY HƯỚNG DẪN KHI ĐANG CẦM ĐỒ */}
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
            Remaining: {activeItem.instance_ids.length}
          </div>
        </div>
      )}
      
    </div>
  )
}