import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUserStore } from '@/store/user-store'
import type { TaskSummary, QuotaToday, CreateTaskRequest } from '@/types/task'

export function useTasks() {
  const { user } = useUserStore()
  const queryClient = useQueryClient()

  // 1. Lấy danh sách task (Thêm refetch: reloadTasks ở đây)
  const { 
    data: tasks =[], 
    isLoading: isLoadingTasks, 
    error: tasksError,
    refetch: reloadTasks // <--- Lấy hàm refetch ra
  } = useQuery({
    queryKey: ['tasks', 'today', user?.id],
    queryFn: () => api.get<TaskSummary[]>('/api/tasks'),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })

  // 2. Lấy hạn mức quota (Thêm refetch: reloadQuota ở đây)
  const { 
    data: quota = { used: 0, limit: 3 }, 
    isLoading: isLoadingQuota,
    refetch: reloadQuota // <--- Lấy hàm refetch ra
  } = useQuery({
    queryKey: ['quota', 'today', user?.id],
    queryFn: () => api.get<QuotaToday>('/api/tasks/quota/today'),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })

  // 3. Mutation tạo task với Optimistic Quota
  const createTaskMutation = useMutation({
    mutationFn: (params: CreateTaskRequest) => api.post<{ id: string }>('/api/tasks', params),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey:['quota', 'today', user?.id] })
      const previousQuota = queryClient.getQueryData<QuotaToday>(['quota', 'today', user?.id])

      queryClient.setQueryData<QuotaToday>(['quota', 'today', user?.id], (old) => 
        old ? { ...old, used: old.used + 1 } : old
      )

      return { previousQuota }
    },
    onError: (_err, _newVal, context) => {
      if (context?.previousQuota) {
        queryClient.setQueryData(['quota', 'today', user?.id], context.previousQuota)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey:['tasks', 'today', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['quota', 'today', user?.id] })
    }
  })

  return {
    tasks,
    quota,
    loading: isLoadingTasks || isLoadingQuota,
    error: tasksError ? (tasksError as Error).message : null,
    // Hàm reload giờ đã nhận diện được reloadTasks và reloadQuota
    reload: async () => {
      await Promise.all([reloadTasks(), reloadQuota()])
    },
    createTask: createTaskMutation.mutateAsync,
    isCreating: createTaskMutation.isPending
  }
}