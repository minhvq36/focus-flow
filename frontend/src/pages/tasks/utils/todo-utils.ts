import type { TodoItem } from '@/types/task'

export const MAX_TODOS = 50
export const MAX_DEPTH = 4

export interface FlatItem {
  id: string
  text: string
  depth: number
  done: boolean
}

export function nestedToFlat(todos: TodoItem[], depth = 0): FlatItem[] {
  const result: FlatItem[] = []
  for (const t of todos) {
    result.push({ id: t.id, text: t.text, depth, done: t.done })
    if (t.children?.length) {
      result.push(...nestedToFlat(t.children, depth + 1))
    }
  }
  return result
}

export function flatToNested(flat: FlatItem[]): TodoItem[] {
  const root: TodoItem[] = []
  const stack: { item: TodoItem; depth: number }[] = []

  for (const f of flat) {
    const item: TodoItem = { id: f.id, text: f.text, done: f.done }

    if (f.depth === 0 || stack.length === 0) {
      root.push(item)
      stack.length = 0
      stack.push({ item, depth: 0 })
    } else {
      while (stack.length > 1 && stack[stack.length - 1].depth >= f.depth) {
        stack.pop()
      }
      const parent = stack[stack.length - 1].item
      if (!parent.children) parent.children = []
      parent.children.push(item)
      stack.push({ item, depth: f.depth })
    }
  }

  return root
}

// ─── Sanitize ─────────────────────────────────────────────────────────────────

function findFirstNonEmptyDescendant(flat: FlatItem[], startIdx: number): string | null {
  const parentDepth = flat[startIdx].depth
  for (let i = startIdx + 1; i < flat.length; i++) {
    if (flat[i].depth <= parentDepth) break // out of subtree
    if (flat[i].text.trim()) return flat[i].text
  }
  return null
}

function isSubtreeEmpty(flat: FlatItem[], startIdx: number): boolean {
  const parentDepth = flat[startIdx].depth
  if (flat[startIdx].text.trim()) return false
  for (let i = startIdx + 1; i < flat.length; i++) {
    if (flat[i].depth <= parentDepth) break
    if (flat[i].text.trim()) return false
  }
  return true
}

export function sanitizeFlat(flat: FlatItem[]): FlatItem[] {
  let result = [...flat]

  // Rule 2 — Fill empty parents from first non-empty descendant (bottom-up pass)
  // Iterate from end to start so we fill bottom nodes first
  for (let i = result.length - 1; i >= 0; i--) {
    if (!result[i].text.trim()) {
      const label = findFirstNonEmptyDescendant(result, i)
      if (label) {
        result[i] = { ...result[i], text: label }
      }
    }
  }

  // Rule 3 — Delete fully empty subtrees (bottom-up)
  // Build list of indices to remove
  const toRemove = new Set<number>()
  for (let i = result.length - 1; i >= 0; i--) {
    if (toRemove.has(i)) continue
    if (isSubtreeEmpty(result, i)) {
      // Mark this node and all its descendants for removal
      const parentDepth = result[i].depth
      toRemove.add(i)
      for (let j = i + 1; j < result.length; j++) {
        if (result[j].depth <= parentDepth) break
        toRemove.add(j)
      }
    }
  }
  result = result.filter((_, i) => !toRemove.has(i))

  // Rule 1 — Trim trailing empty items (no children with text)
  while (result.length > 0) {
    const last = result[result.length - 1]
    if (!last.text.trim()) {
      result.pop()
    } else {
      break
    }
  }

  // Guard — always keep at least 1 item
  if (result.length === 0) {
    result = [{ id: crypto.randomUUID(), text: '', depth: 0, done: false }]
  }

  return result
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateFlat(flat: FlatItem[]): { valid: boolean; error?: string } {
  const withText = flat.filter(t => t.text.trim())
  if (withText.length === 0) return { valid: false, error: 'Add at least one todo item.' }
  if (flat.length > MAX_TODOS) return { valid: false, error: `Maximum ${MAX_TODOS} todos allowed.` }
  return { valid: true }
}