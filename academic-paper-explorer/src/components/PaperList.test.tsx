import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const h = vi.hoisted(() => ({
  papers: [
    { id: 'p1', title: 'Paper One', citation_count: 0, authors: 'A', source: 'semantic_scholar' },
    { id: 'p2', title: 'Paper Two', citation_count: 0, authors: 'B', source: 'semantic_scholar' },
    // OpenAlex result: the local `id` is the OpenAlex URL, the canonical key is the DOI.
    {
      id: 'https://openalex.org/W9',
      openalex_id: 'https://openalex.org/W9',
      doi: '10.1000/ABC',
      title: 'Paper Three',
      citation_count: 0,
      authors: 'C',
      source: 'openalex',
    },
  ],
}))

vi.mock('../hooks/useSearchPapers', () => ({
  useSearchPapers: () => ({
    data: { papers: h.papers, total_count: h.papers.length },
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

import PaperList from './PaperList'
import { useUiStore } from '../store/useUiStore'
import { useReadingStore } from '../store/useReadingStore'
import { useLibraryStore } from '../store/useLibraryStore'

beforeEach(() => {
  localStorage.clear()
  useReadingStore.setState({ entries: {} })
  useLibraryStore.setState({ library: { favorites: [], collections: [], savedSearches: [] } })
  useUiStore.setState({
    selectedPaper: null,
    comparePaper: null,
    compareSelectedNodeId: null,
    submittedQuery: null,
    filters: { yearRange: [1990, new Date().getFullYear()], minCitations: 0, selectedFields: [], selectedVenues: [] },
  })
})

describe('PaperList', () => {
  it('sets and clears the compare paper', () => {
    render(<PaperList />)
    const button = screen.getAllByRole('button', { name: '对比' })[0]

    fireEvent.click(button)
    expect(useUiStore.getState().comparePaper?.id).toBe('p1')

    fireEvent.click(button)
    expect(useUiStore.getState().comparePaper).toBeNull()
  })

  it('records the reading status for a paper', () => {
    render(<PaperList />)
    fireEvent.change(screen.getAllByLabelText('阅读状态')[0], { target: { value: 'reading' } })
    expect(useReadingStore.getState().entries.p1.status).toBe('reading')
  })

  it('filters to the reading list', () => {
    useReadingStore.setState({ entries: { p1: { status: 'to_read' } } })
    render(<PaperList />)
    expect(screen.getByText('Paper Two')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('仅看阅读清单'))
    expect(screen.getByText('Paper One')).toBeInTheDocument()
    expect(screen.queryByText('Paper Two')).not.toBeInTheDocument()
  })

  it('toggles favorites and filters to them', () => {
    render(<PaperList />)
    fireEvent.click(screen.getAllByRole('button', { name: '收藏' })[0])
    expect(useLibraryStore.getState().library.favorites).toEqual(['p1'])
    fireEvent.click(screen.getByLabelText('仅看收藏'))
    expect(screen.getByText('Paper One')).toBeInTheDocument()
    expect(screen.queryByText('Paper Two')).not.toBeInTheDocument()
  })

  // The details panel stores the normalised DOI for OpenAlex papers, so the list
  // has to look for that same key — otherwise collections look broken.
  it('matches favorites stored under the canonical DOI key', () => {
    useLibraryStore.setState({
      library: { favorites: ['10.1000/abc'], collections: [], savedSearches: [] },
    })
    render(<PaperList />)

    expect(screen.getByRole('button', { name: '取消收藏' })).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('仅看收藏'))
    expect(screen.getByText('Paper Three')).toBeInTheDocument()
    expect(screen.queryByText('Paper One')).not.toBeInTheDocument()
  })

  it('shows a paper inside a collection that was filled from the details panel', () => {
    useLibraryStore.setState({
      library: {
        favorites: [],
        collections: [{ id: 'c1', name: 'Reading', paperIds: ['10.1000/abc'] }],
        savedSearches: [],
      },
    })
    render(<PaperList />)

    fireEvent.change(screen.getByLabelText('集合筛选'), { target: { value: 'c1' } })

    expect(screen.getByText('Paper Three')).toBeInTheDocument()
    expect(screen.queryByText('Paper One')).not.toBeInTheDocument()
  })
})
