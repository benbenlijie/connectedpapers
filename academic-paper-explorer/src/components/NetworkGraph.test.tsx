import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-force-graph-2d', () => ({
  default: (props: any) => (
    <div data-testid="fg2d">
      <button data-testid="node-a-click" onClick={() => props.onNodeClick({ id: 'a', title: 'A' })}>
        click
      </button>
      <button data-testid="node-a-hover" onClick={() => props.onNodeHover({ id: 'a', title: 'A' })}>
        hover
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
}))

import NetworkGraph from './NetworkGraph'
import { useUiStore } from '../store/useUiStore'

beforeEach(() => {
  mockState = { data: NETWORK, isLoading: false, error: null }
  useUiStore.setState({
    selectedPaper: null,
    selectedNodeId: null,
    graphQuery: '',
    graphView: '2d',
    timelineYear: null,
    timelinePlaying: false,
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
})
