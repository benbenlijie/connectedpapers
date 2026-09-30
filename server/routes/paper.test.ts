import { test, expect, beforeEach } from 'bun:test'
import { openDb } from '../db'
import { setSession } from '../ai-sessions'
import { saveContent } from '../paper-content'
import { paperSearchRoute, paperSectionRoute } from './paper'

let db: ReturnType<typeof openDb>
const TOKEN = 'test-token'
beforeEach(() => {
  db = openDb(':memory:')
  saveContent(
    {
      arxivId: '2401.00001',
      title: 'T',
      source: 'html',
      sections: [
        { idx: 0, heading: 'Intro', text: 'Graph neural networks are popular in research.' },
        { idx: 1, heading: 'Methods', text: 'We optimize a transformer with dropout.' },
      ],
    },
    168,
    db,
  )
  setSession('2401.00001', 'sess-1', db)
})

function req(path: string, token = TOKEN): Request {
  return new Request(`http://localhost${path}`, { headers: { 'X-Internal-Token': token } })
}

test('search returns ranked hits for the session paper', async () => {
  const res = await paperSearchRoute(req('/api/paper/session/sess-1/search?q=transformer'), db, TOKEN)
  const body = (await res.json()) as { data: { hits: { sectionIdx: number }[] } }
  expect(res.status).toBe(200)
  expect(body.data.hits[0].sectionIdx).toBe(1)
})

test('search rejects a missing/incorrect token', async () => {
  const res = await paperSearchRoute(req('/api/paper/session/sess-1/search?q=x', 'wrong'), db, TOKEN)
  expect(res.status).toBe(401)
})

test('section returns the requested section text', async () => {
  const res = await paperSectionRoute(req('/api/paper/session/sess-1/section/0'), 'sess-1', 0, db, TOKEN)
  const body = (await res.json()) as { data: { section: { heading: string } } }
  expect(body.data.section.heading).toBe('Intro')
})

test('unknown session returns 404', async () => {
  const res = await paperSearchRoute(req('/api/paper/session/nope/search?q=x'), db, TOKEN)
  expect(res.status).toBe(404)
})

const HTML = `<!doctype html><html><head><title>Loaded Paper</title></head>
<body>
<section><h2>1 Intro</h2><p>A transformer model for sequence transduction tasks.</p></section>
</body></html>`

test('search lazily loads and caches content on a miss', async () => {
  const empty = openDb(':memory:')
  setSession('2401.00009', 'sess-load', empty)
  let calls = 0
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    calls += 1
    return new Response(HTML, { status: 200 })
  }) as unknown as typeof fetch
  try {
    const first = await paperSearchRoute(req('/api/paper/session/sess-load/search?q=transformer'), empty, TOKEN)
    expect(first.status).toBe(200)
    const body = (await first.json()) as { data: { hits: unknown[] } }
    expect(body.data.hits.length).toBeGreaterThan(0)
    expect(calls).toBe(1)

    const second = await paperSearchRoute(req('/api/paper/session/sess-load/search?q=transformer'), empty, TOKEN)
    expect(second.status).toBe(200)
    expect(calls).toBe(1)
  } finally {
    globalThis.fetch = realFetch
  }
})
