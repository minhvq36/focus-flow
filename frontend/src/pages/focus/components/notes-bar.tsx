import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTaskNotes } from '@/pages/tasks/hooks/use-task-notes'
import { NoteEditDialog } from './note-edit-dialog'
import type { TaskNote } from '@/types/task'
import { createTextConstraintHandlers } from "@/pages/tasks/utils/text-constraints"
import { NOTE_MAX_CHARS } from "./note-constants"

const draftConstraints = createTextConstraintHandlers<HTMLTextAreaElement>(NOTE_MAX_CHARS)

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

interface NotesBarProps {
  taskId: string
  isReadOnly: boolean
}

export function NotesBar({ taskId, isReadOnly }: NotesBarProps) {
  const { notes, isLoading, createNote, updateNote, deleteNote, isCreating } =
    useTaskNotes(taskId)

  const [draft, setDraft] = useState('')
  const [editingNote, setEditingNote] = useState<TaskNote | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleAdd() {
    const content = draft.trim()
    if (!content) return
    await createNote({ content })
    setDraft('')
  }

  async function handleSave(noteId: string, content: string) {
    setIsSaving(true)
    try {
      await updateNote({ noteId, req: { content } })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, noteId: string) {
    // Prevent click bubbling to the card (which opens the modal)
    e.stopPropagation()
    await deleteNote(noteId)
  }

  function handleCardClick(note: TaskNote) {
    if (isReadOnly) return
    setEditingNote(note)
  }

  return (
    <>
      <aside className="lg:sticky lg:top-20 w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-white/60 p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Notes
          </span>

          {/* Notes list with max height */}
          <div className="mt-4 flex flex-col gap-2 max-h-72 overflow-y-auto pr-0.5">
            {isLoading && (
              <p className="text-xs italic text-muted-foreground/60">Loading…</p>
            )}

            {!isLoading && notes.length === 0 && (
              <p className="text-xs italic text-muted-foreground/60">
                {isReadOnly
                  ? 'No notes were added.'
                  : 'Add notes to keep context while you focus.'}
              </p>
            )}

            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleCardClick(note)}
                className={cn(
                  'group rounded-lg border border-border bg-white/50 p-3 text-sm',
                  !isReadOnly && 'cursor-default hover:border-primary/30 hover:bg-white/80 transition-colors'
                )}
              >
                <div className="flex flex-col gap-1.5">
                  {/* Truncated content — full content shown in modal */}
                  <p className="leading-relaxed text-foreground break-words text-xs line-clamp-2">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/60">
                      {formatRelativeTime(note.created_at)}
                    </span>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, note.id)}
                          className="rounded p-0.5 text-muted-foreground/50 hover:text-destructive transition-colors"
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Inline create */}
          {!isReadOnly && (
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
                placeholder="Add a note… (Enter to save)"
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-white/70 px-3 py-2 text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors"
                {...draftConstraints}
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!draft.trim() || isCreating}
                className={cn(
                  'flex items-center gap-1.5 self-end text-xs transition-colors',
                  draft.trim() && !isCreating
                    ? 'text-muted-foreground hover:text-primary'
                    : 'text-muted-foreground/40 cursor-not-allowed'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                {isCreating ? 'Saving…' : 'Save note'}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Edit modal — rendered outside aside to avoid stacking context issues */}
      <NoteEditDialog
        note={editingNote}
        open={editingNote !== null}
        onClose={() => setEditingNote(null)}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  )
}