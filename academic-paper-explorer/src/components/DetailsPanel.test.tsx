import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DetailsPanel from './DetailsPanel'
import { useUiStore } from '../store/useUiStore'
import { useNotesStore } from '../store/useNotesStore'

vi.mock('../hooks/usePaperDetails', () => ({
  usePaperDetails: () => ({ data: undefined, isLoading: false, error: null }),
}))

vi.mock('../hooks/usePaperNetwork', () => ({
  resolveClientId: (p: { id?: string } | null) => p?.id ?? null,
}))

beforeEach(() => {
  localStorage.clear()
  useNotesStore.setState({ notes: {} })
  useUiStore.setState({
    selectedPaper: { id: 'p1', title: 'T', citation_count: 0, authors: '', source: 'semantic_scholar' },
    selectedNodeId: null,
    compareSelectedNodeId: null,
  })
})

describe('DetailsPanel notes', () => {
  it('shows the existing note and persists edits', () => {
    useNotesStore.setState({ notes: { p1: 'my thought' } })
    render(<DetailsPanel />)

    const box = screen.getByPlaceholderText('记录想法…') as HTMLTextAreaElement
    expect(box.value).toBe('my thought')

    fireEvent.change(box, { target: { value: 'updated' } })

    expect(useNotesStore.getState().notes.p1).toBe('updated')
    expect(screen.getByText('已保存')).toBeInTheDocument()
  })

  it('hides the saved hint when the note is cleared', () => {
    useNotesStore.setState({ notes: { p1: 'my thought' } })
    render(<DetailsPanel />)
    fireEvent.change(screen.getByPlaceholderText('记录想法…'), { target: { value: '' } })
    expect(useNotesStore.getState().notes.p1).toBeUndefined()
    expect(screen.queryByText('已保存')).not.toBeInTheDocument()
  })

  it('prefers the most recently clicked (compare) node', () => {
    useNotesStore.setState({ notes: { a: 'note-a', b: 'note-b' } })
    useUiStore.setState({ selectedNodeId: 'a', compareSelectedNodeId: 'b' })
    render(<DetailsPanel />)
    expect((screen.getByPlaceholderText('记录想法…') as HTMLTextAreaElement).value).toBe('note-b')
  })
})
