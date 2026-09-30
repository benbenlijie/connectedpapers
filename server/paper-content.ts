import type { Database } from 'bun:sqlite'
import { db as defaultDb } from './db'
import { getArxiv } from './arxiv'

export interface PaperSection {
  idx: number
  heading: string
  text: string
}

export interface PaperContent {
  arxivId: string
  title: string
  sections: PaperSection[]
  source: 'html' | 'abstract'
}

export interface AbstractFallback {
  title: string
  abstract: string
}

export function htmlUrl(arxivId: string): string {
  return `https://arxiv.org/html/${arxivId.replace(/v\d+$/, '')}`
}

/** Extract title + sections from arXiv HTML using Bun's built-in HTMLRewriter. */
export async function extractSections(html: string): Promise<{ title: string; sections: PaperSection[] }> {
  const sections: PaperSection[] = []
  let title = ''
  let current: PaperSection | null = null

  const rewriter = new HTMLRewriter()
    .on('title', {
      text(chunk) {
        title += chunk.text
      },
    })
    .on('section', {
      element() {
        current = { idx: sections.length, heading: '', text: '' }
        sections.push(current)
      },
    })
    .on('section h2, section h3', {
      text(chunk) {
        if (current && current.heading.length < 120) current.heading += chunk.text
      },
    })
    .on('section p, section li', {
      text(chunk) {
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

export function getCachedContent(arxivId: string, dbIn: Database = defaultDb): PaperContent | null {
  const head = dbIn
    .query("select arxiv_id, title, source from paper_content where arxiv_id=? and expires_at > datetime('now')")
    .get(arxivId) as { arxiv_id: string; title: string; source: string } | null
  if (!head) return null
  const rows = dbIn
    .query('select idx, heading, text from paper_sections where arxiv_id=? order by idx')
    .all(arxivId) as { idx: number; heading: string; text: string }[]
  if (rows.length === 0) return null
  return {
    arxivId,
    title: head.title,
    source: head.source === 'abstract' ? 'abstract' : 'html',
    sections: rows,
  }
}

export function saveContent(content: PaperContent, ttlHours: number, dbIn: Database = defaultDb): void {
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
}

export async function loadPaperContent(
  arxivId: string,
  fetchImpl: typeof fetch = fetch,
  dbIn: Database = defaultDb,
  abstractFallback: (id: string) => Promise<AbstractFallback> = getArxiv,
  ttlHours = 168,
): Promise<PaperContent> {
  const cached = getCachedContent(arxivId, dbIn)
  if (cached) return cached

  try {
    const res = await fetchImpl(htmlUrl(arxivId), { headers: { 'User-Agent': 'Academic-Paper-Explorer/1.0' } })
    if (!res.ok) throw new Error(`arXiv HTML ${res.status}`)
    const html = await res.text()
    const { title, sections } = await extractSections(html)
    if (sections.length === 0) throw new Error('no sections extracted')
    const content: PaperContent = { arxivId, title, sections, source: 'html' }
    saveContent(content, ttlHours, dbIn)
    return content
  } catch {
    const fb = await abstractFallback(arxivId)
    const content: PaperContent = {
      arxivId,
      title: fb.title,
      source: 'abstract',
      sections: [{ idx: 0, heading: 'Abstract', text: fb.abstract }],
    }
    saveContent(content, ttlHours, dbIn)
    return content
  }
}
