import { describe, it, expect, vi, afterEach } from 'vitest'
import type { AiClientEvent } from './aiChat'
import {
  ensureSession,
  sendMessage,
  abortSession,
  fetchHistory,
  parseSseChunk,
  streamEvents,
} from './aiAgent'

afterEach(() => vi.restoreAllMocks())

describe('parseSseChunk', () => {
  it('splits complete frames and keeps the remainder', () => {
    const { events, rest } = parseSseChunk('data: {"type":"text","text":"a"}\n\ndata: {"type":"done"}\n\npartial')
    expect(events).toEqual([{ type: 'text', text: 'a' }, { type: 'done' }])
    expect(rest).toBe('partial')
  })
})

describe('api calls', () => {
  it('ensureSession posts arxivId and returns the id', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: { sessionId: 's1' } }))))
    expect(await ensureSession('2401.00001')).toBe('s1')
  })

  it('sendMessage posts the payload', async () => {
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ data: { ok: true } })))
    vi.stubGlobal('fetch', spy)
    await sendMessage({ sessionId: 's1', message: 'q', excerpt: 'e', target: 'zh' })
    const body = JSON.parse(spy.mock.calls[0][1]?.body as string)
    expect(body).toMatchObject({ sessionId: 's1', message: 'q', excerpt: 'e', target: 'zh' })
  })

  it('fetchHistory returns mapped messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: { messages: [{ role: 'user', text: 'hi' }] } }))))
    expect(await fetchHistory('s1')).toEqual([{ role: 'user', text: 'hi' }])
  })

  it('abortSession posts with the encoded sessionId', async () => {
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', spy)
    await abortSession('s 1')
    expect(spy.mock.calls[0][0]).toBe('/api/ai/abort?sessionId=s%201')
    expect(spy.mock.calls[0][1]).toEqual({ method: 'POST' })
  })
})

describe('streamEvents', () => {
  it('parses frames into events and returns an unsubscribe fn', async () => {
    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"text","text":"a"}\n\n'))
        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body)))
    const events: AiClientEvent[] = []
    const unsubscribe = streamEvents('s1', (e) => events.push(e))
    expect(typeof unsubscribe).toBe('function')
    await vi.waitFor(() => expect(events).toEqual([{ type: 'text', text: 'a' }, { type: 'done' }]))
    unsubscribe()
  })
})
