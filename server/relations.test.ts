import { test, expect, beforeEach } from 'bun:test'
import { openDb } from './db'
import { upsertRelation, getRelations, getRelationsBetween, relationCount, persistRelations } from './relations'

let db: ReturnType<typeof openDb>
beforeEach(() => { db = openDb(':memory:') })

test('upsertRelation stores a relation and updates on conflict', () => {
  upsertRelation('a', 'b', 'reference', 1, 's2', db)
  upsertRelation('a', 'b', 'reference', 3, 's2', db)
  const rows = getRelations('a', db)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({ from_id: 'a', to_id: 'b', type: 'reference', weight: 3 })
})

test('getRelations returns relations in either direction', () => {
  upsertRelation('a', 'b', 'reference', 1, 's2', db)
  upsertRelation('c', 'a', 'citation', 1, 's2', db)
  upsertRelation('x', 'y', 'coupling', 2, 'local', db)
  const rows = getRelations('a', db)
  expect(rows.map((r) => `${r.from_id}->${r.to_id}`).sort()).toEqual(['a->b', 'c->a'])
})

test('getRelations can filter by type', () => {
  upsertRelation('a', 'b', 'reference', 1, null, db)
  upsertRelation('a', 'c', 'related', 2, null, db)
  expect(getRelations('a', db, ['related']).map((r) => r.to_id)).toEqual(['c'])
})

test('getRelationsBetween returns an existing relation', () => {
  upsertRelation('a', 'b', 'coupling', 4, 'local', db)
  expect(getRelationsBetween('a', 'b', db)?.weight).toBe(4)
  expect(getRelationsBetween('b', 'a', db)).toBeNull()
})

test('relationCount reports the total', () => {
  expect(relationCount(db)).toBe(0)
  upsertRelation('a', 'b', 'reference', 1, null, db)
  expect(relationCount(db)).toBe(1)
})

test('persistRelations tags the source per edge type', () => {
  persistRelations(
    [
      { from: 'a', to: 'b', type: 'reference', weight: 1 },
      { from: 'a', to: 'c', type: 'related', weight: 2 },
      { from: 'a', to: 'd', type: 'coupling', weight: 3 },
    ],
    db,
  )
  const byTo = new Map(getRelations('a', db).map((r) => [r.to_id, r.source]))
  expect(byTo.get('b')).toBe('s2')
  expect(byTo.get('c')).toBe('related')
  expect(byTo.get('d')).toBe('local')
})
