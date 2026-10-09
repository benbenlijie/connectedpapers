import { readJson, json, ApiError } from '../errors'
import { findConnection } from '../connect'

/**
 * `POST /api/connect` — longest-waiting endpoint in the app: the live snowball
 * search can take tens of seconds, so the client shows a spinner rather than
 * polling a job. Everything is bounded by `config.connect.maxExecutionMs`.
 */
export async function connectRoute(req: Request): Promise<Response> {
  const body = await readJson<{ from_id?: string; to_id?: string; live?: boolean; max_hops?: number }>(req)
  const fromId = body.from_id?.trim()
  const toId = body.to_id?.trim()
  if (!fromId || !toId) throw new ApiError('MISSING_PAPER_ID', '需要同时提供两篇论文的 ID')

  const raw = Number(body.max_hops)
  const maxHops = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 8) : undefined

  const data = await findConnection(fromId, toId, {
    maxHops,
    live: typeof body.live === 'boolean' ? body.live : undefined,
  })
  return json({ data })
}
