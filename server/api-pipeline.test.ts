import { describe, expect, test } from 'bun:test'
import { createApiPipeline } from './api-pipeline'

const EXEMPT = ['/api/paper/session/', '/api/translate', '/api/llm/status']

function request(path: string, ip = '192.0.2.1') {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'x-real-ip': ip },
  })
}

describe('API request pipeline rate limit', () => {
  test('limits /api/search and /api/connect requests sharing one IP bucket', async () => {
    const dispatched: string[] = []
    const handle = createApiPipeline({
      rateLimitPerMin: 2,
      trustProxy: true,
      requestIp: () => '127.0.0.1',
      rateLimitExempt: EXEMPT,
      dispatch: async (req) => {
        const path = new URL(req.url).pathname
        dispatched.push(path)
        return Response.json({ path })
      },
    })

    expect((await handle(request('/api/search'))).status).toBe(200)
    expect((await handle(request('/api/connect'))).status).toBe(200)
    const blocked = await handle(request('/api/search'))
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } })
    expect(dispatched).toEqual(['/api/search', '/api/connect'])
  })

  test('limits /api/connect independently and does not exempt search or connect', async () => {
    const handle = createApiPipeline({
      rateLimitPerMin: 2,
      trustProxy: true,
      requestIp: () => '127.0.0.1',
      rateLimitExempt: EXEMPT,
      dispatch: async () => new Response('ok'),
    })

    expect((await handle(request('/api/connect'))).status).toBe(200)
    expect((await handle(request('/api/connect'))).status).toBe(200)
    expect((await handle(request('/api/connect'))).status).toBe(429)
  })
})
