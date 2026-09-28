import { describe, it, expect } from 'vitest'
import { colorFor, sizeFor, withAlpha } from './encoding'
import type { NetworkNode } from '../types/domain'

const node = (over: Partial<NetworkNode> = {}): NetworkNode => ({
  id: 'x', label: 'x', title: 'x', citationCount: 0, authors: '', isRoot: false,
  pageRankScore: 0, clusterId: 0, size: 10, color: '#000000', ...over,
})

describe('colorFor', () => {
  it('is deterministic for cluster mode', () => {
    expect(colorFor(node({ clusterId: 3 }), 'cluster')).toBe(colorFor(node({ clusterId: 3 }), 'cluster'))
  })
  it('returns gray for missing year', () => {
    expect(colorFor(node({ year: undefined }), 'year')).toBe('#94a3b8')
  })
  it('returns gray for empty fields', () => {
    expect(colorFor(node({ fieldsOfStudy: [] }), 'field')).toBe('#94a3b8')
  })
  it('is stable for the same field', () => {
    expect(colorFor(node({ fieldsOfStudy: ['Physics'] }), 'field')).toBe(
      colorFor(node({ fieldsOfStudy: ['Physics'] }), 'field'),
    )
  })
})

describe('sizeFor', () => {
  it('clamps zero citations to the minimum radius', () => {
    expect(sizeFor(node({ citationCount: 0 }), 'citations')).toBe(5)
  })
  it('clamps huge citation counts to the maximum radius', () => {
    expect(sizeFor(node({ citationCount: 100000 }), 'citations')).toBe(18)
  })
  it('is monotonic in citations', () => {
    expect(sizeFor(node({ citationCount: 100 }), 'citations')).toBeGreaterThan(
      sizeFor(node({ citationCount: 10 }), 'citations'),
    )
  })
  it('clamps pagerank into [5, 18]', () => {
    const v = sizeFor(node({ pageRankScore: 0.5 }), 'pagerank')
    expect(v).toBeGreaterThanOrEqual(5)
    expect(v).toBeLessThanOrEqual(18)
  })
})

describe('withAlpha', () => {
  it('converts #rrggbb to rgba', () => {
    expect(withAlpha('#4ade80', 0.5)).toBe('rgba(74, 222, 128, 0.5)')
  })
  it('expands shorthand hex', () => {
    expect(withAlpha('#fff', 1)).toBe('rgba(255, 255, 255, 1)')
  })
  it('passes through non-hex strings', () => {
    expect(withAlpha('hsl(1,2%,3%)', 0.5)).toBe('hsl(1,2%,3%)')
  })
})
