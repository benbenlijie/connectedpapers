import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './useUiStore'

beforeEach(() => {
  useUiStore.setState({
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
