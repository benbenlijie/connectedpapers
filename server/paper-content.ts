import type { Database } from 'bun:sqlite'
import { db as defaultDb } from './db'
import { getArxiv } from './arxiv'
import { pdfToText, sectionsFromPdfText, titleFromPdfText } from './pdf-text'
import { config, type PaperContentMode } from './config'
import { createLimiter, createRateLimiter } from './rateLimit'

export interface PaperSection {
  idx: number
  heading: string
  text: string
}

/** Where the sections came from: full LaTeXML HTML, the ar5iv mirror, text
 *  pulled out of the PDF, or just the abstract when nothing else worked. */
export type PaperSource = 'html' | 'ar5iv' | 'pdf' | 'abstract'

const SOURCES: readonly PaperSource[] = ['html', 'ar5iv', 'pdf', 'abstract']

export function isPaperSource(v: string): v is PaperSource {
  return (SOURCES as readonly string[]).includes(v)
}

export interface PaperContent {
  arxivId: string
  title: string
  sections: PaperSection[]
  source: PaperSource
  /**
   * The full text was deliberately not fetched, or not served, because this
   * instance is reachable by other people and arXiv's terms do not allow serving
   * their e-prints from a server. The reader links out to arXiv instead.
   */
  fullTextWithheld?: boolean
  /** Canonical abstract page, so a withholding instance has somewhere to point. */
  arxivUrl?: string
}

export interface AbstractFallback {
  title: string
  abstract: string
}

/** Version-specific URLs 404 when only another version was converted (`/html/xv2`
 *  while only v1 has HTML), so every source URL is version-less. */
export function stripVersion(arxivId: string): string {
  return arxivId.replace(/v\d+$/, '')
}

export function htmlUrl(arxivId: string): string {
  return `https://arxiv.org/html/${stripVersion(arxivId)}`
}

/** ar5iv converts older papers that arXiv's own HTML pipeline skipped. It
 *  serves no CORS header, so it is only usable from the server. */
export function ar5ivUrl(arxivId: string): string {
  return `https://ar5iv.labs.arxiv.org/html/${stripVersion(arxivId)}`
}

export function pdfUrl(arxivId: string): string {
  return `https://arxiv.org/pdf/${stripVersion(arxivId)}`
}

/** Canonical abstract page — where arXiv asks anyone pointing at an e-print to
 *  send readers. */
export function absUrl(arxivId: string): string {
  return `https://arxiv.org/abs/${stripVersion(arxivId)}`
}

const NEW_STYLE_ID = /^\d{4}\.\d{4,5}(v\d+)?$/
const OLD_STYLE_ID = /^[a-z-]+(\.[A-Za-z]{2})?\/\d{7}(v\d+)?$/

/** Accepts both arXiv id shapes (`2401.00001v2`, `math.GT/0309136`) and rejects
 *  anything that could escape the fixed arxiv.org URL path. */
export function isArxivId(id: string): boolean {
  return NEW_STYLE_ID.test(id) || OLD_STYLE_ID.test(id)
}

/** Extract title + sections from arXiv HTML using Bun's built-in HTMLRewriter. */
export async function extractSections(html: string): Promise<{ title: string; sections: PaperSection[] }> {
  const sections: PaperSection[] = []
  const stack: PaperSection[] = []
  let title = ''
  const top = (): PaperSection | null => stack[stack.length - 1] ?? null

  const rewriter = new HTMLRewriter()
    .on('title', {
      text(chunk) {
        title += chunk.text
      },
    })
    .on('section', {
      element(el) {
        const section: PaperSection = { idx: sections.length, heading: '', text: '' }
        sections.push(section)
        stack.push(section)
        el.onEndTag(() => {
          stack.pop()
        })
      },
    })
    .on('section h2, section h3', {
      text(chunk) {
        const current = top()
        if (current && current.heading.length < 120) current.heading += chunk.text
      },
    })
    .on('section p, section li', {
      text(chunk) {
        const current = top()
        if (current) current.text += chunk.text
      },
    })

  await rewriter.transform(new Response(html)).text()

  const cleaned = sections
    .map((s) => ({
      heading: s.heading.replace(/\s+/g, ' ').trim(),
      text: s.text.replace(/\s+/g, ' ').trim(),
    }))
    .filter((s) => s.text.length > 0)
    .map((s, i) => ({ idx: i, heading: s.heading, text: s.text }))

  return { title: title.replace(/\s+/g, ' ').trim(), sections: cleaned }
}

export function getCachedContent(
  arxivId: string,
  dbIn: Database = defaultDb,
  mode: PaperContentMode = config.arxiv.contentMode,
): PaperContent | null {
  const head = dbIn
    .query("select arxiv_id, title, source from paper_content where arxiv_id=? and expires_at > datetime('now')")
    .get(arxivId) as { arxiv_id: string; title: string; source: string } | null
  if (!head) return null
  // A withholding instance must not serve e-print text that is already on disk,
  // whether it stored it itself before the setting changed or was synced in.
  // Abstracts are CC0 metadata and stay readable either way.
  if (mode === 'off' && head.source !== 'abstract') return null
  const rows = dbIn
    .query('select idx, heading, text from paper_sections where arxiv_id=? order by idx')
    .all(arxivId) as { idx: number; heading: string; text: string }[]
  return {
    arxivId,
    title: head.title,
    source: isPaperSource(head.source) ? head.source : 'html',
    sections: rows,
  }
}

export function saveContent(content: PaperContent, ttlHours: number, dbIn: Database = defaultDb): void {
  const write = dbIn.transaction(() => {
    dbIn.run(
      `insert into paper_content (arxiv_id, title, source, fetched_at, expires_at)
       values (?,?,?,datetime('now'), datetime('now', ?))
       on conflict(arxiv_id) do update set title=excluded.title, source=excluded.source,
         fetched_at=datetime('now'), expires_at=excluded.expires_at`,
      [content.arxivId, content.title, content.source, `+${ttlHours} hours`],
    )
    dbIn.run('delete from paper_sections where arxiv_id=?', [content.arxivId])
    for (const s of content.sections) {
      dbIn.run('insert into paper_sections (arxiv_id, idx, heading, text) values (?,?,?,?)', [
        content.arxivId,
        s.idx,
        s.heading,
        s.text,
      ])
    }
  })
  write()
}

const USER_AGENT = { 'User-Agent': 'CiteDuo/0.1.0 (+https://github.com/benbenlijie/citeduo)' }
const HTML_TIMEOUT_MS = 20_000
const PDF_TIMEOUT_MS = 60_000

/** Politeness floor between content fetches; see config.arxiv.contentMinIntervalMs. */
const contentLimiter = createLimiter(config.arxiv.contentMinIntervalMs)
/** Hourly circuit breaker, so a loop over paper ids cannot look like a crawler. */
const contentBudget = createRateLimiter({ windowMs: 3_600_000, max: config.arxiv.contentMaxPerHour })

/**
 * Run one content fetch under the politeness floor and the hourly budget.
 * Exhausting the budget rejects, which callers treat like any other failed
 * source: try the next one, then fall back to the abstract.
 */
function fetchContent<T>(fn: () => Promise<T>): Promise<T> {
  if (!contentBudget('arxiv-content')) {
    return Promise.reject(new Error('arxiv content budget exhausted for this hour'))
  }
  return contentLimiter(fn)
}

/**
 * Sources that yield structured sections, tried in order. `html` is arXiv's own
 * LaTeXML build; the browser fetches it directly for full fidelity, but a paper
 * without it still lands here for the server-side fallbacks.
 */
const TEXT_SOURCES: readonly { source: PaperSource; url: (id: string) => string }[] = [
  { source: 'html', url: htmlUrl },
  { source: 'ar5iv', url: ar5ivUrl },
]

async function extractFromHtml(
  arxivId: string,
  source: PaperSource,
  url: string,
  fetchImpl: typeof fetch,
): Promise<PaperContent> {
  const res = await fetchContent(() =>
    fetchImpl(url, { headers: USER_AGENT, signal: AbortSignal.timeout(HTML_TIMEOUT_MS) }),
  )
  if (!res.ok) throw new Error(`${source} HTTP ${res.status}`)
  const { title, sections } = await extractSections(await res.text())
  // ar5iv answers 200 with a plain abstract page when it has no conversion, so
  // the section count — not the status code — decides whether we got a paper.
  if (sections.length === 0) throw new Error(`${source}: no sections`)
  return { arxivId, title, sections, source }
}

async function extractFromPdf(arxivId: string, fetchImpl: typeof fetch): Promise<PaperContent> {
  const res = await fetchContent(() =>
    fetchImpl(pdfUrl(arxivId), { headers: USER_AGENT, signal: AbortSignal.timeout(PDF_TIMEOUT_MS) }),
  )
  if (!res.ok) throw new Error(`pdf HTTP ${res.status}`)
  const text = await pdfToText(new Uint8Array(await res.arrayBuffer()))
  const sections = sectionsFromPdfText(text)
  if (sections.length === 0) throw new Error('pdf: no sections')
  return { arxivId, title: titleFromPdfText(text), sections, source: 'pdf' }
}

/**
 * Abstracts are CC0 metadata, so holding them in memory is fine, and it keeps a
 * withholding instance from re-asking arXiv on every reader page view. Small and
 * bounded on purpose: this is a cache, not a store.
 */
const ABSTRACT_MEMO_MAX = 500
const abstractMemo = new Map<string, PaperContent>()

function memoizeAbstract(content: PaperContent): PaperContent {
  if (abstractMemo.size >= ABSTRACT_MEMO_MAX) {
    const oldest = abstractMemo.keys().next().value
    if (oldest !== undefined) abstractMemo.delete(oldest)
  }
  abstractMemo.set(content.arxivId, content)
  return content
}

/**
 * Load a paper's text for search/AI/translation, walking every source that can
 * produce structured sections and caching the first hit:
 *
 *   cache → arXiv HTML → ar5iv → PDF text → abstract
 *
 * Every stage but the last swallows its error: a missing HTML build, a blocked
 * mirror or an unparseable PDF just means trying the next one.
 *
 * When `mode` is 'off' the content stages are skipped and nothing third-party is
 * written to disk: the caller gets the CC0 abstract plus a link to arXiv. See
 * `resolvePaperContentMode` in config.ts for why that is the default on an
 * instance other people can reach.
 */
export async function loadPaperContent(
  arxivId: string,
  fetchImpl: typeof fetch = fetch,
  dbIn: Database = defaultDb,
  abstractFallback: (id: string) => Promise<AbstractFallback> = getArxiv,
  ttlHours = 168,
  forceRefresh = false,
  mode: PaperContentMode = config.arxiv.contentMode,
): Promise<PaperContent> {
  if (!forceRefresh && mode === 'full') {
    const cached = getCachedContent(arxivId, dbIn, mode)
    if (cached) return cached
  }

  let fallbackPromise: Promise<AbstractFallback> | null = null
  const fallback = () => (fallbackPromise ??= abstractFallback(arxivId))

  if (mode === 'off') {
    if (!forceRefresh) {
      const memo = abstractMemo.get(arxivId)
      if (memo) return memo
    }
    const fb = await fallback()
    return memoizeAbstract({
      arxivId,
      title: fb.title,
      source: 'abstract',
      sections: [{ idx: 0, heading: 'Abstract', text: fb.abstract }],
      fullTextWithheld: true,
      arxivUrl: absUrl(arxivId),
    })
  }

  for (const { source, url } of TEXT_SOURCES) {
    try {
      const content = await extractFromHtml(arxivId, source, url(arxivId), fetchImpl)
      saveContent(content, ttlHours, dbIn)
      return content
    } catch {
      // try the next source
    }
  }

  try {
    const content = await extractFromPdf(arxivId, fetchImpl)
    try {
      const fb = await fallback()
      if (fb.title) content.title = fb.title
    } catch {
      // the PDF title guess stands on its own
    }
    saveContent(content, ttlHours, dbIn)
    return content
  } catch {
    // fall through to the abstract
  }

  const fb = await fallback()
  const content: PaperContent = {
    arxivId,
    title: fb.title,
    source: 'abstract',
    sections: [{ idx: 0, heading: 'Abstract', text: fb.abstract }],
    arxivUrl: absUrl(arxivId),
  }
  saveContent(content, ttlHours, dbIn)
  return content
}
