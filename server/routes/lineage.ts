import { readJson, json, ApiError } from '../errors'
import { toS2Input } from '../resolve'
import { fetchLineage } from '../lineage'

export async function lineageRoute(req: Request): Promise<Response> {
  const body = await readJson<{ paper_id?: string; limit?: number }>(req)
  if (!body.paper_id) throw new ApiError('MISSING_PAPER_ID', '论文ID不能为空')

  const raw = Number(body.limit)
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 100) : 25

  const s2Path = await toS2Input(body.paper_id)
  const { prior, followUps } = await fetchLineage(s2Path, limit).catch((e) => {
    if (e instanceof ApiError) throw e
    throw new ApiError('UPSTREAM_FAILED', '无法获取该论文的前置/后续工作，请稍后重试', 502)
  })

  return json({ data: { root_id: body.paper_id, prior, followUps } })
}
