import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TaskNote } from '@/types/task'
import { createTextConstraintHandlers } from "@/pages/tasks/utils/text-constraints"
import { NOTE_MAX_CHARS } from "./note-constants"

const noteConstraints = createTextConstraintHandlers<HTMLTextAreaElement>(NOTE_MAX_CHARS)

interface NoteEditDialogProps {
  note: TaskNote | null
  open: boolean
  onClose: () => void
  onSave: (noteId: string, content: string) => Promise<void>
  isSaving?: boolean
  isReadOnly?: boolean
}

export function NoteEditDialog({
  note,
  open,
  onClose,
  onSave,
  isSaving = false,
  isReadOnly = false,
}: NoteEditDialogProps) {
  const [text, setText] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync text when note changes
  useEffect(() => {
    if (note) setText(note.content)
  }, [note])

  const isDirty = note ? text.trim() !== note.content.trim() : false
  const isOverLimit = text.length > NOTE_MAX_CHARS
  const canSave = isDirty && !isOverLimit && text.trim().length > 0

  function handleClose() {
    if (isDirty) {
      setShowConfirm(true)
    } else {
      onClose()
    }
  }

  function handleConfirmDiscard() {
    setShowConfirm(false)
    onClose()
  }

  function handleCancelDiscard() {
    setShowConfirm(false)
    // Re-focus textarea after dismissing confirm
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  async function handleSave() {
    if (!note || !canSave) return
    await onSave(note.id, text.trim())
    onClose()
  }

  // Intercept Dialog's own Escape handling so we can show confirm instead
  function handleOpenChange(open: boolean) {
    if (!open) handleClose()
  }

  // Read-only mode: simplified view
  if (isReadOnly) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold pt-3">Note</DialogTitle>
          </DialogHeader>
          <div className="px-1.5">
            <div className="h-72 overflow-y-auto rounded-lg border border-border bg-white/70 px-3 py-2.5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
                 style={{ overflowWrap: 'anywhere' }}>
                {note?.content}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open && !showConfirm} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold pt-3">Edit note</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-1.5 px-1.5">
            <textarea
              ref={textareaRef}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className={cn(
                'w-full resize-none rounded-lg border bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/50',
                isOverLimit
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary/50'
              )}
              placeholder="Write your note…"
              {...noteConstraints}
            />
            <div className="flex items-center justify-end">
              <span
                className={cn(
                  'text-[11px] tabular-nums transition-colors',
                  isOverLimit
                    ? 'text-destructive font-medium'
                    : text.length > NOTE_MAX_CHARS * 0.9
                      ? 'text-amber-500'
                      : 'text-muted-foreground/50'
                )}
              >
                {text.length.toLocaleString()}/{NOTE_MAX_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              className="hover:opacity-80"
              size="sm"
              onClick={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm discard */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">
              Discard changes?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              You have unsaved changes. If you leave now, they will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="text-xs"
              onClick={handleCancelDiscard}
            >
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="text-xs hover:opacity-90"
              onClick={handleConfirmDiscard}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}