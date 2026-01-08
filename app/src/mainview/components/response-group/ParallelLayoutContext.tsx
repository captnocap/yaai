import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type LayoutMode = 'stacked' | 'columns' | 'grid'

interface ParallelLayoutState {
  layoutMode: LayoutMode
  gridColumns: number
  /** Whether parallel responses are currently being displayed */
  hasParallelResponses: boolean
}

interface ParallelLayoutActions {
  setLayoutMode: (mode: LayoutMode) => void
  setGridColumns: (columns: number) => void
  setHasParallelResponses: (has: boolean) => void
}

interface ParallelLayoutContextValue extends ParallelLayoutState, ParallelLayoutActions {}

const ParallelLayoutContext = createContext<ParallelLayoutContextValue | null>(null)

export function ParallelLayoutProvider({ children }: { children: ReactNode }) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('columns')
  const [gridColumns, setGridColumns] = useState(3)
  const [hasParallelResponses, setHasParallelResponses] = useState(false)

  const value: ParallelLayoutContextValue = {
    layoutMode,
    gridColumns,
    hasParallelResponses,
    setLayoutMode: useCallback((mode: LayoutMode) => setLayoutMode(mode), []),
    setGridColumns: useCallback((cols: number) => setGridColumns(cols), []),
    setHasParallelResponses: useCallback((has: boolean) => setHasParallelResponses(has), []),
  }

  return (
    <ParallelLayoutContext.Provider value={value}>
      {children}
    </ParallelLayoutContext.Provider>
  )
}

export function useParallelLayout() {
  const ctx = useContext(ParallelLayoutContext)
  if (!ctx) {
    // Return defaults if not in provider (for standalone usage)
    return {
      layoutMode: 'columns' as LayoutMode,
      gridColumns: 3,
      hasParallelResponses: false,
      setLayoutMode: () => {},
      setGridColumns: () => {},
      setHasParallelResponses: () => {},
    }
  }
  return ctx
}
