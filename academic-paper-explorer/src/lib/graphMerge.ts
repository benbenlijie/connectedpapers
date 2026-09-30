import type { NetworkData, NetworkEdge } from '../types/domain'

/** Union two graphs: nodes by id (base wins), edges by `from|to|type` (max weight). */
export function mergeNetworkData(base: NetworkData, add: NetworkData): NetworkData {
  const nodes = new Map(base.nodes.map((n) => [n.id, n]))
  for (const n of add.nodes) if (!nodes.has(n.id)) nodes.set(n.id, n)

  const edges = new Map<string, NetworkEdge>()
  for (const e of [...base.edges, ...add.edges]) {
    const key = `${e.from}|${e.to}|${e.type}`
    const existing = edges.get(key)
    if (!existing || e.weight > existing.weight) edges.set(key, e)
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] }
}
