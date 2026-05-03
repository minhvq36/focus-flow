import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { useUserStore } from '@/store/user-store'
import type { Task, QuotaToday } from '@/types/task'

interface UseTasksReturn {
  tasks: Task[]
  quota: QuotaToday
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useTasks(): UseTasksReturn {
  const { user } = useUserStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [quota, setQuota] = useState<QuotaToday>({ used: 0, limit: 3 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [tasksData, quotaData] = await Promise.all([
        api.get<Task[]>(`/api/tasks`),
        api.get<QuotaToday>('/api/tasks/quota/today'),
      ])
      setTasks(tasksData)
      setQuota(quotaData)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message ?? 'Failed to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { reload() }, [reload])

  return { tasks, quota, loading, error, reload }
}