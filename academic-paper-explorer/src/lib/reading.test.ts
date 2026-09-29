import { describe, it, expect } from 'vitest'
import {
  parseReading,
  serializeReading,
  withStatus,
  withProgress,
  statusLabel,
} from './reading'

describe('parseReading', () => {
  it('returns an empty map for null or invalid input', () => {
    expect(parseReading(null)).toEqual({})
    expect(parseReading('nope')).toEqual({})
    expect(parseReading('[1,2]')).toEqual({})
  })

  it('keeps valid entries and drops invalid statuses', () => {
    const raw = JSON.stringify({
      a: { status: 'reading', progress: 40 },
      b: { status: 'bogus' },
      c: { status: 'done' },
    })
    expect(parseReading(raw)).toEqual({ a: { status: 'reading', progress: 40 }, c: { status: 'done' } })
  })

  it('clamps and drops invalid progress', () => {
    const raw = JSON.stringify({
      a: { status: 'reading', progress: 250 },
      b: { status: 'reading', progress: -5 },
      c: { status: 'reading', progress: 'x' },
    })
    expect(parseReading(raw)).toEqual({
      a: { status: 'reading', progress: 100 },
      b: { status: 'reading', progress: 0 },
      c: { status: 'reading' },
    })
  })
})

describe('serializeReading', () => {
  it('round-trips', () => {
    const map = { a: { status: 'to_read' as const } }
    expect(parseReading(serializeReading(map))).toEqual(map)
  })
})

describe('withStatus', () => {
  it('adds an entry with a timestamp without mutating the input', () => {
    const first = {}
    const next = withStatus(first, 'a', 'to_read', '2026-09-29T00:00:00.000Z')
    expect(first).toEqual({})
    expect(next.a).toEqual({ status: 'to_read', updatedAt: '2026-09-29T00:00:00.000Z' })
  })

  it('removes the entry when status is null', () => {
    const map = { a: { status: 'done' as const } }
    expect(withStatus(map, 'a', null)).toEqual({})
  })
})

describe('withProgress', () => {
  it('creates a reading entry when missing and clamps the value', () => {
    const next = withProgress({}, 'a', 140)
    expect(next.a.status).toBe('reading')
    expect(next.a.progress).toBe(100)
  })

  it('updates progress but keeps an existing status', () => {
    const next = withProgress({ a: { status: 'done' } }, 'a', 50)
    expect(next.a.status).toBe('done')
    expect(next.a.progress).toBe(50)
  })
})

describe('statusLabel', () => {
  it('maps statuses to Chinese labels', () => {
    expect(statusLabel('to_read')).toBe('待读')
    expect(statusLabel('reading')).toBe('在读')
    expect(statusLabel('done')).toBe('已读')
  })
})
