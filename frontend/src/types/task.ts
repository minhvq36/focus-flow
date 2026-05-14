export type TaskStatus = 'active' | 'paused' | 'submitted' | 'given_up'

export interface TodoItem {
  id: string
  text: string
  done: boolean
  children?: TodoItem[]
}

export interface Task {
  id: string
  user_id: string
  title: string
  todos: TodoItem[]
  status: TaskStatus
  penalty_mode: boolean
  registered_duration_min: number
  actual_duration_sec: number
  started_at: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface TaskSummary {
  id: string
  title: string
  status: TaskStatus
  penalty_mode: boolean
  registered_duration_min: number
  actual_duration_sec: number
  started_at: string | null
  created_at: string
  completed_at: string | null
  todo_count: number
  todo_done_count: number
}

export interface QuotaToday {
  used: number
  limit: number
}

export interface CreateTaskRequest {
  title: string
  todos: TodoItem[]
  registered_duration_min: number
  penalty_mode: boolean
}

export interface PauseTaskRequest {
  todos: TodoItem[]
}

export interface SubmitTaskRequest {
  todos: TodoItem[]
}

export interface GiveUpTaskRequest {
  todos: TodoItem[]
}

export interface UpdateTodosRequest {
  todos: TodoItem[]
}

export interface ExtendRequest {
  add_minutes: number
}

export interface AddNoteRequest {
  content: string
}

export interface UpdateNoteRequest {
    content: string
}

// ─── Filter ───────────────────────────────────────────────────────────────────
 
export type DateRange = 'today' | 'yesterday' | '7days' | '30days'
 
export interface FilterState {
  dateRange: DateRange
  statusFilters: Set<TaskStatus>
}
 
export const ALL_STATUSES: TaskStatus[] = ['active', 'paused', 'submitted', 'given_up']
 
export const DEFAULT_FILTER: FilterState = {
  dateRange: 'today',
  statusFilters: new Set(),
}

export interface TaskNote {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}