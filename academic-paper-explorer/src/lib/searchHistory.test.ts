import { describe, it, expect } from 'vitest'
import {
  parseHistory,
  serializeHistory,
  addToHistory,
  removeFromHistory,
  filterHistory,
  SEARCH_HISTORY_LIMIT,
} from './searchHistory'

describe('parseHistory', () => {
  it('returns an empty list for invalid input', () => {
    expect(parseHistory(null)).toEqual([])
    expect(parseHistory('nope')).toEqual([])
    expect(parseHistory('{"a":1}')).toEqual([])
  })

  it('keeps non-empty trimmed strings and drops the rest', () => {
    const raw = JSON.stringify(['foo', '  bar  ', '', 42, null, 'foo'])
    expect(parseHistory(raw)).toEqual(['foo', 'bar'])
  })
})

describe('serializeHistory', () => {
  it('round-trips', () => {
    const list = ['a', 'b']
    expect(parseHistory(serializeHistory(list))).toEqual(list)
  })
})

describe('addToHistory', () => {
  it('trims, dedupes and puts the newest first', () => {
    expect(addToHistory(['b', 'a'], '  a  ')).toEqual(['a', 'b'])
    expect(addToHistory(['b'], 'c')).toEqual(['c', 'b'])
  })

  it('ignores blank queries and caps the length', () => {
    expect(addToHistory(['a'], '   ')).toEqual(['a'])
    const full = Array.from({ length: SEARCH_HISTORY_LIMIT }, (_, i) => `q${i}`)
    const next = addToHistory(full, 'new')
    expect(next).toHaveLength(SEARCH_HISTORY_LIMIT)
    expect(next[0]).toBe('new')
  })
})

describe('removeFromHistory', () => {
  it('removes by exact value', () => {
    expect(removeFromHistory(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })
})

describe('filterHistory', () => {
  it('returns the head of the list when the input is empty', () => {
    expect(filterHistory(['a', 'b'], '')).toEqual(['a', 'b'])
  })

  it('filters case-insensitively by substring', () => {
    expect(filterHistory(['Attention', 'BERT'], 'att')).toEqual(['Attention'])
  })
})
