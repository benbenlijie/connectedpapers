import { create } from 'zustand'
import {
  parseHighlights,
  serializeHighlights,
  withHighlight,
  removeHighlight,
  type Highlight,
  type HighlightMap,
} from '../lib/highlights'

export const HIGHLIGHTS_STORAGE_KEY = 'connectedpapers.highlights.v1'

function load(): HighlightMap {
  try {
    return parseHighlights(localStorage.getItem(HIGHLIGHTS_STORAGE_KEY))
  } catch {
    return {}
  }
}

function persist(highlights: HighlightMap): void {
  try {
    localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, serializeHighlights(highlights))
  } catch {
    // storage unavailable — keep the in-memory copy only
  }
}

interface HighlightsState {
  highlights: HighlightMap
  addHighlight: (key: string, hl: Highlight) => void
  deleteHighlight: (key: string, id: string) => void
}

export const useHighlightsStore = create<HighlightsState>((set, get) => ({
  highlights: load(),
  addHighlight: (key, hl) => {
    const highlights = withHighlight(get().highlights, key, hl)
    persist(highlights)
    set({ highlights })
  },
  deleteHighlight: (key, id) => {
    const highlights = removeHighlight(get().highlights, key, id)
    persist(highlights)
    set({ highlights })
  },
}))
