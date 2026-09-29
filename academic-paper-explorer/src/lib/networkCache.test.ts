import { describe, it, expect, beforeEach } from 'vitest'
import {
  networkCacheKey,
  parseNetworkCache,
  serializeNetworkCache,
  putNetworkCache,
  isFresh,
  applyPositions,
  collectPositions,
  readCachedNetwork,
  writeCachedNetwork,
  writeNetworkPositions,
  readNetworkPositions,
  NETWORK_CACHE_STORAGE_KEY,
  NETWORK_CACHE_LIMIT,
} from './networkCache'
import type { NetworkData } from '../types/domain'
import type { NetworkCache } from './networkCache'

const data: NetworkData = {
  nodes: [{ id: 'a', label: 'A', title: 'A', citationCount: 0, authors: '', isRoot: true, pageRankScore: 0, clusterId: 0, size: 1, color: '#fff' }],
  edges: [],
}

describe('networkCacheKey', () => {
  it('is stable and parameter-dependent', () => {
    expect(networkCacheKey('p', 2, 100)).toBe(networkCacheKey('p', 2, 100))
    expect(networkCacheKey('p', 2, 100)).not.toBe(networkCacheKey('p', 1, 100))
  })
})

describe('parseNetworkCache', () => {
  it('returns an empty map for invalid input and drops malformed entries', () => {
    expect(parseNetworkCache(null)).toEqual({})
    expect(parseNetworkCache('nope')).toEqual({})
    const raw = JSON.stringify({ good: { savedAt: '2026-01-01', data }, bad: { data: {} }, nope: 3 })
    expect(Object.keys(parseNetworkCache(raw))).toEqual(['good'])
  })
})

describe('putNetworkCache', () => {
  it('stores an entry and prunes to the newest N', () => {
    let cache: NetworkCache = {}
    for (let i = 0; i < NETWORK_CACHE_LIMIT + 2; i++) {
      const savedAt = new Date(Date.UTC(2026, 0, i + 1)).toISOString()
      cache = putNetworkCache(cache, `k${i}`, { savedAt, data })
    }
    expect(Object.keys(cache)).toHaveLength(NETWORK_CACHE_LIMIT)
    expect(cache[`k${NETWORK_CACHE_LIMIT + 1}`]).toBeDefined()
    expect(cache.k0).toBeUndefined()
  })

  it('updates an existing key without growing', () => {
    const cache = putNetworkCache(putNetworkCache({}, 'k', { savedAt: '2026-01-01', data }), 'k', {
      savedAt: '2026-01-02',
      data,
    })
    expect(Object.keys(cache)).toEqual(['k'])
    expect(cache.k.savedAt).toBe('2026-01-02')
  })
})

describe('isFresh', () => {
  it('is true within the TTL and false after', () => {
    const now = Date.parse('2026-06-01T00:00:00Z')
    expect(isFresh({ savedAt: '2026-05-31T00:00:00Z', data }, now)).toBe(true)
    expect(isFresh({ savedAt: '2026-01-01T00:00:00Z', data }, now)).toBe(false)
  })
})

describe('positions', () => {
  it('collects and re-applies node coordinates', () => {
    const positions = collectPositions([
      { id: 'a', x: 1, y: 2, z: 3 },
      { id: 'b', x: 4, y: 5 },
      { id: 'c' },
    ])
    expect(positions).toEqual({ a: { x: 1, y: 2, z: 3 }, b: { x: 4, y: 5 } })

    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    applyPositions(nodes, positions)
    expect(nodes[0]).toMatchObject({ x: 1, y: 2 })
    expect(nodes[1]).toMatchObject({ x: 4, y: 5 })
    expect((nodes[2] as { x?: number }).x).toBeUndefined()
  })
})

describe('localStorage glue', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips data and positions, dropping expired entries', () => {
    writeCachedNetwork('k', data)
    expect(readCachedNetwork('k')).toEqual(data)

    writeNetworkPositions('k', { a: { x: 9, y: 8 } })
    expect(readNetworkPositions('k')).toEqual({ a: { x: 9, y: 8 } })

    const stale = { k: { savedAt: '2000-01-01T00:00:00Z', data } }
    localStorage.setItem(NETWORK_CACHE_STORAGE_KEY, JSON.stringify(stale))
    expect(readCachedNetwork('k', Date.parse('2026-01-01T00:00:00Z'))).toBeNull()
  })

  it('returns null and does not throw on corrupt storage', () => {
    localStorage.setItem(NETWORK_CACHE_STORAGE_KEY, '{bad')
    expect(readCachedNetwork('k')).toBeNull()
    expect(readNetworkPositions('k')).toBeUndefined()
  })
})
