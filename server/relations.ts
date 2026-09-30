import type { Database } from 'bun:sqlite'
import { db as defaultDb } from './db'

export type RelationType = 'reference' | 'citation' | 'related' | 'coupling'

export interface Relation {
  from_id: string
  to_id: string
  type: string
  weight: number
  source?: string | null
}

export function upsertRelation(
  from: string,
  to: string,
  type: RelationType | string,
  weight = 1,
  source: string | null = null,
  dbIn: Database = defaultDb,
): void {
  dbIn.run(
    `insert into paper_relations (from_id, to_id, type, weight, source, updated_at)
     values (?,?,?,?,?,datetime('now'))
     on conflict(from_id, to_id, type) do update set
       weight=excluded.weight, source=excluded.source, updated_at=datetime('now')`,
    [from, to, type, weight, source],
  )
}

export function getRelations(id: string, dbIn: Database = defaultDb, types?: string[]): Relation[] {
  if (types && types.length > 0) {
    const placeholders = types.map(() => '?').join(',')
    return dbIn
      .query(
        `select from_id, to_id, type, weight, source from paper_relations
         where (from_id=? or to_id=?) and type in (${placeholders})`,
      )
      .all(id, id, ...types) as Relation[]
  }
  return dbIn
    .query(
      `select from_id, to_id, type, weight, source from paper_relations where from_id=? or to_id=?`,
    )
    .all(id, id) as Relation[]
}

export function getRelationsBetween(from: string, to: string, dbIn: Database = defaultDb): Relation | null {
  return (dbIn
    .query(`select from_id, to_id, type, weight, source from paper_relations where from_id=? and to_id=? limit 1`)
    .get(from, to) as Relation | null) ?? null
}

export function relationCount(dbIn: Database = defaultDb): number {
  return (dbIn.query('select count(*) c from paper_relations').get() as { c: number }).c
}

/** Persist a built graph's edges (best-effort caller). */
export function persistRelations(
  edges: { from: string; to: string; type: string; weight: number }[],
  dbIn: Database = defaultDb,
): void {
  const sourceOf = (type: string) =>
    type === 'coupling' ? 'local' : type === 'related' ? 'related' : type === 'semantic' ? 'semantic' : 's2'
  for (const e of edges) upsertRelation(e.from, e.to, e.type, e.weight, sourceOf(e.type), dbIn)
}
