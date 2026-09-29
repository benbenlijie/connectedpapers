import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useReadingStore, READING_STORAGE_KEY } from './useReadingStore'

beforeEach(() => {
  localStorage.clear()
  useReadingStore.setState({ entries: {} })
})

describe('useReadingStore', () => {
  it('sets a status and persists it', () => {
    useReadingStore.getState().setStatus('p1', 'to_read')
    expect(useReadingStore.getState().entries.p1.status).toBe('to_read')
    expect(JSON.parse(localStorage.getItem(READING_STORAGE_KEY)!).p1.status).toBe('to_read')
  })

  it('clears a status with null', () => {
    useReadingStore.getState().setStatus('p1', 'done')
    useReadingStore.getState().setStatus('p1', null)
    expect(useReadingStore.getState().entries).toEqual({})
  })

  it('records progress and marks the paper as reading', () => {
    useReadingStore.getState().setProgress('p1', 30)
    expect(useReadingStore.getState().entries.p1).toMatchObject({ status: 'reading', progress: 30 })
  })

  it('loads persisted entries on first import', async () => {
    localStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ p9: { status: 'done' } }))
    vi.resetModules()
    const fresh = await import('./useReadingStore')
    expect(fresh.useReadingStore.getState().entries.p9.status).toBe('done')
  })
})
