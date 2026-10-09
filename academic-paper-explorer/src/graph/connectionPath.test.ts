import { describe, it, expect } from 'vitest'
import { connectionHighlight, ensurePathVisible } from './connectionPath'
import type { ConnectionPath, NetworkEdge, NetworkNode } from '../types/domain'

const node = (id: string): NetworkNode => ({
  id,
  label: id,
  title: id,
  citationCount: 0,
  authors: '',
  isRoot: false,
  pageRankScore: 0,
  clusterId: 0,
  size: 6,
  color: '#fff',
})

const edge = (from: string, to: string, type: NetworkEdge['type'] = 'reference'): NetworkEdge => ({
  from,
  to,
  type,
  weight: 1,
})

const path = (over: Partial<ConnectionPath> = {}): ConnectionPath => ({
  kind: 'coupling',
  nodeIds: ['A', 'X', 'B'],
  nodes: [node('A'), node('X'), node('B')],
  edges: [edge('A', 'X'), edge('B', 'X')],
  hops: [],
  hopCount: 2,
  score: 30,
  summary: '共同引用',
  ...over,
})

describe('connectionHighlight', () => {
  it('returns empty sets without a path', () => {
    const empty = connectionHighlight(null)
    expect(empty.nodeIds.size).toBe(0)
    expect(empty.linkKeys.size).toBe(0)
  })

  it('keys links by the stored from->to direction', () => {
    const highlight = connectionHighlight(path())
    expect([...highlight.nodeIds].sort()).toEqual(['A', 'B', 'X'])
    expect(highlight.linkKeys.has('A->X')).toBe(true)
    expect(highlight.linkKeys.has('B->X')).toBe(true)
  })
})

describe('ensurePathVisible', () => {
  it('is a no-op without a path', () => {
    const nodes = [node('A')]
    const edges = [edge('A', 'B')]
    expect(ensurePathVisible(nodes, edges, null)).toEqual({ nodes, edges })
  })

  it('adds the path nodes and edges that filtering removed', () => {
    const kept = { nodes: [node('A')], edges: [edge('A', 'Z')] }
    const result = ensurePathVisible(kept.nodes, kept.edges, path())
    expect(result.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'X'])
    expect(result.edges.map((e) => `${e.from}->${e.to}`).sort()).toEqual(['A->X', 'A->Z', 'B->X'])
  })

  it('does not duplicate nodes or edges already present', () => {
    const nodes = [node('A'), node('X'), node('B')]
    const edges = [edge('A', 'X'), edge('B', 'X')]
    const result = ensurePathVisible(nodes, edges, path())
    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toHaveLength(2)
  })

  it('leaves an unrelated graph untouched', () => {
    const nodes = [node('P'), node('Q')]
    const edges = [edge('P', 'Q', 'semantic')]
    const result = ensurePathVisible(nodes, edges, path())
    expect(result.nodes.map((n) => n.id)).toEqual(['P', 'Q', 'A', 'X', 'B'])
    expect(result.edges.some((e) => e.type === 'semantic')).toBe(true)
  })
})
