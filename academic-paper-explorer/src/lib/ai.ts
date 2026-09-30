import { API_BASE } from './apiBase'
import { fetchProviders, type PublicProvider } from './translator'

export type AiAction = 'explain' | 'summarize' | 'ask'

export interface AiInput {
  text?: string
  question?: string
  context?: string
}

export interface AiResult {
  answer: string
  provider: string
}

export interface AiDeps {
  fetchProviders: () => Promise<PublicProvider[]>
  askViaServer: (provider: string, action: AiAction, input: AiInput, target: string) => Promise<string>
}

export async function askViaServer(
  provider: string,
  action: AiAction,
  input: AiInput,
  target: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, action, target, ...input }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message ?? `AI 请求失败: ${res.status}`)
  return body.data.answer as string
}

/**
 * Ask the AI, walking the configured openai providers in order (the browser
 * translator cannot answer questions). Throws only when every candidate fails.
 */
export async function askAi(
  action: AiAction,
  input: AiInput,
  target: string,
  deps: AiDeps = { fetchProviders, askViaServer },
): Promise<AiResult> {
  const providers = (await deps.fetchProviders()).filter((p) => p.kind === 'openai')
  if (providers.length === 0) throw new Error('未配置可用的 AI provider（问答需要后端 LLM）')

  let lastError: unknown = null
  for (const provider of providers) {
    try {
      const answer = await deps.askViaServer(provider.name, action, input, target)
      return { answer, provider: provider.name }
    } catch (e) {
      lastError = e
    }
  }
  throw lastError instanceof Error ? lastError : new Error('所有 AI provider 均失败')
}
