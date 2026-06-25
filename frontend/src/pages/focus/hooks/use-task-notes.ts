import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUserStore } from '@/store/user-store'
import type { AddNoteRequest, TaskNote, UpdateNoteRequest } from '@/types/task'

export function useTaskNotes(taskId: string) {
  const { user } = useUserStore()
  const queryClient = useQueryClient()

  const queryKey = ['task-notes', taskId, user?.id]

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get<TaskNote[]>(`/api/tasks/${taskId}/notes`),
    enabled: !!user && !!taskId,
  })

  const createMutation = useMutation({
    mutationFn: (req: AddNoteRequest) =>
      api.post<TaskNote>(`/api/tasks/${taskId}/notes`, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ noteId, req }: { noteId: string; req: UpdateNoteRequest }) =>
      api.patch<TaskNote>(`/api/tasks/${taskId}/notes/${noteId}`, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) =>
      api.delete(`/api/tasks/${taskId}/notes/${noteId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    notes,
    isLoading,
    createNote: createMutation.mutateAsync,
    updateNote: updateMutation.mutateAsync,
    deleteNote: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  }
}