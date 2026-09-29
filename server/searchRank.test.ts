import { test, expect } from 'bun:test'
import { relevanceScore, rankSearchResults } from './searchRank'

const p = (over: Record<string, unknown>) => ({
  id: over.id ?? Math.random().toString(36),
  title: over.title ?? '',
  citation_count: over.citation_count ?? 0,
  ...over,
})

test('relevanceScore: full-query title hit beats partial token hit', () => {
  expect(relevanceScore('Attention Is All You Need', 'attention is all you need')).toBeGreaterThan(
    relevanceScore('A Survey of Attention', 'attention is all you need'),
  )
})

test('relevanceScore: more title tokens matched scores higher', () => {
  expect(relevanceScore('Graph Neural Networks', 'graph neural')).toBeGreaterThan(
    relevanceScore('Graph Databases', 'graph neural'),
  )
})

test('relevanceScore: no overlap scores 0', () => {
  expect(relevanceScore('Quantum Computing', 'graph neural')).toBe(0)
})

test('relevanceScore: CJK phrase matches as substring', () => {
  expect(relevanceScore('深度学习综述', '深度学习')).toBeGreaterThan(0)
})

test('rankSearchResults: direct title match ranks ahead of higher-cited unrelated paper', () => {
  const ranked = rankSearchResults(
    [
      p({ id: 'a', title: 'Unrelated but famous', citation_count: 100000 }),
      p({ id: 'b', title: 'Graph Neural Networks', citation_count: 5 }),
    ],
    'graph neural networks',
  )
  expect(ranked[0].id).toBe('b')
})

test('rankSearchResults: dedupes by doi', () => {
  const ranked = rankSearchResults(
    [
      p({ id: 'a', doi: '10.1/x', title: 'Graph Neural Networks' }),
      p({ id: 'b', doi: '10.1/x', title: 'Graph Neural Networks' }),
    ],
    'graph neural networks',
  )
  expect(ranked).toHaveLength(1)
})

test('rankSearchResults: equal relevance keeps upstream order', () => {
  const ranked = rankSearchResults(
    [
      p({ id: 'first', doi: '10.1/1', title: 'Graph' }),
      p({ id: 'second', doi: '10.1/2', title: 'Graph' }),
    ],
    'graph',
  )
  expect(ranked.map((r) => r.id)).toEqual(['first', 'second'])
})
