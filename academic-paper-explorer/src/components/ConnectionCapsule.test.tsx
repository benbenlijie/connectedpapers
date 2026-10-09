import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectionCapsule from './ConnectionCapsule'
import { useUiStore } from '../store/useUiStore'
import type { Paper, PaperConnection } from '../types/domain'

const networkMock = vi.hoisted(() => ({ byId: {} as Record<string, { nodes: unknown[] }> }))
vi.mock('../hooks/usePaperNetwork', () => ({
  usePaperNetwork: (p: { id?: string } | null) => ({ data: p?.id ? networkMock.byId[p.id] : undefined }),
}))

const paper = (id: string, title = id): Paper => ({
  id,
  title,
  citation_count: 0,
  authors: '',
  source: 'semantic_scholar',
})

beforeEach(() => {
  networkMock.byId = {}
  useUiStore.setState({
    selectedPaper: null,
    comparePaper: null,
    connectionOpen: false,
    connectionFrom: null,
    connectionTo: null,
    connectionRequest: null,
    connection: null,
  })
})

describe('ConnectionCapsule', () => {
  it('invites the user in when no pair has been chosen yet', () => {
    render(<ConnectionCapsule />)
    expect(screen.getByRole('button', { name: /关联路径/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('names both papers so the pair is readable without opening the panel', () => {
    useUiStore.setState({ connectionFrom: paper('A', '论文甲'), connectionTo: paper('B', '论文乙') })
    render(<ConnectionCapsule />)
    expect(screen.getByText('论文甲')).toBeInTheDocument()
    expect(screen.getByText('论文乙')).toBeInTheDocument()
  })

  it('falls back to the graph title for a paper only known by id', () => {
    networkMock.byId = { A: { nodes: [{ id: 'A', title: '图上的标题', label: '', citationCount: 0, authors: '', isRoot: true, pageRankScore: 0, clusterId: 0, size: 8, color: '#fff' }] } }
    useUiStore.setState({ selectedPaper: paper('A', ''), connectionFrom: paper('A', ''), connectionTo: paper('B', '论文乙') })
    render(<ConnectionCapsule />)
    expect(screen.getByText('图上的标题')).toBeInTheDocument()
  })

  it('names a shared-link pair from the answer, which carries both titles', () => {
    // ?from/?to links carry no root paper, so the cached network cannot label
    // them — the connect answer can.
    networkMock.byId = {}
    useUiStore.setState({
      connectionFrom: paper('A', ''),
      connectionTo: paper('B', ''),
      connectionRequest: { fromId: 'A', toId: 'B' },
      connection: {
        from: { id: 'A', title: '起点论文' },
        to: { id: 'B', title: '终点论文' },
        best: { hopCount: 2 },
      } as unknown as PaperConnection,
    })
    render(<ConnectionCapsule />)
    expect(screen.getByText('起点论文')).toBeInTheDocument()
    expect(screen.getByText('终点论文')).toBeInTheDocument()
  })

  it('seeds the pair from the current and compare papers on first open', () => {
    useUiStore.setState({ selectedPaper: paper('A', '论文甲'), comparePaper: paper('B', '论文乙') })
    render(<ConnectionCapsule />)
    fireEvent.click(screen.getByRole('button', { name: /关联路径/ }))
    const s = useUiStore.getState()
    expect(s.connectionOpen).toBe(true)
    expect(s.connectionFrom?.id).toBe('A')
    expect(s.connectionTo?.id).toBe('B')
    // Opening the panel is not the same as asking for an answer.
    expect(s.connectionRequest).toBeNull()
  })

  it('opens with one paper when that is all the user has picked', () => {
    useUiStore.setState({ selectedPaper: paper('A', '论文甲') })
    render(<ConnectionCapsule />)
    fireEvent.click(screen.getByRole('button', { name: /关联路径/ }))
    const s = useUiStore.getState()
    expect(s.connectionFrom?.id).toBe('A')
    expect(s.connectionTo).toBeNull()
    expect(s.connectionRequest).toBeNull()
  })

  it('toggles only, never re-seeding, once a pair exists', () => {
    useUiStore.setState({ connectionFrom: paper('A', '论文甲'), connectionTo: paper('B', '论文乙'), selectedPaper: paper('C', '论文丙'), comparePaper: paper('D', '论文丁') })
    render(<ConnectionCapsule />)
    fireEvent.click(screen.getByRole('button', { name: /论文甲/ }))
    const s = useUiStore.getState()
    expect(s.connectionOpen).toBe(true)
    expect(s.connectionFrom?.id).toBe('A')
    expect(s.connectionTo?.id).toBe('B')
  })

  it('reports a live search in progress', () => {
    useUiStore.setState({
      connectionFrom: paper('A', '论文甲'),
      connectionTo: paper('B', '论文乙'),
      connectionRequest: { fromId: 'A', toId: 'B' },
    })
    render(<ConnectionCapsule />)
    expect(screen.getByText('检索中')).toBeInTheDocument()
  })

  it('reports the hop count of the answer', () => {
    useUiStore.setState({
      connectionFrom: paper('A', '论文甲'),
      connectionTo: paper('B', '论文乙'),
      connectionRequest: { fromId: 'A', toId: 'B' },
      connection: { best: { hopCount: 3 } } as unknown as PaperConnection,
    })
    render(<ConnectionCapsule />)
    expect(screen.getByText('3 跳')).toBeInTheDocument()
  })

  it('reports a miss rather than staying silent', () => {
    useUiStore.setState({
      connectionFrom: paper('A', '论文甲'),
      connectionTo: paper('B', '论文乙'),
      connectionRequest: { fromId: 'A', toId: 'B' },
      connection: { best: null } as unknown as PaperConnection,
    })
    render(<ConnectionCapsule />)
    expect(screen.getByText('未找到')).toBeInTheDocument()
  })
})
