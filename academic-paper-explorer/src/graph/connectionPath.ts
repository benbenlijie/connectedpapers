import type { ConnectionPath, NetworkEdge, NetworkNode } from '../types/domain'

export interface ConnectionHighlight {
  nodeIds: Set<string>
  /** `${from}->${to}` keys matching how react-force-graph links are keyed. */
  linkKeys: Set<string>
}

const EMPTY_NODES: Set<string> = new Set()
const EMPTY_KEYS: Set<string> = new Set()

/** The node ids and rendered link keys that make up a connection path. */
export function connectionHighlight(path: ConnectionPath | null | undefined): ConnectionHighlight {
  if (!path) return { nodeIds: EMPTY_NODES, linkKeys: EMPTY_KEYS }
  const linkKeys = new Set<string>()
  for (const e of path.edges) linkKeys.add(`${e.from}->${e.to}`)
  return { nodeIds: new Set(path.nodeIds), linkKeys }
}

/**
 * Union a connection path back into an already-filtered graph.
 *
 * A connection is an explicit request, so year / citation filters and hidden
 * edge types must not be able to break the chain the user asked to see. The
 * path is merged in *after* filtering for exactly that reason.
 */
export function ensurePathVisible(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  path: ConnectionPath | null | undefined,
): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  if (!path) return { nodes, edges }
  const presentNodes = new Set(nodes.map((n) => n.id))
  const addNodes = path.nodes.filter((n) => !presentNodes.has(n.id))
  const edgeKey = (e: NetworkEdge) => `${e.from}->${e.to}`
  const presentEdges = new Set(edges.map(edgeKey))
  const addEdges = path.edges.filter((e) => !presentEdges.has(edgeKey(e)))
  return { nodes: [...nodes, ...addNodes], edges: [...edges, ...addEdges] }
}
