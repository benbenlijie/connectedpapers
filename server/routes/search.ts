import { readJson, json, ApiError } from '../errors'
import { searchOpenAlex } from '../openalex'
import { getPaper, searchPapers } from '../s2'
import { toS2Input } from '../resolve'
import { normalizeS2Paper } from '../normalize'
import { logSearch } from '../db-queries'
import { rankSearchResults } from '../searchRank'

interface Body { query: string; query_type?: 'keyword' | 'doi' | 'arxiv' | 's2_id' }

export async function searchRoute(req: Request): Promise<Response> {
  const started = Date.now()
  const { query, query_type = 'keyword' } = await readJson<Body>(req)
  if (typeof query !== 'string' || !query.trim()) throw new ApiError('VALIDATION_FAILED', '查询内容不能为空')

  let papers: any[] = []
  let warning: string | undefined
  if (query_type === 'keyword') {
    const [s2Result, oaResult] = await Promise.allSettled([searchPapers(query), searchOpenAlex(query)])
    const s2 = s2Result.status === 'fulfilled' ? s2Result.value : []
    const oa = oaResult.status === 'fulfilled' ? oaResult.value : []
    papers = [...s2.map(normalizeS2), ...oa.map(normalizeOa)]

    const s2Failed = s2Result.status === 'rejected'
    const oaFailed = oaResult.status === 'rejected'
    if (s2Failed && oaFailed) {
      console.error('搜索上游全部失败:', (s2Result as PromiseRejectedResult).reason?.message, (oaResult as PromiseRejectedResult).reason?.message)
      throw new ApiError('UPSTREAM_FAILED', '上游数据源（Semantic Scholar / OpenAlex）暂时不可用或已限流，请稍后重试；配置 SEMANTIC_SCHOLAR_API_KEY 可提升稳定性', 502)
    }
    if (s2Failed || oaFailed) warning = `${s2Failed ? 'Semantic Scholar' : 'OpenAlex'} 暂时限流，结果可能不完整`
  } else {
    let p: any
    try {
      p = await getPaper(await toS2Input(query))
    } catch (e) {
      const status = (e as { status?: number })?.status
      if (status === 404) throw new ApiError('PAPER_NOT_FOUND', '论文未找到', 404)
      throw new ApiError('PAPER_FETCH_FAILED', `无法获取论文: ${(e as Error).message}`, 502)
    }
    papers = [normalizeS2(p)]
  }

  const ranked = rankSearchResults(papers, query)
  logSearch(query, query_type, ranked.length, Date.now() - started)
  return json({ data: { papers: ranked.slice(0, 50), total_count: ranked.length, query_type }, ...(warning ? { warning } : {}) })
}

function normalizeS2(p: any) {
  return { source: 'semantic_scholar', ...normalizeS2Paper(p) }
}
function normalizeOa(w: any) {
  return {
    id: w.id, source: 'openalex', openalex_id: w.id, title: w.title, abstract: null,
    publication_year: w.publication_year, citation_count: w.cited_by_count ?? 0,
    authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean).join(', '),
    venue: w.primary_location?.source?.display_name, fields_of_study: (w.concepts ?? []).map((c: any) => c.display_name),
    doi: (w.doi ?? '').replace(/^https?:\/\/doi\.org\//, ''),
  }
}

