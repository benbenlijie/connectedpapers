import { config } from './config'
import { json, handleError, ApiError } from './errors'
import { recoverJobs } from './jobs'
import { searchRoute } from './routes/search'
import { detailsRoute } from './routes/details'
import { networkRoute } from './routes/network'
import { jobRoute } from './routes/jobs'
import { translateRoute } from './routes/translate'
import { llmStatusRoute } from './routes/llm'

const WEB_DIST = new URL('../academic-paper-explorer/dist', import.meta.url).pathname

async function serveStatic(pathname: string): Promise<Response> {
  const safe = pathname === '/' ? '/index.html' : pathname
  if (safe.includes('..')) return json({ error: { code: 'VALIDATION_FAILED', message: 'bad path' } }, 400)
  let file = Bun.file(WEB_DIST + safe)
  if (!(await file.exists())) file = Bun.file(WEB_DIST + '/index.html') // SPA fallback
  if (!(await file.exists())) return json({ error: { code: 'INTERNAL_SERVER_ERROR', message: "frontend not built (run 'bun run build:web')" } }, 404)
  return new Response(file)
}

recoverJobs()

const server = Bun.serve({
  port: config.server.port,
  hostname: config.server.hostname,
  async fetch(req) {
    const url = new URL(req.url)
    const p = url.pathname
    try {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
      if (p === '/api/search' && req.method === 'POST') return await searchRoute(req)
      if (p === '/api/details' && req.method === 'POST') return await detailsRoute(req)
      if (p === '/api/network' && req.method === 'POST') return await networkRoute(req)
      if (p === '/api/translate' && req.method === 'POST') return await translateRoute(req)
      if (p === '/api/llm/status' && req.method === 'GET') return await llmStatusRoute()
      if (p.startsWith('/api/jobs/') && req.method === 'GET') return await jobRoute(req, p.split('/').pop()!)
      if (p.startsWith('/api/')) throw new ApiError('VALIDATION_FAILED', `未知接口: ${p}`, 404)
      return await serveStatic(p)
    } catch (e) {
      return handleError(e)
    }
  },
})

console.log(`ConnectedPapers local server → http://${server.hostname}:${server.port}`)
