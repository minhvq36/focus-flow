import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { GardenListItem, GardenResponse } from '@/types/garden'

// ============================================================
// GET /api/garden — list all gardens (meta only, no placements)
// ============================================================
export function useGardenList() {
  return useQuery({
    queryKey: ['garden'],
    queryFn: () => api.get<GardenListItem[]>('/api/garden'),
  })
}

// ============================================================
// GET /api/garden/:id — single garden + full placements
// ============================================================
export function useGarden(id: string | null) {
  return useQuery({
    queryKey: ['garden', id],
    queryFn: () => api.get<GardenResponse>(`/api/garden/${id}`),
    enabled: !!id,
  })
}

// ============================================================
// localStorage: remember last visited garden
// ============================================================
const LAST_GARDEN_KEY = 'last_garden_id'

export function getLastGardenId(): string | null {
  return localStorage.getItem(LAST_GARDEN_KEY)
}

export function setLastGardenId(id: string): void {
  localStorage.setItem(LAST_GARDEN_KEY, id)
}