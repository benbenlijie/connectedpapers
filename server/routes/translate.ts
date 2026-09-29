import { readJson, json, ApiError } from '../errors'
import { loadProviders, type ProviderConfig } from '../llm'
import { translateTexts } from '../translate'
import { translationHash, getCachedTranslations, cacheTranslations } from '../translation-cache'

const MAX_TEXTS = 200
const MAX_CHARS = 20000

function pickProvider(providers: ProviderConfig[], requested?: string): ProviderConfig | null {
  const usable = providers.filter((p) => p.kind === 'openai')
  if (requested) {
    const found = usable.find((p) => p.name === requested)
    if (!found) throw new ApiError('LLM_UNAVAILABLE', `provider ${requested} 不可用`, 503)
    return found
  }
  return usable[0] ?? null
}

export async function translateRoute(req: Request): Promise<Response> {
  const body = await readJson<{ provider?: string; texts?: unknown; target?: string; source?: string }>(req)
  const texts = Array.isArray(body.texts)
    ? (body.texts.filter((t): t is string => typeof t === 'string' && t.trim().length > 0))
    : []
  if (texts.length === 0) throw new ApiError('VALIDATION_FAILED', 'texts 不能为空')
  if (texts.length > MAX_TEXTS) throw new ApiError('VALIDATION_FAILED', `一次最多翻译 ${MAX_TEXTS} 段`)

  const totalChars = texts.reduce((n, t) => n + t.length, 0)
  if (totalChars > MAX_CHARS) throw new ApiError('VALIDATION_FAILED', `一次最多翻译 ${MAX_CHARS} 字符`)

  const target = (body.target ?? 'zh').trim() || 'zh'
  const provider = pickProvider(loadProviders(), body.provider)
  if (!provider) throw new ApiError('LLM_UNAVAILABLE', '未配置可用的翻译 provider', 503)

  const hashes = texts.map((t) => translationHash(target, t))
  const cached = getCachedTranslations(hashes)
  const translations = hashes.map((h) => cached.get(h) ?? '')
  const missing = hashes.map((h, i) => (cached.has(h) ? -1 : i)).filter((i) => i >= 0)

  if (missing.length > 0) {
    let fresh: string[]
    try {
      fresh = await translateTexts(provider, missing.map((i) => texts[i]), target, body.source)
    } catch (e) {
      if (e instanceof ApiError) throw e
      throw new ApiError('TRANSLATE_FAILED', (e as Error).message, 502)
    }
    missing.forEach((idx, k) => {
      translations[idx] = fresh[k]
    })
    cacheTranslations(
      missing.map((idx, k) => ({
        hash: hashes[idx],
        target,
        source: texts[idx],
        translated: fresh[k],
        provider: provider.name,
      })),
    )
  }

  return json({ data: { translations, provider: provider.name, cached: missing.length === 0 } })
}
