import { readJson, json, ApiError } from '../errors'
import { enqueueNetwork } from '../jobs'

export async function networkRoute(req: Request): Promise<Response> {
  const body = await readJson<{ paper_id?: string; depth?: number; max_nodes?: number }>(req)
  if (!body.paper_id) throw new ApiError('MISSING_PAPER_ID', '论文ID不能为空')
  const d = Number(body.depth)
  const depth = Number.isFinite(d) ? Math.min(Math.max(d, 1), 3) : 2
  const m = Number(body.max_nodes)
  const max_nodes = Number.isFinite(m) ? Math.min(Math.max(m, 1), 300) : 100
  const { cached, job_id } = enqueueNetwork({ paper_id: body.paper_id, depth, max_nodes })
  if (cached) return json({ data: cached, cached: true, status: 'done' })
  return json({ job_id, status: 'pending' }, 202)
}
