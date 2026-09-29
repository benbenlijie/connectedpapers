import { test, expect } from 'bun:test'
import { connectedComponents, pagerank, bibliographicCoupling } from './graph'

test('connected components assigns ids', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const edges = [{ from: 'a', to: 'b' }]
  const comps = connectedComponents(nodes as any, edges as any)
  expect(comps.get('a')).toBe(comps.get('b'))
  expect(comps.get('c')).not.toBe(comps.get('a'))
})

test('pagerank sums to ~1 and favors linked node', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const edges = [{ from: 'a', to: 'c' }, { from: 'b', to: 'c' }]
  const pr = pagerank(nodes as any, edges as any)
  const sum = [...pr.values()].reduce((s, v) => s + v, 0)
  expect(Math.abs(sum - 1)).toBeLessThan(1e-6)
  expect(pr.get('c')!).toBeGreaterThan(pr.get('a')!)
})

test('pagerank routes edges to ids outside nodes into dangling mass', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }]
  const edges = [{ from: 'a', to: 'ghost' }]
  const pr = pagerank(nodes as any, edges as any)
  const sum = [...pr.values()].reduce((s, v) => s + v, 0)
  expect(Math.abs(sum - 1)).toBeLessThan(1e-6)
  expect(pr.has('ghost')).toBe(false)
})

test('bibliographic coupling emits weighted edges for shared references', () => {
  const refs = new Map<string, Set<string>>([
    ['a', new Set(['r1', 'r2', 'r3'])],
    ['b', new Set(['r2', 'r3', 'r4'])],
    ['c', new Set(['r9'])],
  ])
  expect(bibliographicCoupling(refs, 2)).toEqual([
    { from: 'a', to: 'b', type: 'coupling', weight: 2 },
  ])
  expect(bibliographicCoupling(refs, 3)).toEqual([])
})
