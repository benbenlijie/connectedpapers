import { describe, it, expect } from 'vitest'
import { mergeNetworkData } from './graphMerge'
import type { NetworkData, NetworkEdge, NetworkNode } from '../types/domain'

const node = (id: string): NetworkNode => ({
  id, label: id, title: id, citationCount: 0, authors: '', isRoot: false,
  pageRankScore: 0, clusterId: 0, size: 1, color: '#000000',
})
const edge = (from: string, to: string, type: NetworkEdge['type'], weight = 1): NetworkEdge => ({ from, to, type, weight })

const base: NetworkData = { nodes: [node('a'), node('b')], edges: [edge('a', 'b', 'reference', 1)] }

describe('mergeNetworkData', () => {
  it('unions nodes by id and keeps the base copy', () => {
    const add: NetworkData = { nodes: [node('b'), node('c')], edges: [] }
    const out = mergeNetworkData(base, add)
    expect(out.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('unions edges by from|to|type keeping the max weight', () => {
    const add: NetworkData = {
      nodes: [],
      edges: [edge('a', 'b', 'reference', 5), edge('b', 'c', 'coupling', 2)],
    }
    const out = mergeNetworkData(base, add)
    const refs = out.edges.filter((e) => e.from === 'a' && e.to === 'b' && e.type === 'reference')
    expect(refs).toHaveLength(1)
    expect(refs[0].weight).toBe(5)
    expect(out.edges).toHaveLength(2)
  })

  it('does not mutate its inputs', () => {
    const add: NetworkData = { nodes: [node('c')], edges: [] }
    const before = JSON.parse(JSON.stringify(base))
    mergeNetworkData(base, add)
    expect(base).toEqual(before)
  })
})
