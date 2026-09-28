export type ErrorCode =
  | 'INVALID_JSON' | 'MISSING_PAPER_ID' | 'PAPER_NOT_FOUND' | 'PAPER_FETCH_FAILED'
  | 'NETWORK_BUILD_FAILED' | 'INTERNAL_SERVER_ERROR' | 'RATE_LIMITED'
  | 'UPSTREAM_FAILED' | 'VALIDATION_FAILED' | 'JOB_NOT_FOUND'

export class ApiError extends Error {
  constructor(public code: ErrorCode, message: string, public status = 400) {
    super(message)
    this.name = 'ApiError'
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function handleError(err: unknown): Response {
  if (err instanceof ApiError) return json({ error: { code: err.code, message: err.message } }, err.status)
  const message = err instanceof Error ? err.message : String(err)
  console.error('[api]', err)
  return json({ error: { code: 'INTERNAL_SERVER_ERROR', message } }, 500)
}

export async function readJson<T = any>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new ApiError('INVALID_JSON', '请求体格式错误，必须是有效的 JSON')
  }
}
