// =============================================================================
// USE MEMORY SEARCH
// =============================================================================
// Debounced memory search hook for live retrieval as user types.

import { useState, useEffect, useRef } from 'react';
import { useMemory } from '../../../hooks';
import type { MemoryResult } from '../../../types/memory';

export interface UseMemorySearchOptions {
  /** Minimum query length to trigger search */
  minQueryLength?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Maximum results to return */
  topK?: number;
}

export interface UseMemorySearchReturn {
  results: MemoryResult[];
  isSearching: boolean;
  error: string | null;
}

export function useMemorySearch(
  query: string,
  chatId: string | null,
  options: UseMemorySearchOptions = {}
): UseMemorySearchReturn {
  const {
    minQueryLength = 3,
    debounceMs = 300,
    topK = 5,
  } = options;

  const [results, setResults] = useState<MemoryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { retrieve } = useMemory();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset abort flag
    abortRef.current = false;

    // Don't search if query too short or no chatId
    if (query.length < minQueryLength || !chatId) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounced search
    timeoutRef.current = setTimeout(async () => {
      try {
        const memories = await retrieve({
          query,
          chatId,
          topK,
          temporalBias: 'balanced',
        });

        // Check if we were aborted while waiting
        if (!abortRef.current) {
          setResults(memories);
          setError(null);
        }
      } catch (err) {
        if (!abortRef.current) {
          setError((err as Error).message);
          setResults([]);
        }
      } finally {
        if (!abortRef.current) {
          setIsSearching(false);
        }
      }
    }, debounceMs);

    // Cleanup
    return () => {
      abortRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, chatId, minQueryLength, debounceMs, topK, retrieve]);

  return { results, isSearching, error };
}
