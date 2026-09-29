import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useNotesStore, NOTES_STORAGE_KEY } from './useNotesStore'

beforeEach(() => {
  localStorage.clear()
  useNotesStore.setState({ notes: {} })
})

describe('useNotesStore', () => {
  it('stores a note and persists it to localStorage', () => {
    useNotesStore.getState().setNote('p1', 'hello')
    expect(useNotesStore.getState().notes).toEqual({ p1: 'hello' })
    expect(JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)!)).toEqual({ p1: 'hello' })
  })

  it('removes the entry when the note is blank', () => {
    useNotesStore.getState().setNote('p1', 'hello')
    useNotesStore.getState().setNote('p1', '   ')
    expect(useNotesStore.getState().notes).toEqual({})
    expect(JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)!)).toEqual({})
  })

  it('removes a note explicitly', () => {
    useNotesStore.getState().setNote('p1', 'hello')
    useNotesStore.getState().removeNote('p1')
    expect(useNotesStore.getState().notes).toEqual({})
  })

  it('loads persisted notes on first import', async () => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({ p9: 'restored' }))
    vi.resetModules()
    const fresh = await import('./useNotesStore')
    expect(fresh.useNotesStore.getState().notes).toEqual({ p9: 'restored' })
  })
})
