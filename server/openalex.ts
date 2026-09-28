import { config } from './config'

const ua = () => `Academic-Paper-Explorer/1.0 (mailto:${config.s2.contactEmail})`

export async function searchOpenAlex(query: string): Promise<any[]> {
  const url = `${config.openalex.base}/works?search=${encodeURIComponent(query)}&per_page=20&select=id,title,abstract_inverted_index,publication_year,cited_by_count,authorships,primary_location,publication_date,concepts,open_access,doi`
  const res = await fetch(url, { headers: { 'User-Agent': ua() } })
  if (!res.ok) return []
  return (await res.json()).results ?? []
}

export async function getByDoi(doi: string): Promise<any | null> {
  const res = await fetch(`${config.openalex.base}/works/doi:${doi}?select=id,title,abstract_inverted_index,publication_year,cited_by_count,authorships,primary_location,concepts,open_access`, { headers: { 'User-Agent': ua() } })
  if (!res.ok) return null
  return res.json()
}

export async function getWorkByOpenAlexId(
  id: string,
): Promise<{ doi?: string; title?: string; arxivId?: string } | null> {
  const m = String(id).match(/(W\d+)/)
  if (!m) return null
  const url = `${config.openalex.base}/works/${m[1]}?select=id,doi,title,ids,primary_location`
  const res = await fetch(url, { headers: { 'User-Agent': ua() } })
  if (!res.ok) return null
  const w = (await res.json()) as any
  if (!w) return null

  const rawDoi: string | undefined = w.doi ?? undefined
  const doi = rawDoi ? rawDoi.replace(/^https?:\/\/doi\.org\//, '') : undefined
  const arxivFromDoi = doi?.match(/10\.48550\/arxiv\.(.+)/i)?.[1]
  const ids: string[] = Array.isArray(w.ids)
    ? Object.values(w.ids).filter((v): v is string => typeof v === 'string')
    : []
  const arxivFromIds = ids
    .map((u) => u.match(/arxiv\.org\/abs\/([^/?#]+)/i)?.[1])
    .find((v): v is string => Boolean(v))

  return { doi, title: w.title ?? undefined, arxivId: arxivFromDoi ?? arxivFromIds }
}

export function reconstructAbstract(inv: Record<string, number[]> | null | undefined): string | null {
  if (!inv || typeof inv !== 'object') return null
  const words: string[] = []
  for (const [w, positions] of Object.entries(inv)) for (const p of positions) words[p] = w
  return words.filter(Boolean).join(' ')
}
