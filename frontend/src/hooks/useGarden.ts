import { useState } from 'react';

/**
 * useGarden hook - Grid state and placement logic
 */
export function useGarden() {
  const [grid, setGrid] = useState([]);

  return {
    grid,
    setGrid,
  };
}
