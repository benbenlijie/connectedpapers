import { config } from './config'
import { withRetry } from './retry'
import { createLimiter } from './rateLimit'

const limiter = createLimiter(config.openalex.minIntervalMs)

function keyed(url: string): string {
  if (!config.openalex.apiKey) return url
  return `${url}${url.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(config.openalex.apiKey)}`
}

/** Rate-limited, key-augmented OpenAlex fetch. */
function oaFetch(url: string, init?: RequestInit): Promise<Response> {
  return limiter(() => fetch(keyed(url), init))
}

const ua = () => `Academic-Paper-Explorer/1.0 (mailto:${config.s2.contactEmail})`
// OpenAlex “polite pool”：带上 mailto 可获更高、更稳定的限速。
const mailto = () => encodeURIComponent(config.s2.contactEmail)

const WORK_SELECT =
  'id,title,abstract_inverted_index,publication_year,cited_by_count,authorships,primary_location,publication_date,concepts,open_access,doi'

export function buildWorkSearchUrl(query: string): string {
  return `${config.openalex.base}/works?search=${encodeURIComponent(query)}&per_page=20&select=${WORK_SELECT}&mailto=${mailto()}`
}

/** 搜索 works。对 429/5xx 退避重试；重试耗尽后抛出（携带 status），由调用方决定降级。 */
export function searchOpenAlex(query: string): Promise<any[]> {
  return withRetry(async () => {
    const res = await oaFetch(buildWorkSearchUrl(query), {
      headers: { 'User-Agent': ua() },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw Object.assign(new Error(`OpenAlex ${res.status} ${res.statusText}`), { status: res.status })
    return ((await res.json()) as { results?: unknown[] }).results ?? []
  }, { retries: 3, baseDelayMs: 1000 })
}

export async function getByDoi(doi: string): Promise<any | null> {
  const res = await oaFetch(`${config.openalex.base}/works/doi:${doi}?select=${WORK_SELECT}&mailto=${mailto()}`, { headers: { 'User-Agent': ua() } })
  if (!res.ok) return null
  return res.json()
}

export async function getWorkByOpenAlexId(
  id: string,
): Promise<{ doi?: string; title?: string; arxivId?: string } | null> {
  const m = String(id).match(/(W\d+)/)
  if (!m) return null
  const url = `${config.openalex.base}/works/${m[1]}?select=id,doi,title,ids,primary_location&mailto=${mailto()}`
  const res = await oaFetch(url, { headers: { 'User-Agent': ua() } })
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

const RELATED_SELECT =
  'id,doi,title,publication_year,cited_by_count,authorships,primary_location,concepts,open_access,related_works'

async function fetchWork(url: string): Promise<any | null> {
  try {
    const res = await oaFetch(url, { headers: { 'User-Agent': ua() } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function relatedFrom(work: any, limit: number): Promise<any[]> {
  const ids: string[] = Array.isArray(work?.related_works)
    ? work.related_works.map((u: string) => String(u).match(/(W\d+)/)?.[1]).filter((v: unknown): v is string => Boolean(v))
    : []
  const take = ids.slice(0, limit)
  if (!take.length) return []
  const url = `${config.openalex.base}/works?filter=openalex_id:${take.join('|')}&per_page=${take.length}&select=${RELATED_SELECT}&mailto=${mailto()}`
  const body = await fetchWork(url)
  return body?.results ?? []
}

/** Best-effort related works for a DOI (algorithmic relatedness). */
export async function getRelatedWorksByDoi(doi: string, limit: number): Promise<any[]> {
  if (!doi) return []
  const work = await fetchWork(`${config.openalex.base}/works/doi:${encodeURIComponent(doi)}?select=${RELATED_SELECT}&mailto=${mailto()}`)
  return work ? relatedFrom(work, limit) : []
}

export function buildWorkByDoiUrl(doi: string): string {
  return `${config.openalex.base}/works/doi:${encodeURIComponent(doi)}?select=${RELATED_SELECT}&mailto=${mailto()}`
}

export function buildWorkSearchByTitleUrl(title: string): string {
  return `${config.openalex.base}/works?search=${encodeURIComponent(title)}&per_page=1&select=${RELATED_SELECT}&mailto=${mailto()}`
}

/**
 * Related works with an arXiv fallback: try the DOI, else search by title
 * (arXiv DOIs like 10.48550/arxiv.* 404 in OpenAlex). Best-effort.
 */
export async function getRelatedWorksForPaper(input: {
  doi?: string | null
  title?: string
  limit: number
}): Promise<any[]> {
  if (input.doi) {
    const work = await fetchWork(buildWorkByDoiUrl(input.doi))
    if (work && Array.isArray(work.related_works) && work.related_works.length) {
      return relatedFrom(work, input.limit)
    }
  }
  if (input.title) {
    const body = await fetchWork(buildWorkSearchByTitleUrl(input.title))
    const first = body?.results?.[0]
    if (first) return relatedFrom(first, input.limit)
  }
  return []
}
