import { create } from 'zustand'
import { addToHistory, parseHistory, removeFromHistory, serializeHistory } from '../lib/searchHistory'

export const SEARCH_HISTORY_STORAGE_KEY = 'citeduo.searchHistory.v1'

function load(): string[] {
  try {
    return parseHistory(localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY))
  } catch {
    return []
  }
}

function persist(entries: string[]): void {
  try {
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, serializeHistory(entries))
  } catch {
    // storage unavailable — keep the in-memory copy only
  }
}

interface SearchHistoryState {
  entries: string[]
  record: (query: string) => void
  remove: (query: string) => void
  clear: () => void
}

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  entries: load(),
  record: (query) => {
    const entries = addToHistory(get().entries, query)
    persist(entries)
    set({ entries })
  },
  remove: (query) => {
    const entries = removeFromHistory(get().entries, query)
    persist(entries)
    set({ entries })
  },
  clear: () => {
    persist([])
    set({ entries: [] })
  },
}))
