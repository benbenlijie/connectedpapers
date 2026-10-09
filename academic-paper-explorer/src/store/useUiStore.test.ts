import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './useUiStore'
import type { Paper } from '../types/domain'

const paper = (id: string, title = id): Paper => ({ id, title, citation_count: 0, authors: '', source: 'semantic_scholar' })

beforeEach(() => {
  useUiStore.setState({
    selectedPaper: null, graphDepth: null, graphMaxNodes: null,
    comparePaper: null, compareSelectedNodeId: null,
    hiddenEdgeTypes: [],
    graphView: '2d', colorMode: 'cluster', sizeMode: 'citations',
    timelineYear: null, timelinePlaying: false, graphQuery: '',
    connectionOpen: false, connectionFrom: null, connectionTo: null,
    connectionRequest: null, connection: null,
  })
})

describe('useUiStore graph UI state', () => {
  it('defaults to 2D cluster/citations', () => {
    const s = useUiStore.getState()
    expect(s.graphView).toBe('2d')
    expect(s.colorMode).toBe('cluster')
    expect(s.sizeMode).toBe('citations')
  })
  it('updates view and encodings', () => {
    const s = useUiStore.getState()
    s.setGraphView('3d')
    s.setColorMode('year')
    s.setSizeMode('pagerank')
    const next = useUiStore.getState()
    expect(next.graphView).toBe('3d')
    expect(next.colorMode).toBe('year')
    expect(next.sizeMode).toBe('pagerank')
  })
  it('updates timeline and search state', () => {
    const s = useUiStore.getState()
    s.setTimelineYear(2015)
    s.setTimelinePlaying(true)
    s.setGraphQuery('attention')
    const next = useUiStore.getState()
    expect(next.timelineYear).toBe(2015)
    expect(next.timelinePlaying).toBe(true)
    expect(next.graphQuery).toBe('attention')
  })
})

describe('useUiStore network params', () => {
  it('setGraphParams stores explicit depth and maxNodes', () => {
    useUiStore.getState().setGraphParams(2, 150)
    const s = useUiStore.getState()
    expect(s.graphDepth).toBe(2)
    expect(s.graphMaxNodes).toBe(150)
  })

  it('selectRootPaper clears network params so adaptive defaults apply', () => {
    useUiStore.getState().setGraphParams(3, 300)
    useUiStore.getState().selectRootPaper(paper('p1'))
    const s = useUiStore.getState()
    expect(s.selectedPaper?.id).toBe('p1')
    expect(s.graphDepth).toBeNull()
    expect(s.graphMaxNodes).toBeNull()
  })
})

describe('useUiStore comparison state', () => {  it('sets the compare paper and clears its node selection', () => {
    useUiStore.getState().setCompareSelectedNodeId('n1')
    useUiStore.getState().setComparePaper(paper('p2'))
    const s = useUiStore.getState()
    expect(s.comparePaper?.id).toBe('p2')
    expect(s.compareSelectedNodeId).toBeNull()
  })

  it('tracks the compare node selection independently', () => {
    useUiStore.getState().setCompareSelectedNodeId('n2')
    expect(useUiStore.getState().compareSelectedNodeId).toBe('n2')
  })
})

describe('useUiStore edge visibility', () => {
  it('toggles an edge type hidden and back', () => {
    useUiStore.getState().toggleEdgeType('coupling')
    expect(useUiStore.getState().hiddenEdgeTypes).toEqual(['coupling'])
    useUiStore.getState().toggleEdgeType('coupling')
    expect(useUiStore.getState().hiddenEdgeTypes).toEqual([])
  })
})

describe('useUiStore connection state', () => {
  const connection = {
    from: { id: 'A' },
    to: { id: 'B' },
    found: true,
    best: null,
  } as unknown as import('../types/domain').PaperConnection

  it('starts closed with no endpoints or answer', () => {
    const s = useUiStore.getState()
    expect(s.connectionOpen).toBe(false)
    expect(s.connectionFrom).toBeNull()
    expect(s.connectionTo).toBeNull()
    expect(s.connectionRequest).toBeNull()
    expect(s.connection).toBeNull()
  })

  it('requests a connection, opening the panel and dropping a stale answer', () => {
    useUiStore.getState().setConnection(connection)
    useUiStore.getState().requestConnection('A', 'B')
    const s = useUiStore.getState()
    expect(s.connectionOpen).toBe(true)
    expect(s.connectionRequest).toEqual({ fromId: 'A', toId: 'B' })
    expect(s.connection).toBeNull()
  })

  it('remembers the chosen endpoints', () => {
    useUiStore.getState().setConnectionFrom(paper('p1'))
    useUiStore.getState().setConnectionTo(paper('p2'))
    expect(useUiStore.getState().connectionFrom?.id).toBe('p1')
    expect(useUiStore.getState().connectionTo?.id).toBe('p2')
  })

  it('fills the empty slot first, so one click is enough to name the pair', () => {
    useUiStore.getState().connectPaper(paper('p1'))
    expect(useUiStore.getState().connectionFrom?.id).toBe('p1')
    expect(useUiStore.getState().connectionTo).toBeNull()

    useUiStore.getState().connectPaper(paper('p2'))
    expect(useUiStore.getState().connectionFrom?.id).toBe('p1')
    expect(useUiStore.getState().connectionTo?.id).toBe('p2')
  })

  it('anchors the pair on the paper being explored', () => {
    useUiStore.getState().selectRootPaper(paper('root', '正在看的论文'))
    useUiStore.getState().connectPaper(paper('other', '邻居'), { run: true })
    const s = useUiStore.getState()
    expect(s.connectionFrom?.id).toBe('root')
    expect(s.connectionTo?.id).toBe('other')
    expect(s.connectionRequest).toEqual({ fromId: 'root', toId: 'other' })
  })

  it('keeps an explicitly chosen starting point over the root paper', () => {
    useUiStore.getState().selectRootPaper(paper('root', '正在看的论文'))
    useUiStore.getState().setConnectionFrom(paper('picked', '手动选的起点'))
    useUiStore.getState().connectPaper(paper('other', '邻居'))
    const s = useUiStore.getState()
    expect(s.connectionFrom?.id).toBe('picked')
    expect(s.connectionTo?.id).toBe('other')
  })

  it('replaces the destination once both slots are full', () => {
    useUiStore.getState().connectPaper(paper('p1'))
    useUiStore.getState().connectPaper(paper('p2'))
    useUiStore.getState().connectPaper(paper('p3'))
    const s = useUiStore.getState()
    expect(s.connectionFrom?.id).toBe('p1')
    expect(s.connectionTo?.id).toBe('p3')
  })

  it('takes a paper back out when its slot button is pressed again', () => {
    useUiStore.getState().connectPaper(paper('p1'))
    useUiStore.getState().connectPaper(paper('p1'))
    const s = useUiStore.getState()
    expect(s.connectionFrom).toBeNull()
    expect(s.connectionTo).toBeNull()
  })

  it('only searches a complete pair, so a lone paper never burns a crawl', () => {
    useUiStore.getState().connectPaper(paper('p1'), { run: true })
    expect(useUiStore.getState().connectionRequest).toBeNull()
    expect(useUiStore.getState().connectionOpen).toBe(true)

    useUiStore.getState().connectPaper(paper('p2'), { run: true })
    expect(useUiStore.getState().connectionRequest).toEqual({ fromId: 'p1', toId: 'p2' })
  })

  it('pairs two papers explicitly and drops any previous answer', () => {
    useUiStore.getState().connectPair(paper('p1'), paper('p2'))
    expect(useUiStore.getState().connectionRequest).toBeNull()

    useUiStore.getState().setConnection(connection)
    useUiStore.getState().connectPair(paper('p1'), paper('p2'), { run: true })
    const s = useUiStore.getState()
    expect(s.connectionOpen).toBe(true)
    expect(s.connectionRequest).toEqual({ fromId: 'p1', toId: 'p2' })
    expect(s.connection).toBeNull()
  })

  it('refuses to pair a paper with itself', () => {
    useUiStore.getState().connectPair(paper('p1'), paper('p1'), { run: true })
    expect(useUiStore.getState().connectionRequest).toBeNull()
  })

  it('ignores a paper with no usable identity', () => {
    useUiStore.getState().connectPaper({ id: '', title: '', citation_count: 0, authors: '', source: 'semantic_scholar' })
    expect(useUiStore.getState().connectionFrom).toBeNull()
  })

  it('clears the request and the answer but keeps the panel open', () => {
    useUiStore.getState().requestConnection('A', 'B')
    useUiStore.getState().setConnection(connection)
    useUiStore.getState().clearConnection()
    const s = useUiStore.getState()
    expect(s.connectionRequest).toBeNull()
    expect(s.connection).toBeNull()
    expect(s.connectionOpen).toBe(true)
  })
})
