import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUserStore } from '@/store/user-store'
import type { Task, TodoItem } from '@/types/task'

export function useTaskDetail(taskId: string) {
  const { user } = useUserStore()
  const queryClient = useQueryClient()

  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['task', taskId, user?.id],
    queryFn: () => api.get<Task>(`/api/tasks/${taskId}`),
    enabled: !!user && !!taskId,
    staleTime: 0,
  })

  const pauseMutation = useMutation({
    mutationFn: () => api.post(`/api/tasks/${taskId}/pause`, {}),
    onSuccess: () => invalidate(),
  })

  const resumeMutation = useMutation({
    mutationFn: () => api.post(`/api/tasks/${taskId}/resume`, {}),
    onSuccess: () => invalidate(),
  })

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/api/tasks/${taskId}/submit`, {}),
    onSuccess: () => invalidate(),
  })

  const giveUpMutation = useMutation({
    mutationFn: () => api.post(`/api/tasks/${taskId}/giveup`, {}),
    onSuccess: () => invalidate(),
  })

  const updateTodosMutation = useMutation({
    mutationFn: (todos: TodoItem[]) =>
      api.patch(`/api/tasks/${taskId}/todos`, { todos }),
    // Không invalidate — optimistic local only, debounce ở component
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['quota', 'today'] })
  }

  return {
    task,
    isLoading,
    error,
    pause: pauseMutation.mutateAsync,
    resume: resumeMutation.mutateAsync,
    submit: submitMutation.mutateAsync,
    giveUp: giveUpMutation.mutateAsync,
    updateTodos: updateTodosMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    isGivingUp: giveUpMutation.isPending,
  }
}