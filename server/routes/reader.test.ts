import { test, expect, beforeEach } from 'bun:test'
import { openDb } from '../db'
import { saveContent } from '../paper-content'
import { readerRoute } from './reader'

let db: ReturnType<typeof openDb>
beforeEach(() => {
  db = openDb(':memory:')
})

const HTML = `<!doctype html><html><head><title>Fresh Title</title></head>
<body><section><h2>1 Introduction</h2><p>Graph neural networks are popular.</p></section></body></html>`

function req(path: string): Request {
  return new Request(`http://localhost${path}`)
}

test('reader returns the cached paper content', async () => {
  saveContent(
    {
      arxivId: '2401.00001',
      title: 'Cached Title',
      source: 'pdf',
      sections: [{ idx: 0, heading: 'Introduction', text: 'Cached body.' }],
    },
    168,
    db,
  )
  const fetchImpl = (async () => {
    throw new Error('must not fetch')
  }) as unknown as typeof fetch

  const res = await readerRoute(req('/api/reader/2401.00001'), '2401.00001', db, fetchImpl)
  const body = (await res.json()) as { data: { title: string; source: string } }
  expect(res.status).toBe(200)
  expect(body.data.title).toBe('Cached Title')
  expect(body.data.source).toBe('pdf')
})

test('reader refetches when refresh=1 is passed', async () => {
  saveContent(
    {
      arxivId: '2401.00001',
      title: 'Stale Title',
      source: 'abstract',
      sections: [{ idx: 0, heading: 'Abstract', text: 'stale' }],
    },
    168,
    db,
  )
  const fetchImpl = (async () => new Response(HTML, { status: 200 })) as unknown as typeof fetch

  const res = await readerRoute(req('/api/reader/2401.00001?refresh=1'), '2401.00001', db, fetchImpl)
  const body = (await res.json()) as { data: { title: string; source: string } }
  expect(res.status).toBe(200)
  expect(body.data.title).toBe('Fresh Title')
  expect(body.data.source).toBe('html')
})

test('reader rejects a malformed arXiv id without touching the network', async () => {
  const fetchImpl = (async () => {
    throw new Error('must not fetch')
  }) as unknown as typeof fetch

  const res = await readerRoute(req('/api/reader/..%2F..%2Fetc'), '../../etc', db, fetchImpl)
  const body = (await res.json()) as { error: { code: string } }
  expect(res.status).toBe(400)
  expect(body.error.code).toBe('VALIDATION_FAILED')
})
