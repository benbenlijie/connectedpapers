import { test, expect, beforeEach } from 'bun:test'
import { openDb } from './db'
import {
  absUrl,
  ar5ivUrl,
  extractSections,
  getCachedContent,
  htmlUrl,
  isArxivId,
  loadPaperContent,
  pdfUrl,
  saveContent,
} from './paper-content'
import { pdfFixtureResponse } from './test-fixtures'

let db: ReturnType<typeof openDb>
beforeEach(() => { db = openDb(':memory:') })

const HTML = `<!doctype html><html><head><title>Attention Is All You Need</title></head>
<body>
<section><h2>1 Introduction</h2><p>The dominant sequence transduction models are based on complex recurrent networks.</p></section>
<section><h2>2 Model Architecture</h2><p>Most competitive neural sequence models have an encoder-decoder structure.</p></section>
</body></html>`

test('extractSections pulls title and section text', async () => {
  const { title, sections } = await extractSections(HTML)
  expect(title).toBe('Attention Is All You Need')
  expect(sections).toHaveLength(2)
  expect(sections[0].heading).toContain('Introduction')
  expect(sections[0].text).toContain('sequence transduction')
  expect(sections[1].idx).toBe(1)
})

test('extractSections attributes text correctly across nested sections', async () => {
  const nested = `<!doctype html><html><head><title>Nested</title></head>
<body>
<section id="S1"><h2>1 Outer</h2><p>Outer before intro.</p>
<section id="S1.SS1"><h3>1.1 Inner</h3><p>Inner body text.</p></section>
<p>Outer after inner.</p></section>
</body></html>`
  const { sections } = await extractSections(nested)
  const outer = sections.find((s) => s.heading.includes('Outer'))!
  const inner = sections.find((s) => s.heading.includes('Inner'))!
  expect(inner.text).toContain('Inner body text')
  expect(inner.text).not.toContain('Outer after inner')
  expect(outer.text).toContain('Outer before intro')
  expect(outer.text).toContain('Outer after inner')
  expect(outer.text).not.toContain('Inner body text')
})

test('loadPaperContent uses the cache when fresh', async () => {
  saveContent(
    { arxivId: '2401.00001', title: 'T', sections: [{ idx: 0, heading: 'H', text: 'body' }], source: 'html' },
    168,
    db,
  )
  const calls: string[] = []
  const fetchImpl = (async (url: string) => {
    calls.push(url)
    return new Response(HTML, { status: 200 })
  }) as unknown as typeof fetch
  const out = await loadPaperContent('2401.00001', fetchImpl, db)
  expect(out.title).toBe('T')
  expect(calls).toHaveLength(0)
})

test('loadPaperContent fetches and caches on a miss', async () => {
  const fetchImpl = (async () => new Response(HTML, { status: 200 })) as unknown as typeof fetch
  const out = await loadPaperContent('2401.00002', fetchImpl, db)
  expect(out.sections.length).toBe(2)
  expect(getCachedContent('2401.00002', db)?.sections.length).toBe(2)
})

test('loadPaperContent falls back to the abstract when HTML fails', async () => {
  const fetchImpl = (async () => new Response('nope', { status: 404 })) as unknown as typeof fetch
  const out = await loadPaperContent('2401.00003', fetchImpl, db, async () => ({
    title: 'Fallback Paper',
    abstract: 'An abstract sentence about graphs.',
  }))
  expect(out.source).toBe('abstract')
  expect(out.sections[0].text).toContain('graphs')
})

test('loadPaperContent falls back to ar5iv when arXiv answers without sections', async () => {
  // arXiv serves 200 for some papers with no LaTeXML body; the section count is
  // what tells us we got a real paper, not the status code.
  const seen: string[] = []
  const fetchImpl = (async (url: string) => {
    seen.push(String(url))
    if (String(url).includes('ar5iv')) return new Response(HTML, { status: 200 })
    return new Response('<html><body><p>no html build</p></body></html>', { status: 200 })
  }) as unknown as typeof fetch

  const out = await loadPaperContent('2401.00010', fetchImpl, db, async () => ({ title: 'x', abstract: 'y' }))
  expect(out.source).toBe('ar5iv')
  expect(out.sections).toHaveLength(2)
  expect(seen[0]).toContain('https://arxiv.org/html/2401.00010')
  expect(seen[1]).toContain('https://ar5iv.labs.arxiv.org/html/2401.00010')
  expect(getCachedContent('2401.00010', db)?.source).toBe('ar5iv')
})

test('loadPaperContent falls back to PDF text when no HTML source converts', async () => {
  const fetchImpl = (async (url: string) => {
    if (String(url).includes('/pdf/')) return pdfFixtureResponse()
    return new Response('nope', { status: 404 })
  }) as unknown as typeof fetch

  const out = await loadPaperContent('2401.00011', fetchImpl, db, async () => ({
    title: 'Title From The arXiv API',
    abstract: 'A.',
  }))
  expect(out.source).toBe('pdf')
  expect(out.title).toBe('Title From The arXiv API')
  expect(out.sections.map((s) => s.heading)).toContain('Introduction')
  expect(out.sections.find((s) => s.heading === 'Introduction')?.text).toContain('Graph neural networks')
  expect(getCachedContent('2401.00011', db)?.source).toBe('pdf')
})

test('loadPaperContent keeps the PDF title guess when the abstract source is down', async () => {
  const fetchImpl = (async (url: string) => {
    if (String(url).includes('/pdf/')) return pdfFixtureResponse()
    return new Response('nope', { status: 404 })
  }) as unknown as typeof fetch

  const out = await loadPaperContent('2401.00012', fetchImpl, db, async () => {
    throw new Error('offline')
  })
  expect(out.source).toBe('pdf')
  expect(out.title).toBe('Mini Paper Title')
})

test('loadPaperContent can bypass the cache on refresh', async () => {
  saveContent({ arxivId: '2401.00013', title: 'stale', sections: [{ idx: 0, heading: 'A', text: 'b' }], source: 'abstract' }, 168, db)
  const fetchImpl = (async () => new Response(HTML, { status: 200 })) as unknown as typeof fetch

  const cached = await loadPaperContent('2401.00013', fetchImpl, db)
  expect(cached.title).toBe('stale')

  const fresh = await loadPaperContent('2401.00013', fetchImpl, db, undefined, 168, true)
  expect(fresh.source).toBe('html')
  expect(fresh.title).toBe('Attention Is All You Need')
})

test('paper source urls are version-less and validated', () => {
  expect(htmlUrl('2401.00001v2')).toBe('https://arxiv.org/html/2401.00001')
  expect(ar5ivUrl('2401.00001v2')).toBe('https://ar5iv.labs.arxiv.org/html/2401.00001')
  expect(pdfUrl('2401.00001v3')).toBe('https://arxiv.org/pdf/2401.00001')
  expect(absUrl('2401.00001v3')).toBe('https://arxiv.org/abs/2401.00001')
  expect(isArxivId('2401.00001')).toBe(true)
  expect(isArxivId('2401.00001v2')).toBe(true)
  expect(isArxivId('math.GT/0309136')).toBe(true)
  expect(isArxivId('../../etc/passwd')).toBe(false)
  expect(isArxivId('2401.00001/../x')).toBe(false)
})

test("'off' mode never touches a content page, links out, and stores nothing", async () => {
  const calls: string[] = []
  const fetchImpl = (async (url: string) => {
    calls.push(String(url))
    return new Response(HTML, { status: 200 })
  }) as unknown as typeof fetch

  const out = await loadPaperContent(
    '2401.00020',
    fetchImpl,
    db,
    async () => ({ title: 'Withheld Paper', abstract: 'Only the abstract.' }),
    168,
    false,
    'off',
  )

  expect(calls).toHaveLength(0)
  expect(out.source).toBe('abstract')
  expect(out.sections[0].text).toContain('Only the abstract')
  expect(out.fullTextWithheld).toBe(true)
  expect(out.arxivUrl).toBe('https://arxiv.org/abs/2401.00020')
  // Nothing third-party may be written down on a withholding instance.
  expect(getCachedContent('2401.00020', db)).toBeNull()
})

test("'off' mode remembers the abstract instead of re-asking arXiv every view", async () => {
  let asked = 0
  const fetchImpl = (async () => {
    throw new Error('content must not be fetched')
  }) as unknown as typeof fetch
  const fallback = async () => {
    asked++
    return { title: 'T', abstract: 'A.' }
  }

  const first = await loadPaperContent('2401.00021', fetchImpl, db, fallback, 168, false, 'off')
  const second = await loadPaperContent('2401.00021', fetchImpl, db, fallback, 168, false, 'off')
  expect(first).toEqual(second)
  expect(asked).toBe(1)
})

test("'off' mode hides full text already on disk but still serves abstracts", () => {
  saveContent(
    { arxivId: '2401.00022', title: 'T', sections: [{ idx: 0, heading: 'H', text: 'body' }], source: 'html' },
    168,
    db,
  )
  expect(getCachedContent('2401.00022', db, 'full')?.source).toBe('html')
  expect(getCachedContent('2401.00022', db, 'off')).toBeNull()

  saveContent(
    { arxivId: '2401.00023', title: 'A', sections: [{ idx: 0, heading: 'Abstract', text: 'abs' }], source: 'abstract' },
    168,
    db,
  )
  expect(getCachedContent('2401.00023', db, 'off')?.source).toBe('abstract')
})
