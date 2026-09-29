import type { S2Paper } from './s2'

export function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null
  const value = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase()
  return value || null
}

export function normalizeArxiv(id: string | null | undefined): string | null {
  if (!id) return null
  const value = id
    .trim()
    .replace(/^arxiv:/i, '')
    .replace(/v\d+$/i, '')
    .toLowerCase()
  return value || null
}

export interface IdentityInput {
  doi?: string | null
  arxivId?: string | null
  paperId: string
}

/** Canonical work key: DOI > arXiv > provider id. */
export function canonicalKey(input: IdentityInput): string {
  return normalizeDoi(input.doi) ?? normalizeArxiv(input.arxivId) ?? input.paperId
}

export function canonicalKeyFromS2(paper: S2Paper): string {
  return canonicalKey({
    doi: paper.externalIds?.DOI,
    arxivId: paper.externalIds?.ArXiv,
    paperId: paper.paperId,
  })
}

export interface IdNode {
  id: string
}

export interface TypedEdge {
  from: string
  to: string
  type: string
  weight: number
}

export interface MergeResult<N, E> {
  nodes: N[]
  edges: E[]
  alias: Map<string, string>
}

/**
 * Collapse nodes that resolve to the same canonical key (first one wins),
 * repoint edges onto the kept ids, drop self-loops and dedupe by from|to|type
 * keeping the max weight.
 */
export function mergeDuplicates<N extends IdNode, E extends TypedEdge>(
  nodes: N[],
  edges: E[],
  canonicalOf: Map<string, string>,
): MergeResult<N, E> {
  const canonicalToId = new Map<string, string>()
  const alias = new Map<string, string>()

  for (const node of nodes) {
    const key = canonicalOf.get(node.id) ?? node.id
    const existing = canonicalToId.get(key)
    if (existing) {
      alias.set(node.id, existing)
    } else {
      canonicalToId.set(key, node.id)
      alias.set(node.id, node.id)
    }
  }

  const keptNodes = nodes.filter((node) => alias.get(node.id) === node.id)

  const byKey = new Map<string, E>()
  const keptEdgeKeys: string[] = []
  for (const edge of edges) {
    const from = alias.get(edge.from) ?? edge.from
    const to = alias.get(edge.to) ?? edge.to
    if (from === to) continue
    const key = `${from}|${to}|${edge.type}`
    const existing = byKey.get(key)
    if (existing) {
      if (edge.weight > existing.weight) byKey.set(key, { ...edge, from, to })
    } else {
      byKey.set(key, { ...edge, from, to })
      keptEdgeKeys.push(key)
    }
  }

  return { nodes: keptNodes, edges: keptEdgeKeys.map((k) => byKey.get(k)!), alias }
}
