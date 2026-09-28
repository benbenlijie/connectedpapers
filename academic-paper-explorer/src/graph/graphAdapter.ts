import type { NetworkEdge, NetworkNode } from '../types/domain'
import { colorFor, sizeFor, type ColorMode, type SizeMode } from './encoding'

export interface GraphNode extends NetworkNode {
  color: string
  size: number
  val: number
  x?: number
  y?: number
  z?: number
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: 'reference' | 'citation'
  weight: number
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export function linkEndId(end: string | GraphNode): string {
  return typeof end === 'object' ? end.id : end
}

export function graphAdapter(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  opts: { colorMode: ColorMode; sizeMode: SizeMode },
): GraphData {
  const ids = new Set(nodes.map((n) => n.id))
  const outNodes: GraphNode[] = nodes.map((n) => {
    const size = sizeFor(n, opts.sizeMode)
    return { ...n, color: colorFor(n, opts.colorMode), size, val: size }
  })
  const links: GraphLink[] = edges
    .filter((e) => ids.has(e.from) && ids.has(e.to))
    .map((e) => ({ source: e.from, target: e.to, type: e.type, weight: e.weight }))
  return { nodes: outNodes, links }
}
