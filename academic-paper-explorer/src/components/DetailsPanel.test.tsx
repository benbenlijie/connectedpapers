import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DetailsPanel from './DetailsPanel'
import { useUiStore } from '../store/useUiStore'
import { useNotesStore } from '../store/useNotesStore'
import { useLibraryStore } from '../store/useLibraryStore'

const renderPanel = () => render(<MemoryRouter><DetailsPanel /></MemoryRouter>)

vi.mock('../hooks/usePaperDetails', () => ({
  usePaperDetails: () => ({ data: undefined, isLoading: false, error: null }),
}))

vi.mock('../hooks/usePaperNetwork', () => ({
  resolveClientId: (p: { id?: string } | null) => p?.id ?? null,
}))

beforeEach(() => {
  localStorage.clear()
  useNotesStore.setState({ notes: {} })
  useLibraryStore.setState({ library: { favorites: [], collections: [], savedSearches: [] } })
  useUiStore.setState({
    selectedPaper: { id: 'p1', title: 'T', citation_count: 0, authors: '', source: 'semantic_scholar' },
    selectedNodeId: null,
    compareSelectedNodeId: null,
  })
})

describe('DetailsPanel notes', () => {
  it('shows the existing note and persists edits', () => {
    useNotesStore.setState({ notes: { p1: 'my thought' } })
    renderPanel()

    const box = screen.getByPlaceholderText('记录想法…') as HTMLTextAreaElement
    expect(box.value).toBe('my thought')

    fireEvent.change(box, { target: { value: 'updated' } })

    expect(useNotesStore.getState().notes.p1).toBe('updated')
    expect(screen.getByText('已保存')).toBeInTheDocument()
  })

  it('hides the saved hint when the note is cleared', () => {
    useNotesStore.setState({ notes: { p1: 'my thought' } })
    renderPanel()
    fireEvent.change(screen.getByPlaceholderText('记录想法…'), { target: { value: '' } })
    expect(useNotesStore.getState().notes.p1).toBeUndefined()
    expect(screen.queryByText('已保存')).not.toBeInTheDocument()
  })

  it('prefers the most recently clicked (compare) node', () => {
    useNotesStore.setState({ notes: { a: 'note-a', b: 'note-b' } })
    useUiStore.setState({ selectedNodeId: 'a', compareSelectedNodeId: 'b' })
    renderPanel()
    expect((screen.getByPlaceholderText('记录想法…') as HTMLTextAreaElement).value).toBe('note-b')
  })

  it('links to the in-app reader when the paper has an arXiv id', () => {
    useUiStore.setState({
      selectedPaper: {
        id: 'p1', title: 'T', citation_count: 0, authors: '', source: 'semantic_scholar', arxiv_id: '2401.00001',
      },
    })
    renderPanel()
    expect(screen.getByRole('link', { name: /在应用内阅读/ })).toHaveAttribute(
      'href',
      '/read/2401.00001?pid=p1',
    )
  })

  it('toggles favorite for the current paper', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /收藏/ }))
    expect(useLibraryStore.getState().library.favorites).toEqual(['p1'])
  })
})
