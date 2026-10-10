import { test, expect, describe, beforeEach } from 'bun:test'
import { openDb } from '../db'
import { createRateLimiter } from '../rateLimit'
import { RATE_LIMIT_EXEMPT, handleApiRequest } from './api'

/**
 * Issue #12: `RATE_LIMIT_PER_MIN` is documented as covering `/api/*`, but
 * nothing asserted that for `/api/search` and `/api/connect`, and `main.ts`
 * has exemption prefixes. These tests drive the extracted fetch handler with a
 * limiter capped at 1 request per window, so any request beyond the first
 * must be rejected with 429. If the limiter were removed or a route were
 * accidentally exempted, these would fail.
 */

const client = { status: () => Promise.resolve('unknown' as const) } as any

function deps(rateLimiter: ((key: string) => boolean) | null) {
  return {
    db: openDb(':memory:'),
    opencodeClient: client,
    rateLimiter,
    accessToken: '',
  }
}

function post(path: string, body = '{}'): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

describe('per-IP rate limiter covers /api/search and /api/connect', () => {
  let d: ReturnType<typeof deps>

  beforeEach(() => {
    d = deps(createRateLimiter({ windowMs: 60_000, max: 1 }))
  })

  test('the second /api/search request in the window is rejected with 429', async () => {
    // The first call consumes the single slot (it may still fail downstream
    // for other reasons; what matters is the limiter did not reject it).
    const first = await handleApiRequest(post('/api/search'), d)
    expect(first.status).not.toBe(429)

    const second = await handleApiRequest(post('/api/search'), d)
    expect(second.status).toBe(429)
    const body = (await second.json()) as { error: { code: string } }
    expect(body.error.code).toBe('RATE_LIMITED')
  })

  test('the second /api/connect request in the window is rejected with 429', async () => {
    const first = await handleApiRequest(post('/api/connect'), d)
    expect(first.status).not.toBe(429)

    const second = await handleApiRequest(post('/api/connect'), d)
    expect(second.status).toBe(429)
  })

  test('the limiter is shared across routes: /api/search then /api/connect is also limited', async () => {
    await handleApiRequest(post('/api/search'), d)
    const connect = await handleApiRequest(post('/api/connect'), d)
    expect(connect.status).toBe(429)
  })

  test('the limiter is keyed per IP, so a different client is not affected', async () => {
    await handleApiRequest(post('/api/search'), d)
    const other = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.2' },
      body: '{}',
    })
    const res = await handleApiRequest(other, d)
    expect(res.status).not.toBe(429)
  })
})

describe('exemption prefixes are exactly the documented three', () => {
  test('the exempt list stays as documented in main.ts', () => {
    expect(RATE_LIMIT_EXEMPT).toEqual(['/api/paper/session/', '/api/translate', '/api/llm/status'])
  })

  test('/api/search and /api/connect are NOT in the exemption list', () => {
    for (const prefix of ['/api/search', '/api/connect']) {
      expect(RATE_LIMIT_EXEMPT.some((e) => prefix.startsWith(e))).toBe(false)
    }
  })
})
