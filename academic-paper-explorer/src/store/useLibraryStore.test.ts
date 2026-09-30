import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLibraryStore, LIBRARY_STORAGE_KEY } from './useLibraryStore'
import { emptyLibrary } from '../lib/library'

beforeEach(() => {
  localStorage.clear()
  useLibraryStore.setState({ library: emptyLibrary() })
})

describe('useLibraryStore', () => {
  it('toggles favorites and persists', () => {
    useLibraryStore.getState().toggleFavorite('p1')
    expect(useLibraryStore.getState().library.favorites).toEqual(['p1'])
    expect(JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY)!).favorites).toEqual(['p1'])
    useLibraryStore.getState().toggleFavorite('p1')
    expect(useLibraryStore.getState().library.favorites).toEqual([])
  })

  it('creates a collection, adds and removes a paper', () => {
    const id = useLibraryStore.getState().createCollection('Reading')
    expect(useLibraryStore.getState().library.collections[0].name).toBe('Reading')
    useLibraryStore.getState().addToCollection(id, 'p1')
    expect(useLibraryStore.getState().library.collections[0].paperIds).toEqual(['p1'])
    useLibraryStore.getState().removeFromCollection(id, 'p1')
    expect(useLibraryStore.getState().library.collections[0].paperIds).toEqual([])
    useLibraryStore.getState().deleteCollection(id)
    expect(useLibraryStore.getState().library.collections).toEqual([])
  })

  it('saves and removes searches', () => {
    useLibraryStore.getState().saveSearch('attention', 'keyword')
    expect(useLibraryStore.getState().library.savedSearches).toHaveLength(1)
    const id = useLibraryStore.getState().library.savedSearches[0].id
    useLibraryStore.getState().removeSavedSearch(id)
    expect(useLibraryStore.getState().library.savedSearches).toEqual([])
  })

  it('loads a persisted library on first import', async () => {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify({ favorites: ['p9'], collections: [], savedSearches: [] }))
    vi.resetModules()
    const fresh = await import('./useLibraryStore')
    expect(fresh.useLibraryStore.getState().library.favorites).toEqual(['p9'])
  })
})
