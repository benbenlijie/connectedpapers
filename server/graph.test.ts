import { test, expect } from 'bun:test'
import { connectedComponents, pagerank } from './graph'

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
