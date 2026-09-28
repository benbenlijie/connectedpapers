import { create } from 'zustand'
import type { Paper } from '../types/domain'

interface UiState {
  selectedPaper: Paper | null
  selectedNodeId: string | null
  highlightedNodes: string[]
  submittedQuery: { query: string; query_type: string } | null
  filters: {
    yearRange: [number, number]
    minCitations: number
    selectedFields: string[]
    selectedVenues: string[]
  }
  setSelectedPaper: (p: Paper | null) => void
  setSelectedNodeId: (id: string | null) => void
  setHighlightedNodes: (ids: string[]) => void
  submitQuery: (q: { query: string; query_type: string }) => void
  updateFilters: (f: Partial<UiState['filters']>) => void
  resetFilters: () => void
}

const defaultFilters = {
  yearRange: [1990, new Date().getFullYear()] as [number, number],
  minCitations: 0,
  selectedFields: [] as string[],
  selectedVenues: [] as string[],
}

export const useUiStore = create<UiState>((set) => ({
  selectedPaper: null,
  selectedNodeId: null,
  highlightedNodes: [],
  submittedQuery: null,
  filters: defaultFilters,
  setSelectedPaper: (p) => set({ selectedPaper: p }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHighlightedNodes: (ids) => set({ highlightedNodes: ids }),
  submitQuery: (q) => set({ submittedQuery: q }),
  updateFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: defaultFilters }),
}))
