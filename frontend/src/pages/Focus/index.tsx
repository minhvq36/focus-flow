import React from 'react';
import FocusTimer from './FocusTimer';
import TodoList from './TodoList';
import NotesArea from './NotesArea';

/**
 * Focus page - Main focus session page with timer and notes
 */
export default function Focus() {
  return (
    <div className="focus-page">
      <FocusTimer />
      <TodoList />
      <NotesArea />
    </div>
  );
}
