import { test, expect } from 'bun:test'
import { louvain } from './community'

function edges(list: [string, string][]): { from: string; to: string; weight: number }[] {
  return list.map(([from, to]) => ({ from, to, weight: 1 }))
}

test('two triangles joined by a bridge fall into two communities', () => {
  const nodes = ['a', 'b', 'c', 'd', 'e', 'f']
  const es = edges([
    ['a', 'b'], ['b', 'c'], ['a', 'c'],
    ['d', 'e'], ['e', 'f'], ['d', 'f'],
    ['c', 'd'],
  ])
  const comm = louvain(nodes, es)
  expect(comm.get('a')).toBe(comm.get('b'))
  expect(comm.get('b')).toBe(comm.get('c'))
  expect(comm.get('d')).toBe(comm.get('e'))
  expect(comm.get('e')).toBe(comm.get('f'))
  expect(comm.get('a')).not.toBe(comm.get('d'))
})

test('isolated nodes keep their own community and ids are normalized', () => {
  const comm = louvain(['x', 'y'], [])
  expect(new Set(comm.values()).size).toBe(2)
  expect(comm.get('x')).not.toBe(comm.get('y'))
})

test('a heavy bridge pulls the bridging nodes into one community', () => {
  const nodes = ['a', 'b', 'c', 'd', 'e', 'f']
  const es: { from: string; to: string; weight: number }[] = edges([
    ['a', 'b'], ['b', 'c'], ['a', 'c'],
    ['d', 'e'], ['e', 'f'], ['d', 'f'],
  ])
  es.push({ from: 'c', to: 'd', weight: 50 })
  const comm = louvain(nodes, es)
  expect(comm.get('c')).toBe(comm.get('d'))
})
