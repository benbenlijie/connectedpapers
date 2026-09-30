import type { Database } from 'bun:sqlite'
import { json, ApiError, handleError } from '../errors'
import { getArxivBySession } from '../ai-sessions'
import { getCachedContent, loadPaperContent } from '../paper-content'
import { rankSections } from '../paper-search'
import { config } from '../config'
import { safeEqual } from '../auth'

function checkToken(req: Request, expected?: string): void {
  if (!expected) return
  if (!safeEqual(req.headers.get('x-internal-token') ?? '', expected)) {
    throw new ApiError('VALIDATION_FAILED', 'invalid internal token', 401)
  }
}

export async function paperSearchRoute(
  req: Request,
  db: Database,
  token?: string,
): Promise<Response> {
  try {
    checkToken(req, token)
    const url = new URL(req.url)
    const sessionId = url.pathname.split('/')[4]
    const q = url.searchParams.get('q') ?? ''
    const arxivId = getArxivBySession(sessionId, db)
    if (!arxivId) throw new ApiError('PAPER_NOT_FOUND', `unknown session ${sessionId}`, 404)
    let content = getCachedContent(arxivId, db)
    if (!content) content = await loadPaperContent(arxivId, fetch, db, undefined, config.ai.contentTtlHours)
    const hits = rankSections(content.sections, q, 8)
    return json({ data: { arxivId, title: content.title, hits } })
  } catch (e) {
    return handleError(e)
  }
}

export async function paperSectionRoute(
  req: Request,
  sessionId: string,
  idx: number,
  db: Database,
  token?: string,
): Promise<Response> {
  try {
    checkToken(req, token)
    const arxivId = getArxivBySession(sessionId, db)
    if (!arxivId) throw new ApiError('PAPER_NOT_FOUND', `unknown session ${sessionId}`, 404)
    let content = getCachedContent(arxivId, db)
    if (!content) content = await loadPaperContent(arxivId, fetch, db, undefined, config.ai.contentTtlHours)
    const section = content.sections.find((s) => s.idx === idx)
    if (!section) throw new ApiError('PAPER_NOT_FOUND', `no section ${idx}`, 404)
    return json({ data: { arxivId, section } })
  } catch (e) {
    return handleError(e)
  }
}
