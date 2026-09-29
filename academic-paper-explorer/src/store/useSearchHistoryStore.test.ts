import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSearchHistoryStore, SEARCH_HISTORY_STORAGE_KEY } from './useSearchHistoryStore'

beforeEach(() => {
  localStorage.clear()
  useSearchHistoryStore.setState({ entries: [] })
})

describe('useSearchHistoryStore', () => {
  it('records a query at the front and persists it', () => {
    useSearchHistoryStore.getState().record('attention')
    useSearchHistoryStore.getState().record('transformer')
    expect(useSearchHistoryStore.getState().entries).toEqual(['transformer', 'attention'])
    expect(JSON.parse(localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)!)).toEqual(['transformer', 'attention'])
  })

  it('removes a single entry', () => {
    useSearchHistoryStore.setState({ entries: ['a', 'b'] })
    useSearchHistoryStore.getState().remove('a')
    expect(useSearchHistoryStore.getState().entries).toEqual(['b'])
  })

  it('clears all entries', () => {
    useSearchHistoryStore.setState({ entries: ['a', 'b'] })
    useSearchHistoryStore.getState().clear()
    expect(useSearchHistoryStore.getState().entries).toEqual([])
  })

  it('loads persisted history on first import', async () => {
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(['saved']))
    vi.resetModules()
    const fresh = await import('./useSearchHistoryStore')
    expect(fresh.useSearchHistoryStore.getState().entries).toEqual(['saved'])
  })
})
