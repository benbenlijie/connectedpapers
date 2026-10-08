import { describe, it, expect } from 'vitest'
import { defaultUrlState, serializeUrlState, parseUrlState, paperStubFromId } from './urlState'

describe('urlState', () => {
  it('serializes the default state to an empty query string', () => {
    expect(serializeUrlState(defaultUrlState())).toBe('')
  })

  it('round-trips a fully populated state', () => {
    const state = {
      ...defaultUrlState(),
      paperId: 'DOI:10.1/xyz',
      depth: 3,
      maxNodes: 250,
      selectedNodeId: 's2:abc',
      graphView: '3d' as const,
      colorMode: 'year' as const,
      sizeMode: 'pagerank' as const,
      timelineYear: 2018,
      yearRange: [2000, 2020] as [number, number],
      minCitations: 42,
      selectedFields: ['Physics', 'Biology'],
      selectedVenues: ['Nature'],
      comparePaperId: 'ABC',
      compareSelectedNodeId: 's2:b',
    }
    const parsed = parseUrlState(serializeUrlState(state))
    expect(parsed).toEqual(state)
  })

  it('omits compare params when unset', () => {
    const params = new URLSearchParams(serializeUrlState({ ...defaultUrlState(), paperId: 'A' }))
    expect(params.has('paper2')).toBe(false)
    expect(params.has('node2')).toBe(false)
  })

  it('parses compare params', () => {
    const parsed = parseUrlState('paper=A&paper2=B&node2=n2')
    expect(parsed.comparePaperId).toBe('B')
    expect(parsed.compareSelectedNodeId).toBe('n2')
  })

  it('round-trips expanded node ids for both panes', () => {
    const state = {
      ...defaultUrlState(),
      paperId: 'A',
      comparePaperId: 'B',
      expandedNodeIds: ['n1', 'n2'],
      compareExpandedNodeIds: ['m1'],
    }
    const parsed = parseUrlState(serializeUrlState(state))
    expect(parsed.expandedNodeIds).toEqual(['n1', 'n2'])
    expect(parsed.compareExpandedNodeIds).toEqual(['m1'])
  })

  it('omits expanded ids when there is no root paper', () => {
    const params = new URLSearchParams(
      serializeUrlState({ ...defaultUrlState(), expandedNodeIds: ['n1'] }),
    )
    expect(params.has('e')).toBe(false)
  })

  it('omits default-valued fields', () => {
    const state = { ...defaultUrlState(), paperId: 'ABC123' }
    const params = new URLSearchParams(serializeUrlState(state))
    expect(params.get('paper')).toBe('ABC123')
    expect(params.has('view')).toBe(false)
    expect(params.has('color')).toBe(false)
    expect(params.has('cit')).toBe(false)
    expect(params.has('y0')).toBe(false)
  })

  it('clamps depth and maxNodes into the allowed range', () => {
    const parsed = parseUrlState('paper=X&d=99&mn=0')
    expect(parsed.depth).toBe(3)
    expect(parsed.maxNodes).toBe(1)
  })

  it('falls back to defaults on invalid numeric input', () => {
    const parsed = parseUrlState('paper=X&d=abc&mn=&y0=nope&y1=bad&cit=-5&tl=zero')
    const d = defaultUrlState()
    expect(parsed.depth).toBeNull()
    expect(parsed.maxNodes).toBeNull()
    expect(parsed.yearRange).toEqual(d.yearRange)
    expect(parsed.minCitations).toBe(0)
    expect(parsed.timelineYear).toBeNull()
  })

  it('parses repeated field and venue params', () => {
    const parsed = parseUrlState('paper=X&f=Physics&f=Biology&v=Nature&v=Cell')
    expect(parsed.selectedFields).toEqual(['Physics', 'Biology'])
    expect(parsed.selectedVenues).toEqual(['Nature', 'Cell'])
  })

  it('rejects unknown encoding modes', () => {
    const parsed = parseUrlState('paper=X&color=bogus&size=bogus&view=4d')
    expect(parsed.colorMode).toBe('cluster')
    expect(parsed.sizeMode).toBe('citations')
    expect(parsed.graphView).toBe('2d')
  })

  it('accepts a leading question mark', () => {
    expect(parseUrlState('?paper=Y').paperId).toBe('Y')
  })

  it('builds a minimal paper stub whose id round-trips through resolveClientId', () => {
    const stub = paperStubFromId('DOI:10.1/xyz')
    expect(stub.id).toBe('DOI:10.1/xyz')
    expect(stub.citation_count).toBe(0)
    expect(stub.source).toBe('semantic_scholar')
  })
})
