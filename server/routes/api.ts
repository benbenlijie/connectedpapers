/**
 * The request pipeline extracted from `main.ts` so the routing and rate-limit
 * layers can be exercised without starting a real server. `main.ts` wires this
 * up with the live DB, opencode client and config; the tests below drive it
 * directly.
 */
import { config } from '../config'
import { json, handleError, ApiError } from '../errors'
import { searchRoute } from './search'
import { detailsRoute } from './details'
import { networkRoute } from './network'
import { jobRoute } from './jobs'
import { translateRoute } from './translate'
import { llmStatusRoute } from './llm'
import { aiSessionRoute, aiChatRoute, aiHistoryRoute, aiStreamRoute, aiAbortRoute } from './ai'
import { neighborsRoute } from './neighbors'
import { lineageRoute } from './lineage'
import { connectRoute } from './connect'
import { paperSearchRoute, paperSectionRoute } from './paper'
import { readerRoute } from './reader'
import { INTERNAL_TOKEN } from '../internal-token'
import type { Database } from 'bun:sqlite'
import { createOpencodeClient, OpencodeManager } from '../opencode'
import { cookieHeader, clientIpFrom, extractToken, safeEqual, withBasePath } from '../auth'
import { createRateLimiter } from '../rateLimit'

/** Routes exempt from the per-IP limiter (documented in `main.ts`). */
export const RATE_LIMIT_EXEMPT = ['/api/paper/session/', '/api/translate', '/api/llm/status']

export function unauthorized(): Response {
  const body = `<!doctype html><meta charset="utf-8"><title>需要访问口令</title>
<body style="font-family:system-ui;background:#111827;color:#e5e7eb;padding:3rem">
<h2>需要访问口令</h2>
<p>请在地址后加上 <code>?token=你的口令</code> 打开一次，之后会记住（Cookie）。</p>
</body>`
  return new Response(body, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export interface ApiDeps {
  db: Database
  opencodeClient: ReturnType<typeof createOpencodeClient>
  rateLimiter: ((key: string) => boolean) | null
  accessToken: string
}

/**
 * The fetch handler: auth, rate limiting, then routing. Extracted verbatim
 * from `main.ts` so the two layers this repo documents can be tested in
 * isolation from the network stack.
 */
export async function handleApiRequest(req: Request, deps: ApiDeps): Promise<Response> {
  const url = new URL(req.url)
  const p = url.pathname
  const { db, opencodeClient, rateLimiter, accessToken } = deps
  try {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

    if (accessToken && !p.startsWith('/api/paper/session/')) {
      const { token, fromQuery } = extractToken(req.headers, url)
      if (fromQuery && token && safeEqual(token, accessToken)) {
        const clean = new URL(url)
        clean.searchParams.delete('token')
        const secure = url.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
        return new Response(null, {
          status: 302,
          headers: { Location: withBasePath(config.server.basePath, clean.pathname, clean.search), 'Set-Cookie': cookieHeader(accessToken, secure) },
        })
      }
      if (!token || !safeEqual(token, accessToken)) return unauthorized()
    }

    if (rateLimiter && p.startsWith('/api/') && !RATE_LIMIT_EXEMPT.some((prefix) => p.startsWith(prefix))) {
      const ip = clientIpFrom(req.headers, config.server.trustProxy, req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown')
      if (!rateLimiter(ip)) {
        throw new ApiError('RATE_LIMITED', '请求过于频繁，请稍后重试', 429)
      }
    }

    if (p === '/api/search' && req.method === 'POST') return await searchRoute(req)
    if (p === '/api/details' && req.method === 'POST') return await detailsRoute(req)
    if (p === '/api/network' && req.method === 'POST') return await networkRoute(req)
    if (p === '/api/lineage' && req.method === 'POST') return await lineageRoute(req)
    if (p === '/api/connect' && req.method === 'POST') return await connectRoute(req)
    if (p === '/api/translate' && req.method === 'POST') return await translateRoute(req)
    if (p === '/api/ai/session' && req.method === 'POST') return await aiSessionRoute(req, db, opencodeClient)
    if (p === '/api/ai/chat' && req.method === 'POST') return await aiChatRoute(req, opencodeClient, db)
    if (p === '/api/ai/history' && req.method === 'GET') return await aiHistoryRoute(req, opencodeClient)
    if (p === '/api/ai/abort' && req.method === 'POST') {
      const sessionId = new URL(req.url).searchParams.get('sessionId') ?? ''
      return await aiAbortRoute(opencodeClient, sessionId)
    }
    if (p === '/api/ai/stream' && req.method === 'GET') {
      const sessionId = new URL(req.url).searchParams.get('sessionId') ?? ''
      return await aiStreamRoute(req, opencodeClient, sessionId)
    }
    if (p === '/api/llm/status' && req.method === 'GET') return await llmStatusRoute()
    if (p.startsWith('/api/jobs/') && req.method === 'GET') return await jobRoute(req, p.split('/').pop()!)
    if (p.startsWith('/api/neighbors/') && req.method === 'GET') return await neighborsRoute(p.split('/').pop()!)
    if (p.startsWith('/api/reader/') && req.method === 'GET') {
      return await readerRoute(req, decodeURIComponent(p.slice('/api/reader/'.length)), db)
    }
    if (p.startsWith('/api/paper/session/') && p.endsWith('/search') && req.method === 'GET') {
      return await paperSearchRoute(req, db, INTERNAL_TOKEN)
    }
    const sectionMatch = p.match(/^\/api\/paper\/session\/([^/]+)\/section\/(\d+)$/)
    if (sectionMatch && req.method === 'GET') {
      return await paperSectionRoute(req, sectionMatch[1], Number(sectionMatch[2]), db, INTERNAL_TOKEN)
    }
    if (p.startsWith('/api/')) throw new ApiError('VALIDATION_FAILED', `未知接口: ${p}`, 404)
    return json({ error: { code: 'NOT_FOUND', message: 'static files are served by main.ts' } }, 404)
  } catch (e) {
    return handleError(e)
  }
}
