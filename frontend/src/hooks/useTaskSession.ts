import { useState } from 'react';

/**
 * useTaskSession hook - Timer state machine for focus sessions
 */
export function useTaskSession() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  return {
    isRunning,
    setIsRunning,
    timeLeft,
    setTimeLeft,
  };
}
