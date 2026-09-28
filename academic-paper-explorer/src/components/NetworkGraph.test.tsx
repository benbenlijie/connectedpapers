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

vi.mock('../hooks/usePaperNetwork', () => ({
  usePaperNetwork: () => ({
    data: {
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
    },
    isLoading: false,
    error: null,
  }),
}))

import NetworkGraph from './NetworkGraph'
import { useUiStore } from '../store/useUiStore'

beforeEach(() => {
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
})
