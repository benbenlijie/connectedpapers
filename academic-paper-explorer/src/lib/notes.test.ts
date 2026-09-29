import { describe, it, expect } from 'vitest'
import { parseNotes, serializeNotes, hasNote, withNote, annotatedIds } from './notes'

describe('parseNotes', () => {
  it('returns an empty map for null or invalid input', () => {
    expect(parseNotes(null)).toEqual({})
    expect(parseNotes('not json')).toEqual({})
    expect(parseNotes('[1,2,3]')).toEqual({})
    expect(parseNotes('"str"')).toEqual({})
  })

  it('keeps string values and drops the rest', () => {
    const raw = JSON.stringify({ a: 'note a', b: 42, c: null, d: { x: 1 } })
    expect(parseNotes(raw)).toEqual({ a: 'note a' })
  })
})

describe('serializeNotes', () => {
  it('round-trips through parseNotes', () => {
    const notes = { a: 'hello', b: 'world' }
    expect(parseNotes(serializeNotes(notes))).toEqual(notes)
  })
})

describe('hasNote', () => {
  it('is false for missing, null or blank notes', () => {
    expect(hasNote({}, 'a')).toBe(false)
    expect(hasNote({ a: '   ' }, 'a')).toBe(false)
    expect(hasNote({ a: 'x' }, null)).toBe(false)
    expect(hasNote({ a: 'x' }, undefined)).toBe(false)
  })

  it('is true for a non-blank note', () => {
    expect(hasNote({ a: 'x' }, 'a')).toBe(true)
  })
})

describe('withNote', () => {
  it('adds and replaces a note without mutating the input', () => {
    const first = { a: 'one' }
    const second = withNote(first, 'b', 'two')
    expect(first).toEqual({ a: 'one' })
    expect(second).toEqual({ a: 'one', b: 'two' })
    expect(withNote(second, 'a', 'updated')).toEqual({ a: 'updated', b: 'two' })
  })

  it('removes the key when the text is blank', () => {
    expect(withNote({ a: 'one', b: 'two' }, 'a', '   ')).toEqual({ b: 'two' })
  })
})

describe('annotatedIds', () => {
  it('includes only non-blank ids', () => {
    const ids = annotatedIds({ a: 'x', b: '  ', c: 'y' })
    expect([...ids].sort()).toEqual(['a', 'c'])
  })
})
