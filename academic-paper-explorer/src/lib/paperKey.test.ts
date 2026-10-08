import { describe, it, expect } from 'vitest'
import { normalizeDoi, resolvePaperKey } from './paperKey'
import type { Paper } from '../types/domain'

const paper = (over: Partial<Paper> = {}): Paper => ({
  id: 'local-1',
  title: 'T',
  citation_count: 0,
  authors: '',
  source: 'openalex',
  ...over,
})

describe('normalizeDoi', () => {
  it('strips the resolver prefix and lowercases', () => {
    expect(normalizeDoi('https://doi.org/10.1000/ABC')).toBe('10.1000/abc')
    expect(normalizeDoi('http://dx.doi.org/10.1000/ABC')).toBe('10.1000/abc')
    expect(normalizeDoi(' 10.1000/ABC ')).toBe('10.1000/abc')
  })

  it('returns null for empty input', () => {
    expect(normalizeDoi(null)).toBeNull()
    expect(normalizeDoi('')).toBeNull()
    expect(normalizeDoi('   ')).toBeNull()
  })
})

describe('resolvePaperKey', () => {
  it('prefers the Semantic Scholar id', () => {
    expect(resolvePaperKey(paper({ semantic_scholar_id: 'S2', doi: '10.1000/x' }))).toBe('S2')
  })

  // server/graph.ts keys OpenAlex nodes by normalizeDoi(doi), so this must match.
  it('falls back to the normalised DOI', () => {
    expect(resolvePaperKey(paper({ doi: 'https://doi.org/10.1000/ABC' }))).toBe('10.1000/abc')
  })

  it('falls back to the OpenAlex id, then the local id', () => {
    expect(resolvePaperKey(paper({ openalex_id: 'W9' }))).toBe('W9')
    expect(resolvePaperKey(paper())).toBe('local-1')
  })

  it('returns null when there is no usable identity', () => {
    expect(resolvePaperKey(null)).toBeNull()
    expect(resolvePaperKey(undefined)).toBeNull()
    expect(resolvePaperKey(paper({ id: '' }))).toBeNull()
  })
})
