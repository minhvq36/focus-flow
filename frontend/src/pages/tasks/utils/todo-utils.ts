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