import { create } from 'zustand'
import { Paper, NetworkData, PaperDetails } from '../lib/supabase'

interface AppState {
  // 搜索状态
  searchQuery: string
  searchType: 'keyword' | 'doi' | 'arxiv' | 's2_id'
  isSearching: boolean
  searchResults: Paper[]
  
  // 网络状态
  selectedPaper: Paper | null
  networkData: NetworkData | null
  isLoadingNetwork: boolean
  
  // 详情面板状态
  paperDetails: PaperDetails | null
  isLoadingDetails: boolean
  
  // UI状态
  selectedNodeId: string | null
  highlightedNodes: string[]
  
  // 过滤器状态
  filters: {
    yearRange: [number, number]
    minCitations: number
    selectedFields: string[]
    selectedVenues: string[]
  }
  
  // Actions
  setSearchQuery: (query: string) => void
  setSearchType: (type: 'keyword' | 'doi' | 'arxiv' | 's2_id') => void
  setIsSearching: (loading: boolean) => void
  setSearchResults: (results: Paper[]) => void
  
  setSelectedPaper: (paper: Paper | null) => void
  setNetworkData: (data: NetworkData | null) => void
  setIsLoadingNetwork: (loading: boolean) => void
  
  setPaperDetails: (details: PaperDetails | null) => void
  setIsLoadingDetails: (loading: boolean) => void
  
  setSelectedNodeId: (nodeId: string | null) => void
  setHighlightedNodes: (nodeIds: string[]) => void
  
  updateFilters: (filters: Partial<AppState['filters']>) => void
  resetFilters: () => void
}

const defaultFilters = {
  yearRange: [1990, new Date().getFullYear()] as [number, number],
  minCitations: 0,
  selectedFields: [] as string[],
  selectedVenues: [] as string[]
}

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  searchQuery: '',
  searchType: 'keyword',
  isSearching: false,
  searchResults: [],
  
  selectedPaper: null,
  networkData: null,
  isLoadingNetwork: false,
  
  paperDetails: null,
  isLoadingDetails: false,
  
  selectedNodeId: null,
  highlightedNodes: [],
  
  filters: defaultFilters,
  
  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchType: (type) => set({ searchType: type }),
  setIsSearching: (loading) => set({ isSearching: loading }),
  setSearchResults: (results) => set({ searchResults: results }),
  
  setSelectedPaper: (paper) => set({ selectedPaper: paper }),
  setNetworkData: (data) => set({ networkData: data }),
  setIsLoadingNetwork: (loading) => set({ isLoadingNetwork: loading }),
  
  setPaperDetails: (details) => set({ paperDetails: details }),
  setIsLoadingDetails: (loading) => set({ isLoadingDetails: loading }),
  
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setHighlightedNodes: (nodeIds) => set({ highlightedNodes: nodeIds }),
  
  updateFilters: (newFilters) => 
    set((state) => ({ 
      filters: { ...state.filters, ...newFilters } 
    })),
  resetFilters: () => set({ filters: defaultFilters })
}))