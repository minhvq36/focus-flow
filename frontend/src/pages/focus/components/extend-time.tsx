import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

const MIN = 1
const MAX = 30

interface ExtendTimeProps {
  onExtend: (addMinutes: number) => Promise<void>
}

function validate(raw: string): { value: number | null; error: string | null } {
  if (raw === '') return { value: null, error: null }
  const parsed = parseInt(raw, 10)
  if (isNaN(parsed) || parsed === 0) return { value: null, error: 'Enter a number between 1–30' }
  if (parsed < MIN) return { value: null, error: 'Minimum is 1 min' }
  if (parsed > MAX) return { value: null, error: 'Maximum is 30 min' }
  return { value: parsed, error: null }
}

export function ExtendTime({ onExtend }: ExtendTimeProps) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { value, error } = validate(raw)
  const hasInput = raw !== ''

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
    if (value == null) return
    setEditing(false)
    setRaw('')
    await onExtend(value)
  }, [value, onExtend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
  }, [commit])

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className={cn(
          'text-xs text-muted-foreground/50 transition-colors',
          'hover:text-muted-foreground tabular-nums'
        )}
        style={{ fontFamily: "'DM Mono', monospace" }}
      >
        + Extend time
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        'flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1',
        'transition-colors',
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
          placeholder="5"
          onChange={e => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={handleKeyDown}
          onBlur={dismiss}
          className={cn(
            'w-5.5 bg-transparent text-left text-sm outline-none tabular-nums',
            hasInput && error ? 'text-destructive' : 'text-foreground'
          )}
          style={{ fontFamily: "'DM Mono', monospace" }}
        />
        <span className="text-xs text-muted-foreground select-none">min</span>
      </div>

      <p className={cn(
        'text-[11px] text-destructive transition-opacity',
        hasInput && error ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        {error ?? 'placeholder'}
      </p>
    </div>
  )
}