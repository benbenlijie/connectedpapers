import { describe, it, expect } from 'vitest'
import { computeLayout } from './computeLayout'
import type { NetworkEdge, NetworkNode } from '../types/domain'

const node = (id: string, isRoot = false, size = 20): NetworkNode => ({
  id, label: id, title: id, citationCount: 1, authors: '', isRoot,
  pageRankScore: 0.1, clusterId: 0, size, color: '#1e3a8a',
})

describe('computeLayout', () => {
  it('returns a position for every node', () => {
    const out = computeLayout({ nodes: [node('a', true), node('b')], edges: [], width: 800, height: 600 })
    expect(out).toHaveLength(2)
    for (const n of out) {
      expect(Number.isFinite(n.x)).toBe(true)
      expect(Number.isFinite(n.y)).toBe(true)
      expect(n.size).toBeGreaterThanOrEqual(15)
    }
  })

  it('keeps nodes distinct (force pushes them apart)', () => {
    const out = computeLayout({
      nodes: [node('a', true), node('b'), node('c')],
      edges: [{ from: 'a', to: 'b', type: 'reference', weight: 1 }],
      width: 800, height: 600,
    })
    const positions = out.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`)
    expect(new Set(positions).size).toBe(out.length)
  })

  it('does not mutate its inputs', () => {
    const input = {
      nodes: [node('a', true), node('b'), node('c')],
      edges: [{ from: 'a', to: 'b', type: 'reference', weight: 1 } as NetworkEdge],
      width: 800,
      height: 600,
    }
    const before = JSON.parse(JSON.stringify(input))
    computeLayout(input)
    expect(input).toEqual(before)
  })

  it('clamps node size into [15, 40]', () => {
    const out = computeLayout({
      nodes: [node('big', true, 999), node('small', false, 1)],
      edges: [],
      width: 800,
      height: 600,
    })
    const big = out.find((n) => n.id === 'big')
    const small = out.find((n) => n.id === 'small')
    expect(big?.size).toBeLessThanOrEqual(40)
    expect(small?.size).toBeGreaterThanOrEqual(15)
  })

  it('is deterministic for the same connected input', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f']
    const nodes = [node('a', true), ...ids.slice(1).map((id) => node(id))]
    const edges: NetworkEdge[] = [
      { from: 'a', to: 'b', type: 'reference', weight: 1 },
      { from: 'a', to: 'c', type: 'citation', weight: 1 },
      { from: 'b', to: 'd', type: 'reference', weight: 2 },
      { from: 'c', to: 'd', type: 'reference', weight: 1 },
      { from: 'd', to: 'e', type: 'citation', weight: 1 },
      { from: 'e', to: 'f', type: 'reference', weight: 3 },
    ]
    const input = { nodes, edges, width: 800, height: 600 }
    const a = computeLayout(input)
    const b = computeLayout(input)
    expect(a.map((n) => [n.x, n.y])).toEqual(b.map((n) => [n.x, n.y]))
  })

  it('is deterministic for the same input', () => {
    const input = { nodes: [node('a', true), node('b')], edges: [], width: 800, height: 600 }
    const a = computeLayout(input)
    const b = computeLayout(input)
    expect(a.map((n) => [n.x, n.y])).toEqual(b.map((n) => [n.x, n.y]))
  })

  it('ignores edges referencing unknown ids without throwing', () => {
    const out = computeLayout({
      nodes: [node('a')],
      edges: [{ from: 'a', to: 'ghost', type: 'reference', weight: 1 } as NetworkEdge],
      width: 400, height: 400,
    })
    expect(out).toHaveLength(1)
  })
})
