import { readJson, json, ApiError } from '../errors'
import { searchOpenAlex } from '../openalex'
import { getPaper } from '../s2'
import { resolvePaperId } from '../ids'
import { logSearch } from '../db-queries'

interface Body { query: string; query_type?: 'keyword' | 'doi' | 'arxiv' | 's2_id' }

export async function searchRoute(req: Request): Promise<Response> {
  const started = Date.now()
  const { query, query_type = 'keyword' } = await readJson<Body>(req)
  if (!query?.trim()) throw new ApiError('VALIDATION_FAILED', '查询内容不能为空')

  let papers: any[] = []
  if (query_type === 'keyword') {
    const [s2Result, oaResult] = await Promise.allSettled([
      fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=20&fields=paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf`, {
        headers: process.env.SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY! } : {},
      }).then((r) => (r.ok ? r.json() : { data: [] })).then((j) => j.data ?? []),
      searchOpenAlex(query),
    ])
    const s2 = s2Result.status === 'fulfilled' ? s2Result.value : []
    const oa = oaResult.status === 'fulfilled' ? oaResult.value : []
    papers = [...s2.map(normalizeS2), ...oa.map(normalizeOa)]
  } else {
    const resolved = resolvePaperId(query)
    const p = await getPaper(resolved.s2Path)
    papers = [normalizeS2(p)]
  }

  const deduped = dedupe(papers)
  logSearch(query, query_type, deduped.length, Date.now() - started)
  return json({ data: { papers: deduped.slice(0, 50), total_count: deduped.length, query_type } })
}

function normalizeS2(p: any) {
  return {
    source: 'semantic_scholar', semantic_scholar_id: p.paperId, title: p.title, abstract: p.abstract,
    publication_year: p.year, citation_count: p.citationCount ?? 0,
    authors: (p.authors ?? []).map((a: any) => a.name).join(', '), venue: p.venue,
    fields_of_study: p.fieldsOfStudy ?? [], url: p.url, pdf_url: p.openAccessPdf?.url,
  }
}
function normalizeOa(w: any) {
  return {
    source: 'openalex', openalex_id: w.id, title: w.title, abstract: null,
    publication_year: w.publication_year, citation_count: w.cited_by_count ?? 0,
    authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean).join(', '),
    venue: w.primary_location?.source?.display_name, fields_of_study: (w.concepts ?? []).map((c: any) => c.display_name),
    doi: (w.doi ?? '').replace(/^https?:\/\/doi\.org\//, ''),
  }
}
function dedupe(papers: any[]) {
  const map = new Map<string, any>()
  for (const p of papers) {
    const key = p.doi || p.semantic_scholar_id || p.openalex_id || p.title
    if (key && !map.has(key)) map.set(key, p)
  }
  return [...map.values()].sort((a, b) => (b.citation_count ?? 0) - (a.citation_count ?? 0))
}
