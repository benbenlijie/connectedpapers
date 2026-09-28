interface RetryOpts {
  retries: number
  baseDelayMs: number
  retryOn?: (err: unknown) => boolean
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOpts): Promise<T> {
  const { retries, baseDelayMs, retryOn = defaultRetryOn } = opts
  let last: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (attempt === retries || !retryOn(e)) throw e
      await sleep(Math.max(baseDelayMs, baseDelayMs * 2 ** attempt))
    }
  }
  throw last
}

function defaultRetryOn(e: unknown): boolean {
  const s = (e as { status?: number })?.status
  if (s === 429 || s === 403 || (typeof s === 'number' && s >= 500)) return true
  if (typeof DOMException !== 'undefined' && e instanceof DOMException) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') return true
  }
  if (e instanceof TypeError) return true
  return false
}
