import { useState, useCallback } from 'react';

/**
 * useSearch hook - Debounced Elasticsearch queries
 */
export function useSearch() {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');

  const search = useCallback(async (q: string) => {
    // Debounced search logic
  }, []);

  return {
    results,
    query,
    setQuery,
    search,
  };
}
