import { test, expect, beforeEach } from 'bun:test'
import { openDb } from './db'
import { extractSections, loadPaperContent, getCachedContent, saveContent } from './paper-content'

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
