import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHighlightsStore, HIGHLIGHTS_STORAGE_KEY } from './useHighlightsStore'
import type { Highlight } from '../lib/highlights'

const hl: Highlight = { id: 'h1', blockIndex: 0, start: 0, end: 5, text: 'Hello', color: 'yellow' }

beforeEach(() => {
  localStorage.clear()
  useHighlightsStore.setState({ highlights: {} })
})

describe('useHighlightsStore', () => {
  it('adds a highlight and persists it', () => {
    useHighlightsStore.getState().addHighlight('p1', hl)
    expect(useHighlightsStore.getState().highlights.p1).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem(HIGHLIGHTS_STORAGE_KEY)!).p1).toHaveLength(1)
  })

  it('removes a highlight', () => {
    useHighlightsStore.getState().addHighlight('p1', hl)
    useHighlightsStore.getState().deleteHighlight('p1', 'h1')
    expect(useHighlightsStore.getState().highlights.p1).toEqual([])
  })

  it('loads persisted highlights on first import', async () => {
    localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify({ p9: [hl] }))
    vi.resetModules()
    const fresh = await import('./useHighlightsStore')
    expect(fresh.useHighlightsStore.getState().highlights.p9).toHaveLength(1)
  })
})
