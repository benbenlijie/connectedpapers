import { describe, it, expect } from 'vitest'
import {
  emptyLibrary,
  parseLibrary,
  serializeLibrary,
  isFavorite,
  toggleFavorite,
  addCollection,
  removeCollection,
  addToCollection,
  removeFromCollection,
  addSavedSearch,
  removeSavedSearch,
} from './library'

describe('parseLibrary', () => {
  it('returns an empty library for invalid input', () => {
    expect(parseLibrary(null)).toEqual(emptyLibrary())
    expect(parseLibrary('nope')).toEqual(emptyLibrary())
  })

  it('keeps valid parts and drops malformed ones', () => {
    const raw = JSON.stringify({
      favorites: ['a', 3, 'b'],
      collections: [{ id: 'c1', name: 'Reading', paperIds: ['a', 5] }, { name: 'no id' }],
      savedSearches: [{ id: 's1', query: 'x', query_type: 'keyword' }, { query: 'y' }],
    })
    const lib = parseLibrary(raw)
    expect(lib.favorites).toEqual(['a', 'b'])
    expect(lib.collections).toEqual([{ id: 'c1', name: 'Reading', paperIds: ['a'] }])
    expect(lib.savedSearches).toEqual([{ id: 's1', query: 'x', query_type: 'keyword' }])
  })
})

describe('favorites', () => {
  it('toggles a favorite on and off', () => {
    const on = toggleFavorite(emptyLibrary(), 'a')
    expect(isFavorite(on, 'a')).toBe(true)
    expect(isFavorite(on, 'b')).toBe(false)
    const off = toggleFavorite(on, 'a')
    expect(isFavorite(off, 'a')).toBe(false)
    expect(on.favorites).toEqual(['a'])
  })
})

describe('collections', () => {
  it('creates a collection and adds/removes papers', () => {
    const lib = addCollection(emptyLibrary(), 'Reading', 'c1')
    expect(lib.collections).toHaveLength(1)
    const withPaper = addToCollection(lib, 'c1', 'p1')
    expect(withPaper.collections[0].paperIds).toEqual(['p1'])
    const filtered = addToCollection(withPaper, 'c1', 'p1')
    expect(filtered.collections[0].paperIds).toEqual(['p1'])
    expect(removeFromCollection(filtered, 'c1', 'p1').collections[0].paperIds).toEqual([])
  })

  it('removes a collection', () => {
    const lib = addToCollection(addCollection(emptyLibrary(), 'R', 'c1'), 'c1', 'p1')
    expect(removeCollection(lib, 'c1').collections).toEqual([])
  })
})

describe('saved searches', () => {
  it('adds a search and dedupes by query+type', () => {
    const lib = addSavedSearch(emptyLibrary(), 'attention', 'keyword', 's1')
    const again = addSavedSearch(lib, 'attention', 'keyword', 's2')
    expect(again.savedSearches).toHaveLength(1)
    expect(removeSavedSearch(again, 's1').savedSearches).toEqual([])
  })
})

describe('serializeLibrary', () => {
  it('round-trips', () => {
    const lib = toggleFavorite(addCollection(emptyLibrary(), 'R', 'c1'), 'p1')
    expect(parseLibrary(serializeLibrary(lib))).toEqual(lib)
  })
})
