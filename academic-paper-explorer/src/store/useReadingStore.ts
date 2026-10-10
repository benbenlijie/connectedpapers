import { create } from 'zustand'
import {
  parseReading,
  serializeReading,
  withProgress,
  withStatus,
  type ReadingMap,
  type ReadingStatus,
} from '../lib/reading'

export const READING_STORAGE_KEY = 'citeduo.reading.v1'

function load(): ReadingMap {
  try {
    return parseReading(localStorage.getItem(READING_STORAGE_KEY))
  } catch {
    return {}
  }
}

function persist(entries: ReadingMap): void {
  try {
    localStorage.setItem(READING_STORAGE_KEY, serializeReading(entries))
  } catch {
    // storage unavailable — keep the in-memory copy only
  }
}

interface ReadingState {
  entries: ReadingMap
  setStatus: (id: string, status: ReadingStatus | null) => void
  setProgress: (id: string, progress: number) => void
}

export const useReadingStore = create<ReadingState>((set, get) => ({
  entries: load(),
  setStatus: (id, status) => {
    const entries = withStatus(get().entries, id, status)
    persist(entries)
    set({ entries })
  },
  setProgress: (id, progress) => {
    const entries = withProgress(get().entries, id, progress)
    persist(entries)
    set({ entries })
  },
}))
