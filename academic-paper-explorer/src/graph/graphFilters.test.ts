import { describe, it, expect } from 'vitest'
import { filterGraph } from './graphFilters'
import type { NetworkEdge, NetworkNode } from '../types/domain'

const node = (id: string, over: Partial<NetworkNode> = {}): NetworkNode => ({
  id, label: id, title: id, citationCount: 0, authors: '', isRoot: false,
  pageRankScore: 0, clusterId: 0, size: 10, color: '#000000', ...over,
})

const base = {
  yearRange: [1990, 2026] as [number, number],
  minCitations: 0,
  selectedFields: [] as string[],
  selectedVenues: [] as string[],
  timelineYear: null as number | null,
}

describe('filterGraph', () => {
  it('keeps everything with default filters', () => {
    const nodes = [node('a', { year: 2000 }), node('b', { year: 2010 })]
    const edges: NetworkEdge[] = [{ from: 'a', to: 'b', type: 'reference', weight: 1 }]
    const out = filterGraph(nodes, edges, base)
    expect(out.nodes).toHaveLength(2)
    expect(out.edges).toHaveLength(1)
  })

  it('applies the timeline as an upper bound', () => {
    const nodes = [node('a', { year: 2000 }), node('b', { year: 2015 })]
    const out = filterGraph(nodes, [], { ...base, timelineYear: 2010 })
    expect(out.nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('applies the year range', () => {
    const nodes = [node('a', { year: 1980 }), node('b', { year: 2010 })]
    const out = filterGraph(nodes, [], base)
    expect(out.nodes.map((n) => n.id)).toEqual(['b'])
  })

  it('drops edges whose endpoints were removed', () => {
    const nodes = [node('a', { year: 2000 })]
    const edges: NetworkEdge[] = [{ from: 'a', to: 'b', type: 'reference', weight: 1 }]
    const out = filterGraph(nodes, edges, base)
    expect(out.edges).toHaveLength(0)
  })

  it('filters by minimum citations', () => {
    const nodes = [node('a', { citationCount: 5 }), node('b', { citationCount: 50 })]
    const out = filterGraph(nodes, [], { ...base, minCitations: 10 })
    expect(out.nodes.map((n) => n.id)).toEqual(['b'])
  })

  it('filters by fields of study', () => {
    const nodes = [node('a', { fieldsOfStudy: ['Physics'] }), node('b', { fieldsOfStudy: ['Biology'] })]
    const out = filterGraph(nodes, [], { ...base, selectedFields: ['Physics'] })
    expect(out.nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('filters by venue', () => {
    const nodes = [node('a', { venue: 'Nature' }), node('b', { venue: 'Cell' })]
    const out = filterGraph(nodes, [], { ...base, selectedVenues: ['Nature'] })
    expect(out.nodes.map((n) => n.id)).toEqual(['a'])
  })
})
