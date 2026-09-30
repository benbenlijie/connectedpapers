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
