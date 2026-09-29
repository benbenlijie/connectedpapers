const API = '/api'

export interface PublicProvider {
  name: string
  kind: 'openai' | 'browser'
  model?: string
}

export interface TranslateResult {
  translations: string[]
  provider: string
}

export interface TranslateDeps {
  fetchProviders: () => Promise<PublicProvider[]>
  hasBrowserTranslator: () => boolean
  browserTranslate: (texts: string[], target: string) => Promise<string[]>
  translateViaServer: (texts: string[], target: string, provider: string) => Promise<string[]>
}

const cache = new Map<string, string>()

export function clearTranslationCache(): void {
  cache.clear()
}

export function cacheKey(target: string, text: string): string {
  return `${target}\n${text}`
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function fetchProviders(): Promise<PublicProvider[]> {
  const res = await fetch(`${API}/llm/status`)
  if (!res.ok) throw new Error(`加载翻译 provider 失败: ${res.status}`)
  const body = await res.json()
  return (body?.data?.providers ?? []) as PublicProvider[]
}

interface BrowserTranslator {
  translate: (text: string) => Promise<string>
}

interface TranslatorApi {
  create: (options: unknown) => Promise<BrowserTranslator>
}

function translatorApi(scope: unknown = globalThis): TranslatorApi | null {
  const t = (scope as { Translator?: TranslatorApi } | null)?.Translator
  return typeof t?.create === 'function' ? t : null
}

export function hasBrowserTranslator(scope: unknown = globalThis): boolean {
  return translatorApi(scope) !== null
}

let translatorPromise: Promise<BrowserTranslator> | null = null
let translatorTarget: string | null = null

/**
 * Start creating the browser translator while a user gesture is still active.
 * `Translator.create()` throws NotAllowedError when the language pack is
 * "downloadable"/"downloading" (the model downloads on first use) and no
 * transient activation is present, so a click handler must call this
 * synchronously before any `await`.
 */
export function prepareBrowserTranslator(target: string): void {
  if (translatorPromise && translatorTarget === target) return
  const api = translatorApi()
  if (!api) return
  translatorTarget = target
  const promise = api.create({ sourceLanguage: 'en', targetLanguage: target })
  translatorPromise = promise
  promise.catch(() => {
    if (translatorPromise === promise) {
      translatorPromise = null
      translatorTarget = null
    }
  })
}

export async function browserTranslate(texts: string[], target: string): Promise<string[]> {
  if (!hasBrowserTranslator()) throw new Error('浏览器不支持内置翻译')
  prepareBrowserTranslator(target)
  const translator = await translatorPromise!
  const out: string[] = []
  for (const text of texts) out.push(await translator.translate(text))
  return out
}

export async function translateViaServer(
  texts: string[],
  target: string,
  provider: string,
): Promise<string[]> {
  const res = await fetch(`${API}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, texts, target }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message ?? `翻译失败: ${res.status}`)
  return body.data.translations as string[]
}

const defaultDeps: TranslateDeps = {
  fetchProviders,
  hasBrowserTranslator: () => hasBrowserTranslator(),
  browserTranslate,
  translateViaServer,
}

/**
 * Translate a batch, walking the configured providers in order. Cached segments
 * are served without a call; only misses hit a provider. Throws only when every
 * candidate fails.
 */
export async function translate(
  texts: string[],
  target: string,
  deps: TranslateDeps = defaultDeps,
): Promise<TranslateResult> {
  const results = texts.map((t) => cache.get(cacheKey(target, t)) ?? '')
  const missing = texts.map((t, i) => (cache.has(cacheKey(target, t)) ? -1 : i)).filter((i) => i >= 0)
  if (missing.length === 0) return { translations: results, provider: 'cache' }

  const providers = await deps.fetchProviders()
  if (providers.length === 0) throw new Error('未配置可用的翻译 provider')

  const pending = missing.map((i) => texts[i])
  let lastError: unknown = null
  for (const provider of providers) {
    try {
      const out =
        provider.kind === 'browser'
          ? deps.hasBrowserTranslator()
            ? await deps.browserTranslate(pending, target)
            : fail('浏览器不支持内置翻译')
          : await deps.translateViaServer(pending, target, provider.name)
      if (out.length !== pending.length) throw new Error('译文数量与输入不匹配')
      missing.forEach((idx, k) => {
        results[idx] = out[k]
        cache.set(cacheKey(target, texts[idx]), out[k])
      })
      return { translations: results, provider: provider.name }
    } catch (e) {
      lastError = e
    }
  }
  throw lastError instanceof Error ? lastError : new Error('所有翻译 provider 均失败')
}

function fail(message: string): never {
  throw new Error(message)
}
