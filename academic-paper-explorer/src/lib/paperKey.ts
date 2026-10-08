import type { Paper } from '../types/domain'

/** Mirrors the server's DOI normalisation so both sides produce the same key. */
export function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null
  const value = doi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .toLowerCase()
  return value || null
}

/**
 * The single canonical identity for a paper, shared by the library (favorites +
 * collections), notes, the reading list and the graph URL.
 *
 * The order mirrors the ids the server puts on graph nodes (server/graph.ts):
 * Semantic Scholar papers are keyed by their S2 id, OpenAlex papers by their
 * normalised DOI (falling back to the OpenAlex id). Deriving the key in more
 * than one place is what made "加入集合" write a DOI while the list filtered on
 * an OpenAlex id, so keep every consumer on this function.
 */
export function resolvePaperKey(p: Paper | null | undefined): string | null {
  if (!p) return null
  return p.semantic_scholar_id || normalizeDoi(p.doi) || p.openalex_id || p.id || null
}
