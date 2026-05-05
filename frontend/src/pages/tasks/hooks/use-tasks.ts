import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUserStore } from '@/store/user-store'
import type { TaskSummary, QuotaToday, CreateTaskRequest } from '@/types/task'
import { DEFAULT_FILTER } from '../components/filter-panel'
import type { FilterState, TaskStatus } from '../components/filter-panel'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build query string từ FilterState để append vào URL.
 * Backend nhận: ?date=today|yesterday|7days|30days & status=active,paused,...
 */

// TODO: Check if need to build extend in api.ts
function buildQueryString(filter: FilterState): string {
  const params = new URLSearchParams({ date: filter.dateRange })
  if (filter.statusFilters.size > 0) {
    params.set('status', [...filter.statusFilters].join(','))
  }
  return `?${params.toString()}`
}

/**
 * staleTime theo date range:
 * - today: 0 — data thay đổi liên tục trong ngày
 * - history: 2 phút — data đã settled, ít thay đổi
 */
function resolveStaleTime(dateRange: FilterState['dateRange']): number {
  return dateRange === 'today' ? 0 : 1000 * 60 * 2
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTasks(filter: FilterState = DEFAULT_FILTER) {
  const { user } = useUserStore()
  const queryClient = useQueryClient()

  // Serialize statusFilters (Set không stable làm queryKey) → sorted array
  const statusKey = [...filter.statusFilters].sort() as TaskStatus[]

  // 1. Task list — key bao gồm filter để mỗi filter combo cache riêng
  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: reloadTasks,
  } = useQuery({
    queryKey: ['tasks', filter.dateRange, statusKey, user?.id],
    queryFn: () =>
      api.get<TaskSummary[]>(`/api/tasks${buildQueryString(filter)}`),
    enabled: !!user,
    staleTime: resolveStaleTime(filter.dateRange),
  })

  // 2. Quota — không đổi, luôn là today, giữ nguyên 100%
  const {
    data: quota = { used: 0, limit: 3 },
    isLoading: isLoadingQuota,
    refetch: reloadQuota,
  } = useQuery({
    queryKey: ['quota', 'today', user?.id],
    queryFn: () => api.get<QuotaToday>('/api/tasks/quota/today'),
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // 3. Mutation tạo task — optimistic quota, giữ nguyên 100%
  const createTaskMutation = useMutation({
    mutationFn: (params: CreateTaskRequest) =>
      api.post<{ id: string }>('/api/tasks', params),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['quota', 'today', user?.id] })
      const previousQuota = queryClient.getQueryData<QuotaToday>([
        'quota', 'today', user?.id,
      ])
      queryClient.setQueryData<QuotaToday>(
        ['quota', 'today', user?.id],
        (old) => (old ? { ...old, used: old.used + 1 } : old),
      )
      return { previousQuota }
    },
    onError: (_err, _newVal, context) => {
      if (context?.previousQuota) {
        queryClient.setQueryData(
          ['quota', 'today', user?.id],
          context.previousQuota,
        )
      }
    },
    onSettled: () => {
      // Chỉ invalidate đúng filter đang active (tránh refetch tất cả cache)
      queryClient.invalidateQueries({
        queryKey: ['tasks', filter.dateRange, statusKey, user?.id],
      })
      queryClient.invalidateQueries({ queryKey: ['quota', 'today', user?.id] })
    },
  })

  return {
    tasks,
    quota,
    loading: isLoadingTasks || isLoadingQuota,
    error: tasksError ? (tasksError as Error).message : null,
    reload: async () => {
      await Promise.all([reloadTasks(), reloadQuota()])
    },
    createTask: createTaskMutation.mutateAsync,
    isCreating: createTaskMutation.isPending,
  }
}