"use client"

import { useState, useEffect, useRef } from "react"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

// Dynamic heading scale based on text length
function getTitleSizeClass(text: string) {
  const len = text.length

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
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleSizeClass = getTitleSizeClass(value)

  // Auto-grow textarea
  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current
      autoGrow(el)
      // Move cursor to end
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  async function commit() {
    const trimmed = draft.trim()

    if (!trimmed) {
      setDraft(value)
      setEditing(false)
      return
    }

    if (trimmed === value) {
      setEditing(false)
      return
    }

    try {
      await onCommit?.(trimmed)
      setEditing(false)
    } catch (err) {
      console.error(err)
      setDraft(value)
    }
  }

  if (isReadOnly) {
    return (
      <h1 className={cn(
        "min-w-0 break-words font-bold leading-snug text-foreground",
        titleSizeClass
      )}>
        {value}
      </h1>
    )
  }

  return editing ? (
    <textarea
      ref={textareaRef}
      value={draft}
      rows={1}
      onChange={(e) => {
        setDraft(e.target.value)
        autoGrow(e.target)
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          commit()
        }
        if (e.key === "Escape") {
          setDraft(value)
          setEditing(false)
        }
      }}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent font-bold leading-snug text-foreground outline-none border-b-2 border-primary/60 pb-0.5 break-words",
        getTitleSizeClass(draft)
      )}
    />
  ) : (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true) }}
      className="group flex w-full min-w-0 items-start gap-2 text-left"
    >
      <h1 className={cn(
        "min-w-0 flex-1 break-words font-bold leading-snug text-foreground transition-colors group-hover:text-primary",
        titleSizeClass
      )}>
        {value}
      </h1>
      <Pencil className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}