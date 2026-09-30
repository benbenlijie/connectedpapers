import { test, expect } from 'bun:test'
import { buildTranslateMessages, parseTranslationArray, chunkTexts, translateTexts } from './translate'
import type { ProviderConfig } from './llm'

test('buildTranslateMessages declares the target and carries the texts', () => {
  const messages = buildTranslateMessages('zh', ['Hello', 'World'], 'en')
  expect(messages[0].role).toBe('system')
  expect(messages[0].content).toContain('zh')
  const user = messages[1].content
  expect(user).toContain('Hello')
  expect(user).toContain('World')
})

test('parseTranslationArray accepts a plain JSON array', () => {
  expect(parseTranslationArray('["甲","乙"]', 2)).toEqual(['甲', '乙'])
})

test('parseTranslationArray strips code fences', () => {
  expect(parseTranslationArray('```json\n["甲","乙"]\n```', 2)).toEqual(['甲', '乙'])
})

test('parseTranslationArray rejects a length mismatch', () => {
  expect(() => parseTranslationArray('["甲"]', 2)).toThrow()
})

test('parseTranslationArray rejects non-arrays', () => {
  expect(() => parseTranslationArray('{"a":1}', 1)).toThrow()
  expect(() => parseTranslationArray('garbage', 1)).toThrow()
})

test('chunkTexts splits by char budget', () => {
  expect(chunkTexts(['aa', 'bb', 'cc'], 4, 10)).toEqual([['aa', 'bb'], ['cc']])
})

test('chunkTexts splits by item count', () => {
  expect(chunkTexts(['a', 'b', 'c'], 100, 2)).toEqual([['a', 'b'], ['c']])
})

test('chunkTexts keeps a single oversized text alone', () => {
  expect(chunkTexts(['aaaaaaa', 'b'], 4, 10)).toEqual([['aaaaaaa'], ['b']])
})

test('chunkTexts returns nothing for no input', () => {
  expect(chunkTexts([], 100, 10)).toEqual([])
})

test('translateTexts issues one chat call per sub-batch and preserves order', async () => {
  const realFetch = globalThis.fetch
  let calls = 0
  const seen: number[] = []
  globalThis.fetch = (async (_url: unknown, init: { body: string }) => {
    calls += 1
    const input = JSON.parse(JSON.parse(init.body).messages[1].content) as string[]
    seen.push(input.length)
    const content = JSON.stringify(input.map((t) => `zh:${t}`))
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
  }) as unknown as typeof fetch

  try {
    const provider: ProviderConfig = { name: 'p', kind: 'openai', baseUrl: 'https://x/v1', model: 'm' }
    const texts = ['a'.repeat(3000), 'b'.repeat(3000), 'c'.repeat(3000)]
    const out = await translateTexts(provider, texts, 'zh')
    expect(calls).toBe(3)
    expect(seen).toEqual([1, 1, 1])
    expect(out).toEqual(texts.map((t) => `zh:${t}`))
  } finally {
    globalThis.fetch = realFetch
  }
})
