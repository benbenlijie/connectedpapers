import type { PaperSection } from './paper-content'

/**
 * PDF → plain text for papers that have no arXiv HTML build.
 *
 * This is the last structured source before the abstract fallback. Extraction
 * uses `unpdf` (a serverless pdf.js build) so the server needs no poppler/Java
 * install; it is imported lazily so a missing dependency degrades to the
 * abstract fallback instead of breaking boot.
 */

/** Guard against pathological files: bigger PDFs are skipped, not parsed. */
export const MAX_PDF_BYTES = 40 * 1024 * 1024
export const PDF_PARSE_TIMEOUT_MS = 60_000

export class PdfTextUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PdfTextUnavailable'
  }
}

type Unpdf = typeof import('unpdf')

let loader: Promise<Unpdf> | null = null

/** Load `unpdf` once; a failure is not cached so a later `bun install` can fix it. */
export function loadUnpdf(importer: () => Promise<Unpdf> = () => import('unpdf')): Promise<Unpdf> {
  if (!loader) {
    loader = importer().catch((e) => {
      loader = null
      throw new PdfTextUnavailable(
        `unpdf 不可用（请运行 bun install）: ${e instanceof Error ? e.message : String(e)}`,
      )
    })
  }
  return loader
}

/**
 * Extract text from a PDF byte buffer. Every expected failure (missing dep,
 * oversized file, scanned PDF, timeout) throws `PdfTextUnavailable`, so callers
 * can treat it as "this source does not work" rather than a crash.
 */
export async function pdfToText(
  pdf: Uint8Array,
  opts: { timeoutMs?: number; importer?: () => Promise<Unpdf> } = {},
): Promise<string> {
  if (pdf.byteLength === 0) throw new PdfTextUnavailable('empty PDF')
  if (pdf.byteLength > MAX_PDF_BYTES) throw new PdfTextUnavailable(`PDF too large (${pdf.byteLength} bytes)`)

  const timeoutMs = opts.timeoutMs ?? PDF_PARSE_TIMEOUT_MS
  const unpdf = opts.importer ? await opts.importer() : await loadUnpdf()

  // pdf.js keeps a worker/handle alive; without a timeout a malformed PDF can
  // hang the request forever.
  const doc = await withTimeout(unpdf.getDocumentProxy(pdf), timeoutMs, 'getDocumentProxy')
  try {
    const extracted = await withTimeout(unpdf.extractText(doc, { mergePages: true }), timeoutMs, 'extractText')
    const text = Array.isArray(extracted.text) ? extracted.text.join('\n') : extracted.text
    if (!text || text.trim().length === 0) throw new PdfTextUnavailable('no text layer (scanned PDF?)')
    return text
  } finally {
    try {
      // Releases page resources; unpdf hands back the document proxy without
      // its loading task, so this is as close to teardown as we can get.
      await doc.cleanup()
    } catch {
      // Releasing resources is best-effort; never mask the extraction result.
    }
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  // Mark the losing promise handled so a late rejection does not surface as an
  // unhandled rejection after we have already given up on it.
  void p.catch(() => {})
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new PdfTextUnavailable(`${label} timed out after ${ms}ms`)), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const MAX_HEADING_CHARS = 72
// `I. INTRODUCTION`, `1 Introduction`, `2.3. Method`, `A. Programmability`
const NUMBERED_HEADING = /^(?:\d{1,2}(?:\.\d+)*\.?|[IVXLC]{1,6}\.|[A-Z]\.)\s+(\S.*)$/
// Unnumbered but conventional top-level sections.
const NAMED_HEADING =
  /^(abstract|references?|acknowledge?ments?|conclusions?|introduction|related works?|background|appendix)\b[\s:.—-]*$/i
const ABSTRACT_INLINE = /^abstract\b[\s:.—–-]*(.*)$/i
const PAGE_NUMBER = /^\d{1,4}$/
const CAPTION = /^(figure|fig\.|table|algorithm|listing)\s*\d+/i
const AUTHOR_LIKE = /\bet al\.|\b(university|department|institute|laboratory)\b|@/i

/**
 * Turn raw PDF text into `PaperSection`s.
 *
 * pdf.js gives one string per *line* with no blank lines, so structure has to
 * come from heading detection. Anything before the first heading (title,
 * authors, affiliations) becomes section 0 so it stays translatable.
 */
export function sectionsFromPdfText(text: string, maxSections = 80): PaperSection[] {
  const lines = normalizeLines(text)
  if (lines.length === 0) return []

  const sections: PaperSection[] = []
  let heading = ''
  let buffer: string[] = []

  const flush = () => {
    const body = joinLines(buffer)
    if (heading || body) sections.push({ idx: sections.length, heading, text: body })
    buffer = []
  }

  for (const line of lines) {
    const parsed = headingOf(line)
    if (parsed) {
      flush()
      heading = parsed.heading
      if (parsed.rest) buffer.push(parsed.rest)
      continue
    }
    if (CAPTION.test(line)) continue
    buffer.push(line)
  }
  flush()

  return sections
    // A heading with no body of its own (a parent section whose text lives in
    // its subsections) is still a useful outline/search anchor, so only fully
    // empty sections are dropped.
    .filter((s) => s.text.length > 0 || s.heading.length > 0)
    .slice(0, maxSections)
    .map((s, i) => ({ ...s, idx: i }))
}

interface HeadingLine {
  heading: string
  /** Text that continues on the heading's own line, e.g. `Abstract— …`. */
  rest?: string
}

const COPYRIGHT_LINE = /^(arxiv|doi|https?:|www\.|©|\d{4}\s+ieee|xxx-x-xxxx)/i

/**
 * Best-effort title, used only when the PDF is the only source *and* the arXiv
 * API title could not be fetched: the lines before the first heading, minus the
 * copyright/DOI furniture, capped at two lines (titles rarely run longer).
 */
export function titleFromPdfText(text: string, maxChars = 200): string {
  const parts: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line) continue
    if (headingOf(line)) break
    if (COPYRIGHT_LINE.test(line) || line.includes('@')) continue
    parts.push(line)
    if (parts.length >= 2) break
  }
  return parts.join(' ').slice(0, maxChars).trim()
}

/** Heading for a line, or null when the line is ordinary body text. */
function headingOf(line: string): HeadingLine | null {
  if (line.length > MAX_HEADING_CHARS) return null
  if (PAGE_NUMBER.test(line)) return null

  const abstract = ABSTRACT_INLINE.exec(line)
  if (abstract) return { heading: 'Abstract', rest: abstract[1]?.trim() || undefined }

  if (NAMED_HEADING.test(line)) return { heading: titleCase(line.replace(/[\s.:—–-]+$/, '')) }

  const numbered = NUMBERED_HEADING.exec(line)
  if (!numbered) return null
  const title = numbered[1].replace(/[\s.:—–-]+$/, '')
  if (!title || /[.;,]$/.test(title) || AUTHOR_LIKE.test(title)) return null
  const letters = title.replace(/[^A-Za-z]/g, '')
  const upper = letters.match(/[A-Z]/g)?.length ?? 0
  const upperRatio = upper / Math.max(1, letters.length)
  // `I. INTRODUCTION` (all caps) or a short title like `A. Programmability`.
  // Long mixed-case lines are sentences that merely start with a number.
  if (upperRatio < 0.7 && title.split(/\s+/).length > 6) return null
  return { heading: titleCase(title) }
}

function titleCase(s: string): string {
  if (s === s.toUpperCase() && s.length > 3) {
    return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
  }
  return s
}

function normalizeLines(text: string): string[] {
  const raw = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)

  // Running headers/footers repeat on every page. Drop short lines that show up
  // three or more times; body sentences essentially never do.
  const counts = new Map<string, number>()
  for (const l of raw) if (l.length <= 90) counts.set(l, (counts.get(l) ?? 0) + 1)
  return raw.filter((l) => (counts.get(l) ?? 0) < 3).filter((l) => !PAGE_NUMBER.test(l))
}

/** Re-join PDF line breaks: de-hyphenate words and keep sentences as one line. */
function joinLines(lines: string[]): string {
  let out = ''
  for (const line of lines) {
    if (out === '') {
      out = line
      continue
    }
    if (/-$/.test(out) && /^[a-z]/.test(line)) out = `${out.slice(0, -1)}${line}`
    else out = `${out} ${line}`
  }
  return out.trim()
}
