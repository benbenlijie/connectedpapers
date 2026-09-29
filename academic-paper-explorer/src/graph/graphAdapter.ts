import type { NetworkEdge, NetworkNode, Paper } from '../types/domain'
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

/** Reconstruct a minimal Paper from a graph node (for re-rooting / comparing). */
export function nodeToPaper(node: NetworkNode): Paper {
  return {
    id: node.id,
    title: node.title || node.label || node.id,
    authors: node.authors,
    publication_year: node.year,
    year: node.year,
    citation_count: node.citationCount,
    abstract: node.abstract,
    venue: node.venue,
    url: node.url,
    pdf_url: node.pdfUrl,
    fields_of_study: node.fieldsOfStudy,
    source: 'semantic_scholar',
  }
}
