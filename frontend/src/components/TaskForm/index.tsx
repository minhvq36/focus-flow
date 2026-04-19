import React from 'react';
import TodoBuilder from './TodoBuilder';

/**
 * TaskForm component - Form for creating/editing tasks
 */
export default function TaskForm() {
  return (
    <div className="task-form">
      <h2>Create Task</h2>
      <form>
        <input type="text" placeholder="Task title" />
        <TodoBuilder />
        <button type="submit">Create</button>
      </form>
    </div>
  );
}
