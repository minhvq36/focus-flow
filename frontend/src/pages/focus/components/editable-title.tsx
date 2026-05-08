"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { clampInput, clampPaste } from "@/pages/tasks/utils/text-constraints"

const MAX_LENGTH = 255

function getTitleSizeClass(len: number) {
  if (len > 180) return "text-base"
  if (len > 120) return "text-lg"
  if (len > 80) return "text-xl"
  return "text-2xl"
}

interface EditableTitleProps {
  value: string
  isReadOnly: boolean
  onCommit?: (newTitle: string) => Promise<unknown>
  displayClassName?: string
}

export function EditableTitle({ value, isReadOnly, onCommit, displayClassName }: EditableTitleProps) {
  const [editing, setEditing] = useState(false)
  const [editingLength, setEditingLength] = useState<number | null>(null)
  // null = use prop value (no pending commit). Set immediately on commit,
  // cleared when parent prop catches up or rolled back on error.
  const [optimisticValue, setOptimisticValue] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const committedValueRef = useRef(value)

  // Clear optimistic value once parent prop has caught up
  useEffect(() => {
    committedValueRef.current = value
    if (optimisticValue === value) setOptimisticValue(null)
  }, [value, optimisticValue])

  // ─── auto-grow ────────────────────────────────────────────────────────────
  const autoGrow = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }, [])

  // ─── exit editing ─────────────────────────────────────────────────────────
  const exitEditing = useCallback(() => {
    setEditing(false)
    setEditingLength(null)
  }, [])

  // ─── enter editing mode ───────────────────────────────────────────────────
  const startEditing = useCallback(() => setEditing(true), [])

  useEffect(() => {
    if (!editing || !textareaRef.current) return
    const el = textareaRef.current
    el.value = committedValueRef.current
    autoGrow(el)
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    setEditingLength(el.value.length)
  }, [editing, autoGrow])

  // ─── commit ───────────────────────────────────────────────────────────────
  const commit = useCallback(async () => {
    const el = textareaRef.current
    if (!el) return

    const trimmed = el.value.trim()
    const prev = committedValueRef.current

    if (!trimmed || trimmed === prev) {
      el.value = prev
      exitEditing()
      return
    }

    // Apply optimistically — UI updates before await resolves
    setOptimisticValue(trimmed)
    committedValueRef.current = trimmed
    exitEditing()

    try {
      await onCommit?.(trimmed)
      // Parent prop will arrive with trimmed value → useEffect above clears optimisticValue
    } catch (err) {
      console.error(err)
      // Rollback both the display value and the ref
      setOptimisticValue(null)
      committedValueRef.current = prev
    }
  }, [onCommit, exitEditing])

  // ─── keyboard handler ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        commit()
        return
      }
      if (e.key === "Escape") {
        const el = textareaRef.current
        if (el) el.value = committedValueRef.current
        exitEditing()
      }
    },
    [commit, exitEditing],
  )

  // ─── input handler ────────────────────────────────────────────────────────
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      clampInput(e, MAX_LENGTH, autoGrow)
      setEditingLength(e.currentTarget.value.length)
    },
    [autoGrow],
  )

  // ─── derived display value ────────────────────────────────────────────────
  const displayValue = optimisticValue ?? value
  const sizeClass = getTitleSizeClass(editingLength ?? displayValue.length)

  if (isReadOnly) {
    return (
      <h1 className={cn("min-w-0 break-words font-bold leading-snug text-foreground", sizeClass, displayClassName)}>
        {displayValue}
      </h1>
    )
  }

  return editing ? (
    <textarea
      ref={textareaRef}
      rows={1}
      maxLength={MAX_LENGTH}
      onInput={handleInput}
      onPaste={(e) => clampPaste(e, MAX_LENGTH)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full resize-none overflow-y-auto bg-transparent font-bold leading-snug",
        "max-h-22",
        "text-foreground outline-none border-b-2 border-primary/60 pb-0.5 break-words",
        sizeClass,
      )}
    />
  ) : (
    <button
      type="button"
      onClick={startEditing}
      className="group flex w-full min-w-0 items-start gap-2 text-left"
    >
      <h1
        className={cn(
          "min-w-0 flex-1 break-words font-bold leading-snug text-foreground",
          "transition-colors group-hover:text-primary",
          sizeClass,
          displayClassName,
        )}
      >
        {displayValue}
      </h1>
      <Pencil className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}