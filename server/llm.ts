import { ApiError } from './errors'

export type ProviderKind = 'openai' | 'browser'

export interface ProviderConfig {
  name: string
  kind: ProviderKind
  baseUrl?: string
  apiKey?: string
  model?: string
}

export interface PublicProvider {
  name: string
  kind: ProviderKind
  model?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Parse the `LLM_PROVIDERS` JSON array. Invalid entries are dropped; order is priority. */
export function parseProviders(raw: string | undefined): ProviderConfig[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const seen = new Set<string>()
  const out: ProviderConfig[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const p = item as Record<string, unknown>
    const name = typeof p.name === 'string' ? p.name.trim() : ''
    const kind = p.kind
    if (!name || (kind !== 'openai' && kind !== 'browser')) continue
    if (seen.has(name)) continue

    const baseUrl = typeof p.baseUrl === 'string' ? p.baseUrl.trim() : undefined
    const model = typeof p.model === 'string' ? p.model.trim() : undefined
    if (kind === 'openai' && (!baseUrl || !model)) continue

    seen.add(name)
    out.push({
      name,
      kind,
      baseUrl,
      model,
      apiKey: typeof p.apiKey === 'string' && p.apiKey.trim() ? p.apiKey.trim() : undefined,
    })
  }
  return out
}

export function loadProviders(): ProviderConfig[] {
  return parseProviders(Bun.env.LLM_PROVIDERS)
}

export function toPublicProvider(p: ProviderConfig): PublicProvider {
  return { name: p.name, kind: p.kind, ...(p.model ? { model: p.model } : {}) }
}

export async function chat(
  provider: ProviderConfig,
  messages: ChatMessage[],
  opts: { timeoutMs?: number; temperature?: number } = {},
): Promise<string> {
  if (provider.kind !== 'openai' || !provider.baseUrl || !provider.model) {
    throw new ApiError('LLM_UNAVAILABLE', `provider ${provider.name} 不支持 chat 调用`, 503)
  }
  const url = `${provider.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: opts.temperature ?? 0,
        stream: false,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new ApiError('UPSTREAM_FAILED', `provider ${provider.name} 返回 ${res.status}`, 502)
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new ApiError('UPSTREAM_FAILED', `provider ${provider.name} 响应缺少内容`, 502)
    }
    return content
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError('UPSTREAM_FAILED', `provider ${provider.name} 调用失败: ${(e as Error).message}`, 502)
  } finally {
    clearTimeout(timer)
  }
}
