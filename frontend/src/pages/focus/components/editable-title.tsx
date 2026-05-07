"use client"

import { useState, useEffect, useRef } from "react"
import { Pencil } from "lucide-react"

// Tạm thời isReadOnly=false thì hiện inline edit UI nhưng chưa call API
// Sẽ thêm PATCH /api/tasks/:id/title sau

interface EditableTitleProps {
  value: string
  isReadOnly: boolean
}

export function EditableTitle({ value, isReadOnly }: EditableTitleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit() {
    // No API call yet — title edit coming later
    setEditing(false)
  }

  if (isReadOnly) {
    return (
      <h1 className="text-balance text-2xl font-bold leading-snug text-foreground">
        {value}
      </h1>
    )
  }

  return editing ? (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit()
        if (e.key === "Escape") { setDraft(value); setEditing(false) }
      }}
      className="w-full bg-transparent text-2xl font-bold text-foreground outline-none border-b-2 border-primary/60 pb-0.5"
    />
  ) : (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true) }}
      className="group flex items-start gap-2 text-left"
    >
      <h1 className="text-balance text-2xl font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
        {value}
      </h1>
      <Pencil className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}