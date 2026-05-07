import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTaskNotes } from '@/pages/tasks/hooks/use-task-notes'
import type { TaskNote } from '@/types/task'

function formatNoteTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

interface NotesBarProps {
  taskId: string
  isReadOnly: boolean
}

export function NotesBar({ taskId, isReadOnly }: NotesBarProps) {
  const { notes, isLoading, createNote, updateNote, deleteNote, isCreating } =
    useTaskNotes(taskId)

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  async function handleAdd() {
    const content = draft.trim()
    if (!content) return
    await createNote({ content })
    setDraft('')
  }

  function startEdit(note: TaskNote) {
    setEditingId(note.id)
    setEditText(note.content)
  }

  async function commitEdit(noteId: string) {
    const content = editText.trim()
    if (content) await updateNote({ noteId, req: { content } })
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleDelete(noteId: string) {
    await deleteNote(noteId)
  }

  return (
    <aside className="lg:sticky lg:top-20 w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-white/60 p-5 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Notes
        </span>

        <div className="mt-4 flex flex-col gap-2">
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
              className="group rounded-lg border border-border bg-white/50 p-3 text-sm"
            >
              {editingId === note.id ? (
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => commitEdit(note.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      commitEdit(note.id)
                    }
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none"
                  rows={3}
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="leading-relaxed text-foreground break-words whitespace-pre-wrap text-xs">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/60">
                      {formatNoteTime(note.created_at)}
                    </span>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEdit(note)}
                          className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                          aria-label="Edit note"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="rounded p-0.5 text-muted-foreground/50 hover:text-destructive transition-colors"
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

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
  )
}