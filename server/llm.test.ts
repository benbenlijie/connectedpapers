import { test, expect, afterEach } from 'bun:test'
import { parseProviders, toPublicProvider, chat, type ProviderConfig } from './llm'

const realFetch = globalThis.fetch

const provider: ProviderConfig = {
  name: 'mtcode',
  kind: 'openai',
  baseUrl: 'https://api.example.com/v1',
  apiKey: 'sk-x',
  model: 'mtcode/deepseek-flash',
}

afterEach(() => {
  globalThis.fetch = realFetch
})

test('parseProviders keeps valid entries in order', () => {
  const out = parseProviders(JSON.stringify([
    { name: 'mtcode', kind: 'openai', baseUrl: 'https://a/v1', apiKey: 'k', model: 'm' },
    { name: 'browser', kind: 'browser' },
  ]))
  expect(out.map((p) => p.name)).toEqual(['mtcode', 'browser'])
  expect(out[0].model).toBe('m')
})

test('parseProviders drops invalid entries and non-arrays', () => {
  const raw = JSON.stringify([
    { kind: 'openai', baseUrl: 'https://a/v1', model: 'm' }, // no name
    { name: 'bad', kind: 'nope' }, // bad kind
    { name: 'nobase', kind: 'openai', model: 'm' }, // missing baseUrl
    'nope',
    { name: 'ok', kind: 'openai', baseUrl: 'https://b/v1', model: 'm2' },
  ])
  expect(parseProviders(raw).map((p) => p.name)).toEqual(['ok'])
  expect(parseProviders('not json')).toEqual([])
  expect(parseProviders(undefined)).toEqual([])
  expect(parseProviders('{"a":1}')).toEqual([])
})

test('parseProviders dedupes by name (first wins)', () => {
  const raw = JSON.stringify([
    { name: 'x', kind: 'openai', baseUrl: 'https://1/v1', model: 'm1' },
    { name: 'x', kind: 'openai', baseUrl: 'https://2/v1', model: 'm2' },
  ])
  const out = parseProviders(raw)
  expect(out).toHaveLength(1)
  expect(out[0].baseUrl).toBe('https://1/v1')
})

test('toPublicProvider hides secrets', () => {
  expect(toPublicProvider(provider)).toEqual({ name: 'mtcode', kind: 'openai', model: 'mtcode/deepseek-flash' })
})

test('chat posts to chat/completions with a bearer key', async () => {
  let captured: { url: string; init: any } | null = null
  globalThis.fetch = (async (url: any, init: any) => {
    captured = { url: String(url), init }
    return new Response(JSON.stringify({ choices: [{ message: { content: 'hi' } }] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }) as any

  const out = await chat(provider, [{ role: 'user', content: 'x' }])
  expect(out).toBe('hi')
  expect(captured!.url).toBe('https://api.example.com/v1/chat/completions')
  expect(captured!.init.headers.Authorization).toBe('Bearer sk-x')
  expect(JSON.parse(captured!.init.body).model).toBe('mtcode/deepseek-flash')
})

test('chat omits Authorization when no key (e.g. ollama)', async () => {
  let init: any = null
  globalThis.fetch = (async (_url: any, i: any) => {
    init = i
    return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })
  }) as any
  await chat({ name: 'ollama', kind: 'openai', baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen' }, [])
  expect(init.headers.Authorization).toBeUndefined()
})

test('chat throws on a non-ok response', async () => {
  globalThis.fetch = (async () => new Response('boom', { status: 500 })) as any
  await expect(chat(provider, [])).rejects.toThrow()
})

test('chat rejects non-openai providers', async () => {
  await expect(chat({ name: 'browser', kind: 'browser' }, [])).rejects.toThrow()
})
