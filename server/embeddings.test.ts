import { test, describe, expect, beforeEach } from 'bun:test'
import { openDb } from './db'
import { cosineSimilarity, semanticNeighborEdges, upsertEmbedding, getEmbeddings } from './embeddings'

test('cosineSimilarity: identical=1, orthogonal=0, zero-safe', () => {
  expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1)
  expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
})

test('semanticNeighborEdges keeps the nearest neighbours above the threshold', () => {
  const vectors = new Map<string, number[]>([
    ['a', [1, 0, 0]],
    ['b', [0.9, 0.1, 0]],
    ['c', [0, 1, 0]],
  ])
  const edges = semanticNeighborEdges(vectors, { k: 1, minSim: 0.5 })
  expect(edges).toHaveLength(1)
  expect(edges[0]).toMatchObject({ from: 'a', to: 'b' })
  expect(edges[0].sim).toBeGreaterThan(0.5)
})

test('semanticNeighborEdges dedupes unordered pairs', () => {
  const vectors = new Map<string, number[]>([
    ['a', [1, 0]],
    ['b', [1, 0]],
    ['c', [1, 0]],
  ])
  const edges = semanticNeighborEdges(vectors, { k: 2, minSim: 0 })
  const keys = edges.map((e) => `${e.from}|${e.to}`).sort()
  expect(keys).toEqual(['a|b', 'a|c', 'b|c'])
})

describe('embedding cache', () => {
  let db: ReturnType<typeof openDb>
  beforeEach(() => { db = openDb(':memory:') })

  test('upsert and read back vectors', () => {
    upsertEmbedding('a', 'specter_v2', [1, 2, 3], db)
    upsertEmbedding('a', 'specter_v2', [4, 5, 6], db)
    const map = getEmbeddings(['a', 'b'], db)
    expect(map.get('a')).toEqual([4, 5, 6])
    expect(map.has('b')).toBe(false)
  })
})
