import { test, expect } from 'bun:test'
import {
  normalizeDoi,
  normalizeArxiv,
  canonicalKey,
  canonicalKeyFromS2,
  mergeDuplicates,
} from './identity'

test('normalizeDoi strips the resolver prefix and lowercases', () => {
  expect(normalizeDoi('https://doi.org/10.1038/Nature12373')).toBe('10.1038/nature12373')
  expect(normalizeDoi('  10.1/AbC ')).toBe('10.1/abc')
  expect(normalizeDoi(undefined)).toBeNull()
  expect(normalizeDoi('')).toBeNull()
})

test('normalizeArxiv strips the prefix and version', () => {
  expect(normalizeArxiv('arXiv:1706.03762v2')).toBe('1706.03762')
  expect(normalizeArxiv('1706.03762')).toBe('1706.03762')
  expect(normalizeArxiv(null)).toBeNull()
})

test('canonicalKey priority is DOI > arXiv > paperId', () => {
  expect(canonicalKey({ doi: '10.1/x', arxivId: '1706.03762', paperId: 'p' })).toBe('10.1/x')
  expect(canonicalKey({ arxivId: '1706.03762', paperId: 'p' })).toBe('1706.03762')
  expect(canonicalKey({ paperId: 'p' })).toBe('p')
})

test('canonicalKeyFromS2 reads externalIds', () => {
  expect(canonicalKeyFromS2({ paperId: 'p', externalIds: { DOI: '10.1/X' } } as never)).toBe('10.1/x')
  expect(canonicalKeyFromS2({ paperId: 'p', externalIds: { ArXiv: '1706.03762v1' } } as never)).toBe('1706.03762')
  expect(canonicalKeyFromS2({ paperId: 'p' } as never)).toBe('p')
})

test('mergeDuplicates keeps one node per canonical key and repoints edges', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const edges = [
    { from: 'b', to: 'c', type: 'reference', weight: 1 },
    { from: 'a', to: 'c', type: 'reference', weight: 1 },
    { from: 'b', to: 'a', type: 'citation', weight: 1 },
  ]
  const canonicalOf = new Map([
    ['a', 'k1'],
    ['b', 'k1'],
    ['c', 'k2'],
  ])
  const out = mergeDuplicates(nodes, edges, canonicalOf)
  expect(out.nodes.map((n) => n.id).sort()).toEqual(['a', 'c'])
  expect(out.alias.get('b')).toBe('a')
  const refs = out.edges.filter((e) => e.type === 'reference')
  expect(refs).toHaveLength(1)
  expect(refs[0]).toMatchObject({ from: 'a', to: 'c' })
  expect(out.edges.find((e) => e.type === 'citation')).toBeUndefined()
})

test('mergeDuplicates keeps the max weight when merging duplicate edges', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }]
  const edges = [
    { from: 'x', to: 'b', type: 'coupling', weight: 2 },
    { from: 'y', to: 'b', type: 'coupling', weight: 5 },
  ]
  const canonicalOf = new Map([
    ['x', 'a'],
    ['y', 'a'],
    ['a', 'a'],
    ['b', 'b'],
  ])
  const out = mergeDuplicates([...nodes, { id: 'x' }, { id: 'y' }], edges, canonicalOf)
  const coupling = out.edges.filter((e) => e.type === 'coupling')
  expect(coupling).toHaveLength(1)
  expect(coupling[0].weight).toBe(5)
})
