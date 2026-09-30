import { config } from './config'
import { withRetry } from './retry'

const FIELDS =
  'paperId,title,abstract,year,citationCount,authors,venue,url,openAccessPdf,fieldsOfStudy,externalIds,' +
  'references.paperId,references.title,references.year,citations.paperId,citations.title,citations.year'

export interface S2Paper {
  paperId: string
  title?: string
  abstract?: string
  year?: number
  citationCount?: number
  authors?: Array<{ authorId?: string; name: string; url?: string; affiliations?: string[] }>
  venue?: string
  url?: string
  openAccessPdf?: { url?: string }
  externalIds?: { DOI?: string; ArXiv?: string; [key: string]: string | undefined }
  fieldsOfStudy?: string[]
  journal?: string
  references?: Array<{ paperId: string; title?: string; year?: number; citationCount?: number }>
  citations?: Array<{ paperId: string; title?: string; year?: number; citationCount?: number }>
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': `Academic-Paper-Explorer/1.0 (mailto:${config.s2.contactEmail})`,
  }
  if (config.s2.apiKey) h['x-api-key'] = config.s2.apiKey
  return h
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw Object.assign(new Error(`S2 ${res.status} ${res.statusText}`), { status: res.status })
  return res.json()
}

export function getPaper(s2Path: string): Promise<S2Paper> {
  return withRetry(() => getJson(`${config.s2.base}/paper/${encodeURIComponent(s2Path)}?fields=${FIELDS}`),
    { retries: 3, baseDelayMs: 1200 })
}

const SEARCH_FIELDS =
  'paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf,externalIds'

/** 关键词搜索。对 429/5xx 退避重试；重试耗尽后抛出（携带 status）。 */
export function searchPapers(query: string): Promise<S2Paper[]> {
  return withRetry(async () => {
    const res = await fetch(
      `${config.s2.base}/paper/search?query=${encodeURIComponent(query)}&limit=20&fields=${SEARCH_FIELDS}`,
      { headers: headers(), signal: AbortSignal.timeout(15000) },
    )
    if (!res.ok) throw Object.assign(new Error(`S2 search ${res.status} ${res.statusText}`), { status: res.status })
    return ((await res.json()) as { data?: S2Paper[] }).data ?? []
  }, { retries: 3, baseDelayMs: 1200 })
}

/** 一次最多 500 个 id，返回与入参同序的数组（缺失为 null）。 */
export function getPapersBatch(s2Paths: string[]): Promise<(S2Paper | null)[]> {
  return withRetry(async () => {
    const res = await fetch(`${config.s2.base}/paper/batch?fields=${FIELDS}`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: s2Paths }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw Object.assign(new Error(`S2 batch ${res.status}`), { status: res.status })
    return (await res.json()) as (S2Paper | null)[]
  }, { retries: 3, baseDelayMs: 1200 })
}

export function getRecommendations(s2Path: string): Promise<any> {
  const base = config.s2.base.replace('/graph/v1', '/recommendations/v1')
  return getJson(`${base}/papers/forpaper/${encodeURIComponent(s2Path)}?fields=paperId,title,year,citationCount,authors,venue&limit=10`)
}

export function getCitationContexts(s2Path: string): Promise<any> {
  return getJson(`${config.s2.base}/paper/${encodeURIComponent(s2Path)}/citations?fields=contexts,citingPaper.paperId,citingPaper.title,citingPaper.year,isInfluential&limit=20`)
}

/** SPECTER2 embeddings for up to 500 ids (single attempt; rate limits are common). */
export async function getEmbeddingsBatch(s2Paths: string[]): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>()
  if (!s2Paths.length) return out
  const res = await fetch(`${config.s2.base}/paper/batch?fields=embedding.specter_v2`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: s2Paths }),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw Object.assign(new Error(`S2 embeddings ${res.status}`), { status: res.status })
  const data = (await res.json()) as Array<{ embedding?: { vector?: number[] } } | null>
  data.forEach((p, i) => {
    const vector = p?.embedding?.vector
    if (Array.isArray(vector) && vector.length) out.set(s2Paths[i], vector)
  })
  return out
}
