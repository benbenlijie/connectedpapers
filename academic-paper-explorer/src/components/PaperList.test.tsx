import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../hooks/useSearchPapers', () => ({
  useSearchPapers: () => ({
    data: {
      papers: [
        { id: 'p1', title: 'Paper One', citation_count: 0, authors: 'A', source: 'semantic_scholar' },
      ],
      total_count: 1,
    },
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

import PaperList from './PaperList'
import { useUiStore } from '../store/useUiStore'

beforeEach(() => {
  useUiStore.setState({
    selectedPaper: null,
    comparePaper: null,
    compareSelectedNodeId: null,
    submittedQuery: null,
    filters: { yearRange: [1990, new Date().getFullYear()], minCitations: 0, selectedFields: [], selectedVenues: [] },
  })
})

describe('PaperList compare button', () => {
  it('sets and clears the compare paper', () => {
    render(<PaperList />)
    const button = screen.getByRole('button', { name: '对比' })

    fireEvent.click(button)
    expect(useUiStore.getState().comparePaper?.id).toBe('p1')

    fireEvent.click(button)
    expect(useUiStore.getState().comparePaper).toBeNull()
  })
})
