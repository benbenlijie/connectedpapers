/**
 * Serialize calls with a minimum spacing between them, so upstream APIs
 * (Semantic Scholar / OpenAlex) are hit at a polite, predictable rate even when
 * the crawl fans out in parallel. Failures do not break the chain.
 */
export function createLimiter(minIntervalMs: number) {
  let last = 0
  let chain: Promise<unknown> = Promise.resolve()

  return function schedule<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
      const wait = Math.max(0, last + minIntervalMs - Date.now())
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      last = Date.now()
      return fn()
    })
    chain = run.catch(() => undefined)
    return run
  }
}

/** Fixed-window per-key rate limiter; returns true when the call is allowed. */
export function createRateLimiter(opts: { windowMs: number; max: number; now?: () => number }) {
  const hits = new Map<string, { count: number; reset: number }>()
  const now = opts.now ?? Date.now

  return function check(key: string): boolean {
    const t = now()
    const record = hits.get(key)
    if (!record || t >= record.reset) {
      hits.set(key, { count: 1, reset: t + opts.windowMs })
      return true
    }
    if (record.count >= opts.max) return false
    record.count++
    return true
  }
}
