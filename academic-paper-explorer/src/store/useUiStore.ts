import { create } from 'zustand'
import type { Paper } from '../types/domain'
import type { ColorMode, SizeMode } from '../graph/encoding'

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
  graphView: '2d' | '3d'
  colorMode: ColorMode
  sizeMode: SizeMode
  timelineYear: number | null
  timelinePlaying: boolean
  graphQuery: string
  graphDepth: number | null
  graphMaxNodes: number | null
  comparePaper: Paper | null
  compareSelectedNodeId: string | null
  setSelectedPaper: (p: Paper | null) => void
  selectRootPaper: (p: Paper) => void
  setComparePaper: (p: Paper | null) => void
  setCompareSelectedNodeId: (id: string | null) => void
  setSelectedNodeId: (id: string | null) => void
  setHighlightedNodes: (ids: string[]) => void
  submitQuery: (q: { query: string; query_type: string }) => void
  updateFilters: (f: Partial<UiState['filters']>) => void
  resetFilters: () => void
  setGraphView: (v: UiState['graphView']) => void
  setColorMode: (m: ColorMode) => void
  setSizeMode: (m: SizeMode) => void
  setTimelineYear: (y: number | null) => void
  setTimelinePlaying: (playing: boolean) => void
  setGraphQuery: (q: string) => void
  setGraphParams: (depth: number | null, maxNodes: number | null) => void
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
  graphView: '2d',
  colorMode: 'cluster',
  sizeMode: 'citations',
  timelineYear: null,
  timelinePlaying: false,
  graphQuery: '',
  graphDepth: null,
  graphMaxNodes: null,
  comparePaper: null,
  compareSelectedNodeId: null,
  setSelectedPaper: (p) => set({ selectedPaper: p }),
  selectRootPaper: (p) => set({ selectedPaper: p, graphDepth: null, graphMaxNodes: null }),
  setComparePaper: (p) => set({ comparePaper: p, compareSelectedNodeId: null }),
  setCompareSelectedNodeId: (id) => set({ compareSelectedNodeId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHighlightedNodes: (ids) => set({ highlightedNodes: ids }),
  submitQuery: (q) => set({ submittedQuery: q }),
  updateFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: defaultFilters }),
  setGraphView: (v) => set({ graphView: v }),
  setColorMode: (m) => set({ colorMode: m }),
  setSizeMode: (m) => set({ sizeMode: m }),
  setTimelineYear: (y) => set({ timelineYear: y }),
  setTimelinePlaying: (playing) => set({ timelinePlaying: playing }),
  setGraphQuery: (q) => set({ graphQuery: q }),
  setGraphParams: (depth, maxNodes) => set({ graphDepth: depth, graphMaxNodes: maxNodes }),
}))
