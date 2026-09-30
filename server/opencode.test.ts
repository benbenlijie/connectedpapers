import { test, expect, afterEach } from 'bun:test'
import { createOpencodeClient, type OpencodeClient } from './opencode'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

function client(): OpencodeClient {
  return createOpencodeClient('http://127.0.0.1:4096')
}

test('createSession posts to /session and returns the id', async () => {
  let url = ''
  let body: unknown
  globalThis.fetch = (async (u: string, init: RequestInit) => {
    url = String(u); body = JSON.parse(String(init.body))
    return new Response(JSON.stringify({ id: 'sess-1' }), { status: 200 })
  }) as unknown as typeof fetch
  const id = await client().createSession('paper:2401.00001')
  expect(id).toBe('sess-1')
  expect(url).toBe('http://127.0.0.1:4096/session')
  expect(body).toEqual({ title: 'paper:2401.00001' })
})

test('promptAsync posts the agent, model and text part', async () => {
  let body: any
  globalThis.fetch = (async (_u: string, init: RequestInit) => {
    body = JSON.parse(String(init.body))
    return new Response('', { status: 204 })
  }) as unknown as typeof fetch
  await client().promptAsync('sess-1', 'agent', 'prov', 'model', 'hello')
  expect(body.agent).toBe('agent')
  expect(body.model).toEqual({ providerID: 'prov', modelID: 'model' })
  expect(body.parts).toEqual([{ type: 'text', text: 'hello' }])
})

test('messages and abort hit the right paths', async () => {
  const seen: string[] = []
  globalThis.fetch = (async (u: string) => {
    seen.push(String(u))
    return new Response(JSON.stringify([]), { status: 200 })
  }) as unknown as typeof fetch
  await client().messages('sess-1')
  await client().abort('sess-1')
  expect(seen[0]).toBe('http://127.0.0.1:4096/session/sess-1/message')
  expect(seen[1]).toBe('http://127.0.0.1:4096/session/sess-1/abort')
})

test('eventStream returns the raw response body stream', async () => {
  globalThis.fetch = (async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(new TextEncoder().encode('data: {"type":"x"}\n\n')); c.close() },
    })
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  }) as unknown as typeof fetch
  const res = await client().eventStream()
  expect(res.ok).toBe(true)
  expect(await res.text()).toContain('"type":"x"')
})
