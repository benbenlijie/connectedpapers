import { create } from 'zustand'
import {
  addCollection,
  addSavedSearch,
  addToCollection,
  emptyLibrary,
  parseLibrary,
  removeCollection,
  removeFromCollection,
  removeSavedSearch,
  serializeLibrary,
  toggleFavorite,
  type Library,
} from '../lib/library'

export const LIBRARY_STORAGE_KEY = 'connectedpapers.library.v1'

function load(): Library {
  try {
    return parseLibrary(localStorage.getItem(LIBRARY_STORAGE_KEY))
  } catch {
    return emptyLibrary()
  }
}

function persist(library: Library): void {
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, serializeLibrary(library))
  } catch {
    // storage unavailable — keep the in-memory copy only
  }
}

interface LibraryState {
  library: Library
  toggleFavorite: (paperId: string) => void
  createCollection: (name: string) => string
  deleteCollection: (id: string) => void
  addToCollection: (collectionId: string, paperId: string) => void
  removeFromCollection: (collectionId: string, paperId: string) => void
  saveSearch: (query: string, queryType: string) => void
  removeSavedSearch: (id: string) => void
}

function apply(set: (patch: { library: Library }) => void, get: () => LibraryState, next: Library): void {
  persist(next)
  set({ library: next })
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  library: load(),
  toggleFavorite: (paperId) => apply(set, get, toggleFavorite(get().library, paperId)),
  createCollection: (name) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `col-${Date.now()}`
    apply(set, get, addCollection(get().library, name, id))
    return id
  },
  deleteCollection: (id) => apply(set, get, removeCollection(get().library, id)),
  addToCollection: (collectionId, paperId) =>
    apply(set, get, addToCollection(get().library, collectionId, paperId)),
  removeFromCollection: (collectionId, paperId) =>
    apply(set, get, removeFromCollection(get().library, collectionId, paperId)),
  saveSearch: (query, queryType) => apply(set, get, addSavedSearch(get().library, query, queryType)),
  removeSavedSearch: (id) => apply(set, get, removeSavedSearch(get().library, id)),
}))
