import { describe, it, expect } from 'vitest'
import { graphAdapter } from './graphAdapter'
import type { NetworkEdge, NetworkNode } from '../types/domain'

const node = (id: string, over: Partial<NetworkNode> = {}): NetworkNode => ({
  id, label: id, title: id, citationCount: 0, authors: '', isRoot: false,
  pageRankScore: 0, clusterId: 0, size: 10, color: '#000000', ...over,
})

describe('graphAdapter', () => {
  it('maps every node with color, size and val', () => {
    const out = graphAdapter([node('a'), node('b')], [], { colorMode: 'cluster', sizeMode: 'citations' })
    expect(out.nodes).toHaveLength(2)
    for (const n of out.nodes) {
      expect(typeof n.color).toBe('string')
      expect(n.size).toBeGreaterThan(0)
      expect(n.val).toBe(n.size)
    }
  })

  it('drops edges pointing at unknown nodes', () => {
    const edges: NetworkEdge[] = [{ from: 'a', to: 'ghost', type: 'reference', weight: 1 }]
    const out = graphAdapter([node('a')], edges, { colorMode: 'cluster', sizeMode: 'citations' })
    expect(out.links).toHaveLength(0)
  })

  it('preserves edge type and weight', () => {
    const edges: NetworkEdge[] = [{ from: 'a', to: 'b', type: 'citation', weight: 3 }]
    const out = graphAdapter([node('a'), node('b')], edges, { colorMode: 'cluster', sizeMode: 'citations' })
    expect(out.links[0]).toMatchObject({ source: 'a', target: 'b', type: 'citation', weight: 3 })
  })

  it('does not mutate its input nodes', () => {
    const input = [node('a')]
    const before = JSON.parse(JSON.stringify(input))
    graphAdapter(input, [], { colorMode: 'year', sizeMode: 'pagerank' })
    expect(input).toEqual(before)
  })
})
