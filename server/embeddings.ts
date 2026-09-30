import type { Database } from 'bun:sqlite'
import { db as defaultDb } from './db'

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length)
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

export interface SemanticEdge {
  from: string
  to: string
  sim: number
}

/** Undirected edges to each node's top-k nearest neighbours above `minSim`. */
export function semanticNeighborEdges(
  vectors: Map<string, number[]>,
  opts: { k: number; minSim: number },
): SemanticEdge[] {
  const ids = [...vectors.keys()]
  const neighbors = new Map<string, { id: string; sim: number }[]>()
  for (const id of ids) neighbors.set(id, [])

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const sim = cosineSimilarity(vectors.get(ids[i])!, vectors.get(ids[j])!)
      if (sim < opts.minSim) continue
      neighbors.get(ids[i])!.push({ id: ids[j], sim })
      neighbors.get(ids[j])!.push({ id: ids[i], sim })
    }
  }

  const seen = new Set<string>()
  const out: SemanticEdge[] = []
  for (const id of ids) {
    const list = neighbors.get(id)!.sort((a, b) => b.sim - a.sim).slice(0, opts.k)
    for (const nb of list) {
      const [from, to] = id < nb.id ? [id, nb.id] : [nb.id, id]
      const key = `${from}|${to}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ from, to, sim: nb.sim })
    }
  }
  return out
}

export function upsertEmbedding(
  id: string,
  model: string,
  vector: number[],
  dbIn: Database = defaultDb,
): void {
  dbIn.run(
    `insert into paper_embeddings (id, model, vector, updated_at) values (?,?,?,datetime('now'))
     on conflict(id) do update set model=excluded.model, vector=excluded.vector, updated_at=datetime('now')`,
    [id, model, JSON.stringify(vector)],
  )
}

export function getEmbeddings(ids: string[], dbIn: Database = defaultDb): Map<string, number[]> {
  const out = new Map<string, number[]>()
  if (ids.length === 0) return out
  const placeholders = ids.map(() => '?').join(',')
  const rows = dbIn
    .query(`select id, vector from paper_embeddings where id in (${placeholders})`)
    .all(...ids) as { id: string; vector: string }[]
  for (const row of rows) {
    try {
      const vector = JSON.parse(row.vector)
      if (Array.isArray(vector)) out.set(row.id, vector as number[])
    } catch {
      // skip corrupt rows
    }
  }
  return out
}

export function embeddingCount(dbIn: Database = defaultDb): number {
  return (dbIn.query('select count(*) c from paper_embeddings').get() as { c: number }).c
}
