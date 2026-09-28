import { json, ApiError } from '../errors'
import { getJob, getJobResult } from '../jobs'

export function jobRoute(_req: Request, id: string): Response {
  const job = getJob(id)
  if (!job) throw new ApiError('JOB_NOT_FOUND', '任务不存在', 404)
  if (job.status === 'done') return json({ status: 'done', progress: job.progress, data: getJobResult(id) })
  return json({ status: job.status, progress: job.progress, error: job.error })
}
