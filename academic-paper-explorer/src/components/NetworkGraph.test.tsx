import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../services/api', () => ({ api: { networkWithPolling: vi.fn() } }))

vi.mock('react-force-graph-2d', () => ({
  default: (props: any) => (
    <div data-testid="fg2d">
      <button data-testid="node-a-click" onClick={() => props.onNodeClick({ id: 'a', title: 'A' })}>
        click
      </button>
      <button data-testid="node-a-hover" onClick={() => props.onNodeHover({ id: 'a', title: 'A' })}>
        hover
      </button>
      <button
        data-testid="node-a-rightclick"
        onClick={() =>
          props.onNodeRightClick(
            { id: 'a', title: 'A', url: 'https://example.test/a' },
            { clientX: 12, clientY: 34, preventDefault() {} },
          )
        }
      >
        rightclick
      </button>
      <button data-testid="background" onClick={() => props.onBackgroundClick()}>
        bg
      </button>
    </div>
  ),
}))

const NETWORK = {
  nodes: [
    {
      id: 'a', label: 'A', title: 'A', citationCount: 1, authors: '', isRoot: true,
      pageRankScore: 0.5, clusterId: 0, size: 20, color: '#ffffff', year: 2000,
    },
    {
      id: 'b', label: 'B', title: 'B', citationCount: 1, authors: '', isRoot: false,
      pageRankScore: 0.2, clusterId: 1, size: 20, color: '#ffffff', year: 2010,
    },
  ],
  edges: [{ from: 'a', to: 'b', type: 'reference', weight: 1 }],
}

let mockState: { data: typeof NETWORK | null; isLoading: boolean; error: Error | null } = {
  data: NETWORK,
  isLoading: false,
  error: null,
}

vi.mock('../hooks/usePaperNetwork', () => ({
  usePaperNetwork: () => mockState,
  networkCacheKeyForPaper: (paper: { id?: string } | null) => (paper?.id ? `key:${paper.id}` : null),
}))

import NetworkGraph from './NetworkGraph'
import { useUiStore } from '../store/useUiStore'
import { api } from '../services/api'

beforeEach(() => {
  mockState = { data: NETWORK, isLoading: false, error: null }
  ;(api.networkWithPolling as ReturnType<typeof vi.fn>).mockReset()
  useUiStore.setState({
    selectedPaper: null,
    selectedNodeId: null,
    graphQuery: '',
    graphView: '2d',
    timelineYear: null,
    timelinePlaying: false,
    submittedQuery: null,
    comparePaper: null,
    compareSelectedNodeId: null,
  })
})

describe('NetworkGraph', () => {
  it('renders the graph after data arrives following a loading state', () => {
    mockState = { data: null, isLoading: true, error: null }
    const { rerender } = render(<NetworkGraph />)
    expect(screen.queryByTestId('fg2d')).not.toBeInTheDocument()
    mockState = { data: NETWORK, isLoading: false, error: null }
    rerender(<NetworkGraph />)
    expect(screen.getByTestId('fg2d')).toBeInTheDocument()
  })

  it('keeps the timeline range stable when filtering by year', () => {
    render(<NetworkGraph />)
    const before = screen.getByRole('slider')
    const max = before.getAttribute('max')
    const min = before.getAttribute('min')
    expect(max).toBe('2010')
    fireEvent.change(before, { target: { value: '2005' } })
    const after = screen.getByRole('slider')
    expect(after.getAttribute('max')).toBe(max)
    expect(after.getAttribute('min')).toBe(min)
    expect((after as HTMLInputElement).value).toBe('2005')
  })

  it('selects the root node when the graph first loads', () => {
    useUiStore.setState({
      selectedPaper: { id: 'root', title: 'Root', citation_count: 0, authors: '', source: 'semantic_scholar' },
    })
    render(<NetworkGraph />)
    expect(useUiStore.getState().selectedNodeId).toBe('a')
  })

  it('selects a node on a single click', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-click'))
    expect(useUiStore.getState().selectedNodeId).toBe('a')
  })

  it('rebuilds the network on a double click', () => {
    render(<NetworkGraph />)
    const node = screen.getByTestId('node-a-click')
    fireEvent.click(node)
    fireEvent.click(node)
    expect(useUiStore.getState().selectedPaper?.id).toBe('a')
  })

  it('clears selection when the background is clicked', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-click'))
    fireEvent.click(screen.getByTestId('background'))
    expect(useUiStore.getState().selectedNodeId).toBeNull()
  })

  it('selects into the compare slot and clears the primary selection', () => {
    useUiStore.setState({ selectedNodeId: 'b' })
    render(
      <NetworkGraph
        paper={{ id: 'root', title: 'Root', citation_count: 0, authors: '', source: 'semantic_scholar' }}
        slot="compare"
      />,
    )
    fireEvent.click(screen.getByTestId('node-a-click'))
    expect(useUiStore.getState().compareSelectedNodeId).toBe('a')
    expect(useUiStore.getState().selectedNodeId).toBeNull()
  })

  it('opens a node context menu and re-roots the graph', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: '以此为根重建网络' }))
    expect(useUiStore.getState().selectedPaper?.id).toBe('a')
  })

  it('searches by the node title from the context menu', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    fireEvent.click(screen.getByRole('menuitem', { name: '按标题搜索' }))
    expect(useUiStore.getState().submittedQuery).toEqual({ query: 'A', query_type: 'keyword' })
  })

  it('expands a node and merges its neighbors into the graph', async () => {
    ;(api.networkWithPolling as ReturnType<typeof vi.fn>).mockResolvedValue({
      nodes: [
        { id: 'z', label: 'Z', title: 'Z', citationCount: 0, authors: '', isRoot: false, pageRankScore: 0, clusterId: 0, size: 1, color: '#fff', year: 2005 },
      ],
      edges: [{ from: 'a', to: 'z', type: 'reference', weight: 1 }],
    })
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    fireEvent.click(screen.getByRole('menuitem', { name: '展开该节点' }))
    await waitFor(() => expect(screen.getByText(/3 节点/)).toBeInTheDocument())
  })
})
