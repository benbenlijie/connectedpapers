import { describe, it, expect } from 'vitest'
import { computeLayout } from './computeLayout'
import type { NetworkEdge, NetworkNode } from '../types/domain'

const node = (id: string, isRoot = false): NetworkNode => ({
  id, label: id, title: id, citationCount: 1, authors: '', isRoot,
  pageRankScore: 0.1, clusterId: 0, size: 20, color: '#1e3a8a',
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
