import { test, expect, beforeEach } from 'bun:test'
import { openDb } from '../db'
import { getSession } from '../ai-sessions'
import { aiSessionRoute, aiChatRoute, aiHistoryRoute } from './ai'
import { createOpencodeClient } from '../opencode'

let db: ReturnType<typeof openDb>
const provider = { name: 'mtcode', kind: 'openai' as const, baseUrl: 'http://up/v1', apiKey: 'k', model: 'm' }

beforeEach(() => { db = openDb(':memory:') })

test('aiSessionRoute creates and persists a session id', async () => {
  const client = createOpencodeClient('http://oc')
  ;(client.createSession as any) = async (title: string) => `new-${title}`
  const res = await aiSessionRoute(
    new Request('http://x/api/ai/session', { method: 'POST', body: JSON.stringify({ arxivId: '2401.00001' }) }),
    db,
    client,
  )
  const body = (await res.json()) as any
  expect(body.data.sessionId).toBe('new-paper:2401.00001')
  expect(getSession('2401.00001', db)).toBe('new-paper:2401.00001')
})

test('aiSessionRoute reuses an existing session', async () => {
  const client = createOpencodeClient('http://oc')
  let created = 0
  ;(client.createSession as any) = async () => { created += 1; return 'x' }
  const make = () => new Request('http://x/api/ai/session', { method: 'POST', body: JSON.stringify({ arxivId: 'p1' }) })
  await aiSessionRoute(make(), db, client)
  await aiSessionRoute(make(), db, client)
  expect(created).toBe(1)
})

test('aiChatRoute forwards the composed prompt to opencode', async () => {
  const client = createOpencodeClient('http://oc')
  let sent = ''
  ;(client.promptAsync as any) = async (_s: string, _a: string, _p: string, _m: string, text: string) => { sent = text }
  const res = await aiChatRoute(
    new Request('http://x/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's1', message: 'What is the loss?', excerpt: 'L = ...', target: 'zh', provider }),
    }),
    client,
  )
  expect(res.status).toBe(200)
  expect(sent).toContain('What is the loss?')
  expect(sent).toContain('L = ...')
  expect(sent).toContain('zh')
})

test('aiHistoryRoute maps messages to chat items', async () => {
  const client = createOpencodeClient('http://oc')
  ;(client.messages as any) = async () => [
    { info: { role: 'user' }, parts: [{ type: 'text', text: 'hi' }] },
    { info: { role: 'assistant' }, parts: [{ type: 'text', text: 'hello' }] },
  ]
  const res = await aiHistoryRoute(new Request('http://x/api/ai/history?sessionId=s1'), client)
  const body = (await res.json()) as any
  expect(body.data.messages).toEqual([
    { role: 'user', text: 'hi' },
    { role: 'assistant', text: 'hello' },
  ])
})
