import React from 'react';

/**
 * TodoBuilder component - Indent-capable checklist builder
 */
export default function TodoBuilder() {
  return (
    <div className="todo-builder">
      <textarea placeholder="Add subtasks..." />
    </div>
  );
}
