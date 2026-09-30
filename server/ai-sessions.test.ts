import { test, expect, beforeEach } from 'bun:test'
import { openDb } from './db'
import { getSession, setSession, getArxivBySession } from './ai-sessions'

let db: ReturnType<typeof openDb>
beforeEach(() => { db = openDb(':memory:') })

test('setSession then getSession roundtrips', () => {
  expect(getSession('2401.00001', db)).toBeNull()
  setSession('2401.00001', 'sess-1', db)
  expect(getSession('2401.00001', db)).toBe('sess-1')
})

test('setSession upserts on the same arxivId', () => {
  setSession('2401.00001', 'sess-1', db)
  setSession('2401.00001', 'sess-2', db)
  expect(getSession('2401.00001', db)).toBe('sess-2')
})

test('getArxivBySession reverses the mapping', () => {
  setSession('2401.00002', 'sess-9', db)
  expect(getArxivBySession('sess-9', db)).toBe('2401.00002')
  expect(getArxivBySession('missing', db)).toBeNull()
})
