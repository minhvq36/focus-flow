import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { cn } from '@/lib/utils'

const INPUT_MAX = 120
const TASK_MAX = 999

interface ExtendTimeProps {
  registeredDurationMin: number
  disabled?: boolean
  onExtend: (addMinutes: number) => Promise<void>
}

function validate(raw: string, registeredDurationMin: number, t: TFunction<'focus'>): {
  value: number | null
  error: string | null
  hint: string | null
} {
  if (raw === '') return { value: null, error: null, hint: null }

  const parsed = parseInt(raw, 10)
  if (isNaN(parsed) || parsed === 0) return { value: null, error: t('extend_time.error_invalid'), hint: null }
  if (parsed < 1) return { value: null, error: t('extend_time.error_min'), hint: null }
  if (parsed > INPUT_MAX) return { value: null, error: t('extend_time.error_max'), hint: null }

  const remaining = TASK_MAX - registeredDurationMin
  const clamped = Math.min(parsed, INPUT_MAX, remaining)
  const hint = clamped < parsed
    ? t('extend_time.hint_clamped', { clamped, max: TASK_MAX })
    : null

  return { value: clamped, error: null, hint }
}

export function ExtendTime({ registeredDurationMin, disabled, onExtend }: ExtendTimeProps) {
  const { t } = useTranslation('focus')
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const [showMaxed, setShowMaxed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isMaxed = registeredDurationMin >= TASK_MAX
  const { value, error, hint } = validate(raw, registeredDurationMin, t)
  const hasInput = raw !== ''
  const canCommit = value != null && value > 0

  // Chỉ hiện cảnh báo "đã kịch trần" khi task còn đang kịch trần thật.
  // Derive lúc render thay vì reset showMaxed bằng effect.
  const showMaxedWarning = showMaxed && isMaxed

  const startEditing = useCallback(() => {
    setRaw('')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const dismiss = useCallback(() => {
    setEditing(false)
    setRaw('')
  }, [])

  const commit = useCallback(async () => {
    if (!canCommit) return
    const finalValue = value!
    setEditing(false)
    setRaw('')
    await onExtend(finalValue)
  }, [canCommit, value, onExtend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { e.preventDefault(); dismiss() }
  }, [commit, dismiss])

  // ── Trigger button (covers both normal + maxed states)
  if (!editing) {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={isMaxed ? () => {
            setShowMaxed(true)
            setTimeout(() => setShowMaxed(false), 2000)
          } : startEditing}
          disabled={disabled}
          className={cn(
            'text-xs text-muted-foreground/50 transition-colors tabular-nums',
            disabled ? 'opacity-30 cursor-not-allowed' : 'hover:text-muted-foreground'
          )}
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {t('extend_time.trigger')}
        </button>

        <p className={cn(
          'text-[11px] text-destructive transition-opacity select-none',
          showMaxedWarning ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}>
          {t('extend_time.max_reached', { max: TASK_MAX })}
        </p>
      </div>
    )
  }

  // ── Input
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        'flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 transition-colors',
        hasInput && error
          ? 'border-destructive/50 focus-within:ring-[1px] focus-within:ring-destructive/30'
          : 'border-border/60 focus-within:ring-[1px] focus-within:ring-primary/25'
      )}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={raw}
          placeholder={t('extend_time.placeholder')}
          onChange={e => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={handleKeyDown}
          onBlur={dismiss}
          className={cn(
            'w-8 bg-transparent text-left text-sm outline-none tabular-nums',
            hasInput && error ? 'text-destructive' : 'text-foreground'
          )}
          style={{ fontFamily: "'DM Mono', monospace" }}
        />
        <span className="text-xs text-muted-foreground select-none">{t('extend_time.unit')}</span>

        {canCommit && (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={commit}
            className="text-xs text-primary hover:text-primary/80 transition-colors pl-1"
          >
            {t('extend_time.confirm')}
          </button>
        )}
      </div>

      <p className={cn(
        'text-[11px] transition-opacity',
        hasInput && error
          ? 'text-destructive opacity-100'
          : hasInput && hint
            ? 'text-amber-600 opacity-100'
            : 'opacity-0 pointer-events-none text-destructive'
      )}>
        {(hasInput && (error ?? hint)) || 'placeholder'}
      </p>
    </div>
  )
}