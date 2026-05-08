"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { clampInput, clampPaste } from "@/pages/tasks/utils/text-constraints"  // ← added

const MAX_LENGTH = 255

// Dynamic heading scale based on text length
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
}

export function EditableTitle({ value, isReadOnly, onCommit }: EditableTitleProps) {
  const [editing, setEditing] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const committedValueRef = useRef(value)

  useEffect(() => {
    committedValueRef.current = value
  }, [value])

  // ─── auto-grow ────────────────────────────────────────────────────────────
  const autoGrow = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }, [])

  // ─── enter editing mode ───────────────────────────────────────────────────
  const startEditing = useCallback(() => {
    setEditing(true)
  }, [])

  useEffect(() => {
    if (!editing || !textareaRef.current) return
    const el = textareaRef.current
    el.value = committedValueRef.current
    autoGrow(el)
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [editing, autoGrow])

  // ─── commit ───────────────────────────────────────────────────────────────
  const commit = useCallback(async () => {
    const el = textareaRef.current
    if (!el) return

    const trimmed = el.value.trim()
    const prev = committedValueRef.current

    if (!trimmed || trimmed === prev) {
      el.value = prev
      setEditing(false)
      return
    }

    try {
      await onCommit?.(trimmed)
      committedValueRef.current = trimmed
      setEditing(false)
    } catch (err) {
      console.error(err)
      el.value = prev
      setEditing(false)
    }
  }, [onCommit])

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
        setEditing(false)
      }
    },
    [commit],
  )

  // ─── render ───────────────────────────────────────────────────────────────
  const sizeClass = getTitleSizeClass(value.length)

  if (isReadOnly) {
    return (
      <h1
        className={cn(
          "min-w-0 break-words font-bold leading-snug text-foreground",
          sizeClass,
        )}
      >
        {value}
      </h1>
    )
  }

  return editing ? (
    <textarea
      ref={textareaRef}
      rows={1}
      maxLength={MAX_LENGTH}
      onInput={(e) => clampInput(e, MAX_LENGTH, autoGrow)}   // ← replaced handleInput
      onPaste={(e) => clampPaste(e, MAX_LENGTH)}             // ← replaced handlePaste
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent font-bold leading-snug",
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
        )}
      >
        {value}
      </h1>
      <Pencil className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}