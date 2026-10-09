import type { Database } from 'bun:sqlite'
import { json, ApiError, handleError } from '../errors'
import { isArxivId, loadPaperContent } from '../paper-content'
import { config } from '../config'

/**
 * Full text of one paper, for the in-app reader's fallback path.
 *
 * The browser reads arXiv's HTML build directly (best fidelity: figures, math,
 * LaTeXML structure). When that is unavailable the reader calls this route,
 * which walks arXiv HTML → ar5iv → PDF text → abstract server-side — ar5iv has
 * no CORS header and PDF extraction needs a parser, so neither works in the
 * browser.
 */
export async function readerRoute(
  req: Request,
  arxivId: string,
  db: Database,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  try {
    if (!isArxivId(arxivId)) throw new ApiError('VALIDATION_FAILED', `无效的 arXiv id: ${arxivId}`, 400)

    const url = new URL(req.url)
    const refresh = url.searchParams.get('refresh') === '1'
    const content = await loadPaperContent(
      arxivId,
      fetchImpl,
      db,
      undefined,
      config.ai.contentTtlHours,
      refresh,
    )
    return json({ data: content })
  } catch (e) {
    return handleError(e)
  }
}
