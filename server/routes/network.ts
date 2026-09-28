import { readJson, json, ApiError } from '../errors'
import { enqueueNetwork } from '../jobs'

export async function networkRoute(req: Request): Promise<Response> {
  const body = await readJson<{ paper_id?: string; depth?: number; max_nodes?: number }>(req)
  if (!body.paper_id) throw new ApiError('MISSING_PAPER_ID', '论文ID不能为空')
  const depth = Math.min(Math.max(body.depth ?? 2, 1), 3)
  const max_nodes = Math.min(Math.max(body.max_nodes ?? 100, 1), 300)
  const { cached, job_id } = enqueueNetwork({ paper_id: body.paper_id, depth, max_nodes })
  if (cached) return json({ data: cached, cached: true, status: 'done' })
  return json({ job_id, status: 'pending' }, 202)
}
