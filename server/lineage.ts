import type { S2Paper } from './s2'
import { getReferences, getCitations } from './s2'

export interface LineagePaper {
  paperId: string
  title: string
  year?: number
  citationCount?: number
  venue?: string
  authors?: string
  isInfluential?: boolean
}

export interface Lineage {
  prior: LineagePaper[]
  followUps: LineagePaper[]
}

function toLineagePaper(p: Partial<S2Paper> | undefined, isInfluential: boolean): LineagePaper | null {
  if (!p?.paperId) return null
  return {
    paperId: p.paperId,
    title: p.title ?? '',
    year: p.year,
    citationCount: p.citationCount,
    venue: p.venue,
    authors: (p.authors ?? []).map((a) => a.name).join(', '),
    isInfluential,
  }
}

/**
 * Map an S2 `/references` or `/citations` payload into a ranked lineage list.
 * Influential links first, then most-cited, then newest; deduped and capped.
 */
export function mapLineageEntries(
  rows: any[],
  side: 'reference' | 'citation',
  limit: number,
): LineagePaper[] {
  const key = side === 'reference' ? 'citedPaper' : 'citingPaper'
  const seen = new Set<string>()
  const out: LineagePaper[] = []
  for (const row of rows ?? []) {
    const paper = toLineagePaper(row?.[key], Boolean(row?.isInfluential))
    if (!paper || seen.has(paper.paperId)) continue
    seen.add(paper.paperId)
    out.push(paper)
  }
  out.sort(
    (a, b) =>
      Number(b.isInfluential ?? false) - Number(a.isInfluential ?? false) ||
      (b.citationCount ?? 0) - (a.citationCount ?? 0) ||
      (b.year ?? 0) - (a.year ?? 0),
  )
  return out.slice(0, limit)
}

/**
 * Fetch a paper's predecessors (works it references) and successors
 * (works that cite it). Each side is best-effort; both failing throws.
 */
export async function fetchLineage(s2Path: string, limit: number): Promise<Lineage> {
  const raw = Math.min(100, Math.max(limit, limit * 4))
  const [refs, cites] = await Promise.all([
    getReferences(s2Path, raw).then((r: any) => r?.data ?? []).catch(() => null),
    getCitations(s2Path, raw).then((r: any) => r?.data ?? []).catch(() => null),
  ])
  if (refs === null && cites === null) {
    throw Object.assign(new Error('S2 lineage unavailable'), { status: 502 })
  }
  return {
    prior: mapLineageEntries(refs ?? [], 'reference', limit),
    followUps: mapLineageEntries(cites ?? [], 'citation', limit),
  }
}
