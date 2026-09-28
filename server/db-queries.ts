import { db } from './db'
import { createHash } from 'node:crypto'
import { config } from './config'

export function queryHash(rootId: string, depth: number, maxNodes: number): string {
  return createHash('sha256').update(`${rootId}_${depth}_${maxNodes}_v${config.cache.graphVersion}`).digest('hex').slice(0, 32)
}

export function getCachedNetwork(hash: string): any | null {
  const row = db.query(
    "select network_data from paper_networks where query_hash=? and expires_at > datetime('now')",
  ).get(hash) as { network_data: string } | null
  return row ? JSON.parse(row.network_data) : null
}

export function cacheNetwork(hash: string, rootId: string, depth: number, maxNodes: number, graph: unknown): void {
  db.run(
    `insert into paper_networks (query_hash, root_paper_id, depth, max_nodes, graph_version, network_data,
       node_count, edge_count, generated_at, expires_at)
     values (?,?,?,?,?,?,?,?,datetime('now'), datetime('now', ?))
     on conflict(query_hash) do update set network_data=excluded.network_data, node_count=excluded.node_count,
       edge_count=excluded.edge_count, generated_at=datetime('now'), expires_at=excluded.expires_at`,
    [hash, rootId, depth, maxNodes, config.cache.graphVersion, JSON.stringify(graph),
     (graph as any).nodes.length, (graph as any).edges.length, `+${config.cache.networkTtlHours} hours`],
  )
}

export function logSearch(query_text: string, query_type: string, results_count: number, execution_time_ms: number): void {
  db.run('insert into search_queries (query_text, query_type, results_count, execution_time_ms) values (?,?,?,?)',
    [query_text, query_type, results_count, execution_time_ms])
}
