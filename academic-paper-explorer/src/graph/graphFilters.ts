import type { NetworkEdge, NetworkNode } from '../types/domain'

export interface GraphFilters {
  yearRange: [number, number]
  minCitations: number
  selectedFields: string[]
  selectedVenues: string[]
  timelineYear: number | null
}

export function filterGraph(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  f: GraphFilters,
): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  const kept = nodes.filter((n) => {
    if (n.year != null) {
      if (n.year < f.yearRange[0] || n.year > f.yearRange[1]) return false
      if (f.timelineYear != null && n.year > f.timelineYear) return false
    }
    if (n.citationCount < f.minCitations) return false
    if (f.selectedFields.length > 0) {
      const fields = n.fieldsOfStudy ?? []
      if (!fields.some((x) => f.selectedFields.includes(x))) return false
    }
    if (f.selectedVenues.length > 0) {
      if (!n.venue || !f.selectedVenues.includes(n.venue)) return false
    }
    return true
  })

  const ids = new Set(kept.map((n) => n.id))
  const keptEdges = edges.filter((e) => ids.has(e.from) && ids.has(e.to))
  return { nodes: kept, edges: keptEdges }
}
