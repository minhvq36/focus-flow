import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUserStore } from '@/store/user-store'
import type { TaskSummary, QuotaToday, CreateTaskRequest, FilterState, TaskStatus } from '@/types/task'
import {  ALL_STATUSES, DEFAULT_FILTER } from '@/types/task'

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build query string từ FilterState để append vào URL.
 * BE nhận: ?date=today|yesterday|7days|30days & status=active,paused,...
 * BE tự resolve CURRENT_DATE — FE không gửi date string.
 * TODO: Add limit/offset pagination when needed
 *       (worst case Premium 30days = 480 tasks, currently acceptable)
 */
function buildQueryString(filter: FilterState): string {
  const params = new URLSearchParams({ date: filter.dateRange })
  const isAll = ALL_STATUSES.every(s => filter.statusFilters.has(s))
  if (!isAll) {
    params.set('status', [...filter.statusFilters].join(','))
  }
  return `?${params.toString()}`
}

/**
 * staleTime theo filter:
 * - Có 'active' trong filter → stale 0 (timer đang chạy, data thay đổi liên tục)
 * - today không có active → stale 0 (user có thể submit/give_up bất cứ lúc nào)
 * - history ranges (yesterday/7days/30days) không có active → cache 2 phút (data đã settled)
 */
function resolveStaleTime(filter: FilterState): number {
  const hasActive = filter.statusFilters.has('active')
  const isHistory = filter.dateRange !== 'today'

  if (hasActive || !isHistory) return 0
  return 1000 * 60 * 2
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTasks(filter: FilterState = DEFAULT_FILTER) {
  const { user } = useUserStore()
  const queryClient = useQueryClient()

  // Serialize statusFilters (Set không stable làm queryKey) → sorted array
  const statusKey = [...filter.statusFilters].sort() as TaskStatus[]

  // 1. Task list
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
    staleTime: resolveStaleTime(filter),
  })

  // 2. Quota — luôn today, stale 0
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

  // 3. Mutation tạo task — optimistic quota
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
      queryClient.invalidateQueries({
        queryKey: ['tasks', filter.dateRange, statusKey, user?.id],
      })
      queryClient.invalidateQueries({ queryKey: ['quota', 'today', user?.id] })
    },
  })

  const submitTaskMutation = useMutation({
    mutationFn: (taskId: string) => 
      // Sửa lại endpoint này cho đúng với Backend của bạn nhé (post, patch hay put)
      api.post(`/api/tasks/${taskId}/submit`, {}), 
    onSuccess: () => {
      // Báo queryClient fetch lại list task sau khi submit thành công
      queryClient.invalidateQueries({
        queryKey: ['tasks', filter.dateRange, statusKey, user?.id],
      })
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

    submitTask: submitTaskMutation.mutateAsync,
    isSubmitting: submitTaskMutation.isPending,
  }
}