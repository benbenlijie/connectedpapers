import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  translate,
  hasBrowserTranslator,
  chunk,
  clearTranslationCache,
  type TranslateDeps,
} from './translator'

beforeEach(() => clearTranslationCache())

function makeDeps(over: Partial<TranslateDeps> = {}): TranslateDeps {
  return {
    fetchProviders: vi.fn(async () => [
      { name: 'browser', kind: 'browser' as const },
      { name: 'mtcode', kind: 'openai' as const, model: 'm' },
    ]),
    hasBrowserTranslator: () => true,
    browserTranslate: vi.fn(async (texts: string[]) => texts.map((t) => `zh:${t}`)),
    translateViaServer: vi.fn(async (texts: string[]) => texts.map((t) => `sv:${t}`)),
    ...over,
  }
}

describe('translate', () => {
  it('uses the browser provider first', async () => {
    const deps = makeDeps()
    const out = await translate(['hello'], 'zh', deps)
    expect(out).toEqual({ translations: ['zh:hello'], provider: 'browser' })
    expect(deps.translateViaServer).not.toHaveBeenCalled()
  })

  it('falls back to the server provider when the browser is unavailable', async () => {
    const deps = makeDeps({ hasBrowserTranslator: () => false })
    const out = await translate(['hello'], 'zh', deps)
    expect(out).toEqual({ translations: ['sv:hello'], provider: 'mtcode' })
  })

  it('advances to the next provider when one fails', async () => {
    const deps = makeDeps({
      fetchProviders: vi.fn(async () => [
        { name: 'a', kind: 'openai' as const },
        { name: 'b', kind: 'openai' as const },
      ]),
      hasBrowserTranslator: () => false,
      translateViaServer: vi.fn(async (texts: string[], _t: string, name: string) => {
        if (name === 'a') throw new Error('boom')
        return texts.map((t) => `b:${t}`)
      }),
    })
    const out = await translate(['x'], 'zh', deps)
    expect(out.provider).toBe('b')
    expect(out.translations).toEqual(['b:x'])
  })

  it('throws when all providers fail', async () => {
    const deps = makeDeps({
      fetchProviders: vi.fn(async () => [{ name: 'a', kind: 'openai' as const }]),
      hasBrowserTranslator: () => false,
      translateViaServer: vi.fn(async () => {
        throw new Error('nope')
      }),
    })
    await expect(translate(['x'], 'zh', deps)).rejects.toThrow('nope')
  })

  it('throws when no providers are configured', async () => {
    const deps = makeDeps({ fetchProviders: vi.fn(async () => []) })
    await expect(translate(['x'], 'zh', deps)).rejects.toThrow()
  })

  it('serves repeated text from the cache', async () => {
    const deps = makeDeps()
    await translate(['hello'], 'zh', deps)
    const out = await translate(['hello'], 'zh', deps)
    expect(out.provider).toBe('cache')
    expect(deps.browserTranslate).toHaveBeenCalledTimes(1)
  })

  it('only requests the missing segments on a mixed cache', async () => {
    const deps = makeDeps()
    await translate(['a'], 'zh', deps)
    const out = await translate(['a', 'b'], 'zh', deps)
    expect(out.translations).toEqual(['zh:a', 'zh:b'])
    expect(deps.browserTranslate).toHaveBeenLastCalledWith(['b'], 'zh')
  })
})

describe('chunk', () => {
  it('splits an array into fixed-size batches', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 3)).toEqual([])
  })
})

describe('hasBrowserTranslator', () => {
  it('detects a Translator.create function', () => {
    expect(hasBrowserTranslator({ Translator: { create: () => {} } })).toBe(true)
    expect(hasBrowserTranslator({})).toBe(false)
  })
})
