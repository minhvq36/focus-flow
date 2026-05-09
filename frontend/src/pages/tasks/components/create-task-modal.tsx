import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { ChevronRight, Loader2, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TodoEditor, sanitizeFlat } from './todo-editor'
import { type FlatItem, flatToNested } from '@/pages/tasks/utils/todo-utils'
import type { Task, CreateTaskRequest } from '@/types/task'

import { useQueryClient } from '@tanstack/react-query'

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATIONS = [25, 30, 45, 60, 90, 120] as const
const CUSTOM_MIN = 25
const CUSTOM_MAX = 480

function makeDefaultTodo(): FlatItem {
  return { id: crypto.randomUUID(), text: '', depth: 0, done: false }
}

// ─── Form Values ──────────────────────────────────────────────────────────────

interface FormValues {
  title: string
  todos: FlatItem[]
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateTaskModal({ open, onOpenChange }: CreateTaskModalProps) {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  // ── RHF — chỉ cho các field liên quan đến typing (title, todos) ───────────
  const {
    register,
    control,
    handleSubmit,
    reset: resetForm,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      todos: [makeDefaultTodo()],
    },
  })

  // ── Local state — các field không liên quan đến typing ────────────────────
  const [durationMin, setDurationMin] = useState<number>(25)
  const [isCustom, setIsCustom]       = useState(false)
  // raw string while user is typing — avoids the "25 → 2530" problem
  const [customRaw, setCustomRaw]     = useState('25')
  const [penaltyMode, setPenaltyMode] = useState(false)

  // ── Reset ──────────────────────────────────────────────────────────────────

  function reset() {
    resetForm({ title: '', todos: [makeDefaultTodo()] })
    setDurationMin(25)
    setIsCustom(false)
    setCustomRaw('25')
    setPenaltyMode(false)
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  // ── Custom duration helpers ────────────────────────────────────────────────

  // Clamp + commit on blur — user sees the corrected value only when leaving field
  function commitCustom() {
    const parsed = parseInt(customRaw, 10)
    if (isNaN(parsed) || parsed < CUSTOM_MIN) {
      setCustomRaw(String(CUSTOM_MIN))
    } else if (parsed > CUSTOM_MAX) {
      setCustomRaw(String(CUSTOM_MAX))
      toast.warning(`Maximum session duration is ${CUSTOM_MAX} minutes (8 hours).`)
    }
  }

  // Parsed value used for submission — clamp silently
  const customMinParsed = Math.min(
    CUSTOM_MAX,
    Math.max(CUSTOM_MIN, parseInt(customRaw, 10) || CUSTOM_MIN),
  )

  const finalDuration = isCustom ? customMinParsed : durationMin

  // Range warning shown inline while typing (not a toast — less noisy)
  const customOutOfRange =
    isCustom &&
    customRaw !== '' &&
    (parseInt(customRaw, 10) < CUSTOM_MIN || parseInt(customRaw, 10) > CUSTOM_MAX)

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = handleSubmit(async (values) => {
    const sanitized = sanitizeFlat(values.todos)
    const nested    = flatToNested(sanitized)

    if (nested.length === 0 || !sanitized.some(t => t.text.trim())) {
      setError('todos', { message: 'Add at least one todo item.' })
      return
    }

    const body: CreateTaskRequest = {
      title:                   values.title.trim(),
      todos:                   nested,
      registered_duration_min: finalDuration,
      penalty_mode:            penaltyMode,
    }

    try {
      const task = await api.post<Task>('/api/tasks', body)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      handleOpenChange(false)
      navigate(`/focus/${task.id}`)
    } catch (err: unknown) {
      const e = err as Error & { status?: number }
      if (e.status === 409) {
        toast.error('Daily task limit reached. Try again tomorrow.')
      } else {
        toast.error(e.message ?? 'Failed to create task. Please try again.')
      }
    }
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-[560px] xl:max-w-[600px] gap-0 overflow-hidden p-0 bg-[#fcfef8]">
        <DialogHeader className="border-b border-border px-6 py-5 bg-[#fcfef8]">
          <DialogTitle className="text-base font-semibold">New Focus Task</DialogTitle>
        </DialogHeader>

        <div
          className="flex flex-col gap-5 overflow-hidden px-6 py-5"
          style={{ maxHeight: '70vh' }}
        >
          {/* Title */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              What will you focus on?
            </label>
            <Input
              autoFocus
              placeholder="e.g. Write the product brief"
              {...register('title', { required: 'Title is required.' })}
              onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
              className={cn(
                'text-sm bg-white',
                errors.title && 'border-destructive focus-visible:ring-destructive',
              )}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Todos */}
          <div className="flex flex-col gap-1.5 shrink min-h-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
              Todo checklist
            </label>
            
            {/* THÊM WRAPPER NÀY: Giới hạn chiều cao và bật scroll cho riêng Todo */}
            <div className="max-h-[35vh] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
              <Controller
                name="todos"
                control={control}
                render={({ field }) => (
                  <TodoEditor
                    todos={field.value}
                    onChange={(next, valid) => {
                      field.onChange(next)
                      // Clear the todos error eagerly once user adds content
                      if (valid && errors.todos) {
                        clearErrors('todos')
                      }
                    }}
                    autoFocus={false}
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>

            {errors.todos && (
              <p className="text-xs text-destructive">{errors.todos.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground/70">
              Enter to add · Tab to indent · Shift+Tab to unindent
            </p>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-2 shrink-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Session duration
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDurationMin(d); setIsCustom(false) }}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                    !isCustom && durationMin === d
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-white text-foreground hover:bg-secondary',
                  )}
                >
                  {d} min
                </button>
              ))}

              {/* Custom button */}
              <button
                type="button"
                onClick={() => {
                  setIsCustom(true)
                  // Clear raw so user can type fresh — avoids "25 → 2530"
                  setCustomRaw('')
                }}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  isCustom
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-white text-foreground hover:bg-secondary',
                )}
              >
                Custom
              </button>
            </div>

            {/* Custom input — shown when Custom selected */}
            {isCustom && (
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customRaw}
                    onChange={e => {
                      // Filter to only allow digits (0-9)
                      const onlyNumbers = e.target.value.replace(/[^0-9]/g, '')
                      setCustomRaw(onlyNumbers)
                    }}
                    onBlur={commitCustom}
                    placeholder={String(CUSTOM_MIN)}
                    className={cn(
                      'w-28 text-sm bg-white',
                      customOutOfRange && 'border-amber-400 focus-visible:ring-amber-400',
                    )}
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">
                    minutes
                  </span>
                  {/* Live preview */}
                  {!customOutOfRange && customRaw !== '' && (
                    <span className="text-xs text-muted-foreground/70">
                      = {Math.floor(customMinParsed / 60) > 0
                          ? `${Math.floor(customMinParsed / 60)}h `
                          : ''}
                        {customMinParsed % 60 > 0
                          ? `${customMinParsed % 60}m`
                          : ''}
                    </span>
                  )}
                </div>
                {customOutOfRange && (
                  <p className="text-xs text-amber-600">
                    Must be between {CUSTOM_MIN} and {CUSTOM_MAX} minutes. Will be clamped on start.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border px-6 pb-5 flex-col gap-4 sm:flex-col bg-[#fcfef8] mx-0 mb-0">

          {/* Penalty mode toggle row */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground">Penalty mode</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-56 text-xs">
                  If you give up this task, 1 item in your inventory or garden may disappear permanently, except legendary or above.
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              checked={penaltyMode}
              onCheckedChange={setPenaltyMode}
              disabled={isSubmitting}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="bg-white"
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? 'Creating…' : 'Create & Start'}
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>

        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}