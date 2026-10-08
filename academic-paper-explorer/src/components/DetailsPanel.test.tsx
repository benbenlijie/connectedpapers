import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DetailsPanel from './DetailsPanel'
import { useUiStore } from '../store/useUiStore'
import { useNotesStore } from '../store/useNotesStore'
import { useLibraryStore } from '../store/useLibraryStore'

const renderPanel = () => render(<MemoryRouter><DetailsPanel /></MemoryRouter>)

const lineageMock = vi.hoisted(() => ({ value: undefined as unknown }))
vi.mock('../hooks/usePaperLineage', () => ({
  usePaperLineage: () => ({ data: lineageMock.value, isLoading: false, error: null }),
}))

vi.mock('../hooks/usePaperDetails', () => ({
  usePaperDetails: () => ({ data: undefined, isLoading: false, error: null }),
}))

beforeEach(() => {
  localStorage.clear()
  lineageMock.value = undefined
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

  it('keys the library on the Semantic Scholar id rather than the local id', () => {
    useUiStore.setState({
      selectedPaper: {
        id: 'local-1', semantic_scholar_id: 'S2-1', title: 'T', citation_count: 0, authors: '', source: 'semantic_scholar',
      },
    })
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /收藏/ }))
    expect(useLibraryStore.getState().library.favorites).toEqual(['S2-1'])
  })

  it('confirms the collection a paper was just added to', () => {
    useLibraryStore.setState({
      library: { favorites: [], collections: [{ id: 'c1', name: 'Reading', paperIds: [] }], savedSearches: [] },
    })
    renderPanel()

    fireEvent.change(screen.getByLabelText('加入集合'), { target: { value: 'c1' } })

    expect(useLibraryStore.getState().library.collections[0].paperIds).toEqual(['p1'])
    expect(screen.getByText('已加入「Reading」')).toBeInTheDocument()
  })

  it('says so instead of silently re-adding a paper already in the collection', () => {
    useLibraryStore.setState({
      library: { favorites: [], collections: [{ id: 'c1', name: 'Reading', paperIds: ['p1'] }], savedSearches: [] },
    })
    renderPanel()

    fireEvent.change(screen.getByLabelText('加入集合'), { target: { value: 'c1' } })

    expect(useLibraryStore.getState().library.collections[0].paperIds).toEqual(['p1'])
    expect(screen.getByText('已在「Reading」中')).toBeInTheDocument()
  })

  it('shows the collections holding the paper and removes it on click', () => {
    useLibraryStore.setState({
      library: { favorites: [], collections: [{ id: 'c1', name: 'Reading', paperIds: ['p1'] }], savedSearches: [] },
    })
    renderPanel()

    expect(screen.getByText('已在集合：')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

    expect(useLibraryStore.getState().library.collections[0].paperIds).toEqual([])
    expect(screen.getByText('已移出「Reading」')).toBeInTheDocument()
    expect(screen.queryByText('已在集合：')).not.toBeInTheDocument()
  })

  it('creates a collection from the prompt and joins it', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('新集合')
    renderPanel()

    fireEvent.change(screen.getByLabelText('加入集合'), { target: { value: '__new' } })

    const collections = useLibraryStore.getState().library.collections
    expect(collections).toHaveLength(1)
    expect(collections[0].name).toBe('新集合')
    expect(collections[0].paperIds).toEqual(['p1'])
    expect(screen.getByText('已新建并加入「新集合」')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('reuses an existing collection instead of creating a duplicate name', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Reading')
    useLibraryStore.setState({
      library: { favorites: [], collections: [{ id: 'c1', name: 'Reading', paperIds: [] }], savedSearches: [] },
    })
    renderPanel()

    fireEvent.change(screen.getByLabelText('加入集合'), { target: { value: '__new' } })

    const collections = useLibraryStore.getState().library.collections
    expect(collections).toHaveLength(1)
    expect(collections[0].paperIds).toEqual(['p1'])
    expect(screen.getByText('已加入已有的集合「Reading」')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('lists prior/follow-up works and selects one on click', () => {
    lineageMock.value = {
      root_id: 'p1',
      prior: [{ paperId: 'r1', title: 'Prior work', year: 2018 }],
      followUps: [{ paperId: 'c1', title: 'Follow work', year: 2024, isInfluential: true }],
    }
    renderPanel()
    expect(screen.getByText('前置工作（参考）')).toBeInTheDocument()
    expect(screen.getByText('后续工作（引用）')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Follow work'))
    expect(useUiStore.getState().selectedNodeId).toBe('c1')
  })
})
