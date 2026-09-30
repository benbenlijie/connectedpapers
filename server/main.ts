import { config } from './config'
import { json, handleError, ApiError } from './errors'
import { recoverJobs } from './jobs'
import { searchRoute } from './routes/search'
import { detailsRoute } from './routes/details'
import { networkRoute } from './routes/network'
import { jobRoute } from './routes/jobs'
import { translateRoute } from './routes/translate'
import { llmStatusRoute } from './routes/llm'
import { aiRoute } from './routes/ai'
import { neighborsRoute } from './routes/neighbors'
import { cookieHeader, clientIpFrom, extractToken, safeEqual, withBasePath } from './auth'
import { createRateLimiter } from './rateLimit'

const WEB_DIST = new URL('../academic-paper-explorer/dist', import.meta.url).pathname

const ACCESS_TOKEN = config.server.accessToken
const rateLimiter =
  config.server.rateLimitPerMin > 0
    ? createRateLimiter({ windowMs: 60_000, max: config.server.rateLimitPerMin })
    : null

function unauthorized(): Response {
  const body = `<!doctype html><meta charset="utf-8"><title>需要访问口令</title>
<body style="font-family:system-ui;background:#111827;color:#e5e7eb;padding:3rem">
<h2>需要访问口令</h2>
<p>请在地址后加上 <code>?token=你的口令</code> 打开一次，之后会记住（Cookie）。</p>
</body>`
  return new Response(body, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

function safeRequestIp(req: Request): string {
  try {
    return server.requestIP(req)?.address ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

async function serveStatic(pathname: string): Promise<Response> {
  const safe = pathname === '/' ? '/index.html' : pathname
  if (safe.includes('..')) return json({ error: { code: 'VALIDATION_FAILED', message: 'bad path' } }, 400)
  let file = Bun.file(WEB_DIST + safe)
  if (!(await file.exists())) file = Bun.file(WEB_DIST + '/index.html') // SPA fallback
  if (!(await file.exists())) return json({ error: { code: 'INTERNAL_SERVER_ERROR', message: "frontend not built (run 'bun run build:web')" } }, 404)
  return new Response(file)
}

recoverJobs()

let server: ReturnType<typeof Bun.serve>
server = Bun.serve({
  port: config.server.port,
  hostname: config.server.hostname,
  async fetch(req) {
    const url = new URL(req.url)
    const p = url.pathname
    try {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

      if (ACCESS_TOKEN) {
        const { token, fromQuery } = extractToken(req.headers, url)
        if (fromQuery && token && safeEqual(token, ACCESS_TOKEN)) {
          const clean = new URL(url)
          clean.searchParams.delete('token')
          const secure = url.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
          return new Response(null, {
            status: 302,
            headers: {
              Location: withBasePath(config.server.basePath, clean.pathname, clean.search),
              'Set-Cookie': cookieHeader(ACCESS_TOKEN, secure),
            },
          })
        }
        if (!token || !safeEqual(token, ACCESS_TOKEN)) return unauthorized()
      }

      if (rateLimiter && p.startsWith('/api/')) {
        const ip = clientIpFrom(req.headers, config.server.trustProxy, safeRequestIp(req))
        if (!rateLimiter(ip)) {
          throw new ApiError('RATE_LIMITED', '请求过于频繁，请稍后重试', 429)
        }
      }

      if (p === '/api/search' && req.method === 'POST') return await searchRoute(req)
      if (p === '/api/details' && req.method === 'POST') return await detailsRoute(req)
      if (p === '/api/network' && req.method === 'POST') return await networkRoute(req)
      if (p === '/api/translate' && req.method === 'POST') return await translateRoute(req)
      if (p === '/api/ai' && req.method === 'POST') return await aiRoute(req)
      if (p === '/api/llm/status' && req.method === 'GET') return await llmStatusRoute()
      if (p.startsWith('/api/jobs/') && req.method === 'GET') return await jobRoute(req, p.split('/').pop()!)
      if (p.startsWith('/api/neighbors/') && req.method === 'GET') return await neighborsRoute(p.split('/').pop()!)
      if (p.startsWith('/api/')) throw new ApiError('VALIDATION_FAILED', `未知接口: ${p}`, 404)
      return await serveStatic(p)
    } catch (e) {
      return handleError(e)
    }
  },
})

console.log(`ConnectedPapers local server → http://${server.hostname}:${server.port}`)
