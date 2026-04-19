import React from 'react';

/**
 * FocusTimer component - Pomodoro-style focus timer
 */
export default function FocusTimer() {
  return (
    <div className="focus-timer">
      <div className="timer-display">25:00</div>
      <div className="timer-controls">
        <button>Start</button>
        <button>Pause</button>
        <button>Reset</button>
      </div>
    </div>
  );
}
