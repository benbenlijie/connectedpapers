import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './useUiStore'
import type { Paper } from '../types/domain'

const paper = (id: string): Paper => ({ id, title: id, citation_count: 0, authors: '', source: 'semantic_scholar' })

beforeEach(() => {
  useUiStore.setState({
    selectedPaper: null, graphDepth: null, graphMaxNodes: null,
    comparePaper: null, compareSelectedNodeId: null,
    graphView: '2d', colorMode: 'cluster', sizeMode: 'citations',
    timelineYear: null, timelinePlaying: false, graphQuery: '',
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

describe('useUiStore comparison state', () => {
  it('sets the compare paper and clears its node selection', () => {
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
