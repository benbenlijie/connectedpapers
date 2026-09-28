import { readJson, json, ApiError } from '../errors'
import { toS2Input } from '../resolve'
import { normalizeS2Paper } from '../normalize'
import { getPaper, getRecommendations, getCitationContexts } from '../s2'
import { upsertPaper } from '../papers'

export async function detailsRoute(req: Request): Promise<Response> {
  const { paper_id } = await readJson<{ paper_id?: string }>(req)
  if (!paper_id) throw new ApiError('MISSING_PAPER_ID', '论文ID不能为空')

  let paper
  try {
    paper = await getPaper(await toS2Input(paper_id))
  } catch (e) {
    if (e instanceof ApiError) throw e
    const status = (e as { status?: number })?.status
    if (status === 404) throw new ApiError('PAPER_NOT_FOUND', '论文未找到', 404)
    throw new ApiError('PAPER_FETCH_FAILED', `无法获取论文: ${(e as Error).message}`, 502)
  }
  upsertPaper(paper)

  const [recommendations, citationContexts] = await Promise.all([
    getRecommendations(paper.paperId).then((r: any) => r.recommendedPapers ?? []).catch(() => []),
    getCitationContexts(paper.paperId).then((r: any) => r.data ?? []).catch(() => []),
  ])

  return json({ data: { paper: normalizeS2Paper(paper), recommendations, citation_contexts: citationContexts, metrics: { h_index: 0, impact_factor: 0, altmetric_score: 0 } } })
}
