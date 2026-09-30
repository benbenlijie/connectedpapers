import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  translate,
  hasBrowserTranslator,
  prepareBrowserTranslator,
  browserTranslate,
  chunk,
  cacheKey,
  clearTranslationCache,
  clearProviderCache,
  fetchProviders,
  flushTranslationCache,
  getCachedTranslation,
  loadTranslationCache,
  setTranslationCacheBudget,
  TRANSLATION_STORAGE_KEY,
  type TranslateDeps,
} from './translator'

beforeEach(() => {
  clearTranslationCache()
  clearProviderCache()
})
afterEach(() => setTranslationCacheBudget(4_000_000))

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

describe('prepareBrowserTranslator', () => {
  const globals = globalThis as { Translator?: unknown }
  afterEach(() => {
    delete globals.Translator
  })

  it('calls create synchronously so user activation is preserved', async () => {
    const create = vi.fn(async () => ({ translate: async (t: string) => `zh:${t}` }))
    globals.Translator = { create }
    prepareBrowserTranslator('xx-gesture')
    expect(create).toHaveBeenCalledTimes(1)
    const out = await browserTranslate(['a'], 'xx-gesture')
    expect(out).toEqual(['zh:a'])
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('retries create after a failure', async () => {
    let calls = 0
    const create = vi.fn(async () => {
      calls += 1
      if (calls === 1) throw new Error('no gesture')
      return { translate: async (t: string) => `zh:${t}` }
    })
    globals.Translator = { create }
    prepareBrowserTranslator('yy-retry')
    await expect(browserTranslate(['a'], 'yy-retry')).rejects.toThrow('no gesture')
    prepareBrowserTranslator('yy-retry')
    const out = await browserTranslate(['a'], 'yy-retry')
    expect(out).toEqual(['zh:a'])
    expect(create).toHaveBeenCalledTimes(2)
  })
})

describe('fetchProviders', () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('fetches the provider list once and reuses it across batches', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { providers: [{ name: 'mtcode', kind: 'openai' }] } }),
    }))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const first = await fetchProviders()
    const second = await fetchProviders()
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries after a failed fetch instead of caching the error', async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      if (calls === 1) return { ok: false, status: 429 }
      return { ok: true, json: async () => ({ data: { providers: [] } }) }
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    await expect(fetchProviders()).rejects.toThrow('429')
    await expect(fetchProviders()).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('translation persistence', () => {
  it('persists finished translations and rehydrates them after a reload', async () => {
    const deps = makeDeps()
    await translate(['hello'], 'zh', deps)
    flushTranslationCache()
    const raw = JSON.parse(localStorage.getItem(TRANSLATION_STORAGE_KEY) ?? '{}')
    expect(raw[cacheKey('zh', 'hello')]).toBe('zh:hello')

    clearTranslationCache()
    expect(getCachedTranslation('zh', 'hello')).toBeUndefined()

    localStorage.setItem(
      TRANSLATION_STORAGE_KEY,
      JSON.stringify({ [cacheKey('zh', 'hello')]: '你好' }),
    )
    loadTranslationCache()
    expect(getCachedTranslation('zh', 'hello')).toBe('你好')

    const out = await translate(['hello'], 'zh', deps)
    expect(out.provider).toBe('cache')
    expect(deps.browserTranslate).toHaveBeenCalledTimes(1)
  })

  it('serves from memory and does not throw when localStorage writes fail', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    try {
      const deps = makeDeps()
      const out = await translate(['hello'], 'zh', deps)
      expect(out.translations).toEqual(['zh:hello'])
      expect(() => flushTranslationCache()).not.toThrow()
      expect(getCachedTranslation('zh', 'hello')).toBe('zh:hello')
    } finally {
      spy.mockRestore()
    }
  })

  it('evicts the oldest entries once the budget is exceeded', () => {
    localStorage.setItem(
      TRANSLATION_STORAGE_KEY,
      JSON.stringify({ [cacheKey('zh', 'aaaa')]: 'AAAA', [cacheKey('zh', 'bbbb')]: 'BBBB' }),
    )
    loadTranslationCache()
    setTranslationCacheBudget(20)
    expect(getCachedTranslation('zh', 'aaaa')).toBeUndefined()
    expect(getCachedTranslation('zh', 'bbbb')).toBe('BBBB')
  })
})
