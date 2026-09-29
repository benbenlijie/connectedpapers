import { readJson, json, ApiError } from '../errors'
import { loadProviders, chat, type ProviderConfig } from '../llm'
import { buildAiMessages, AI_ACTIONS, type AiAction } from '../ai'

function pickProvider(providers: ProviderConfig[], requested?: string): ProviderConfig {
  const usable = providers.filter((p) => p.kind === 'openai')
  if (requested) {
    const found = usable.find((p) => p.name === requested)
    if (!found) throw new ApiError('LLM_UNAVAILABLE', `provider ${requested} 不可用`, 503)
    return found
  }
  if (!usable[0]) throw new ApiError('LLM_UNAVAILABLE', '未配置可用的 AI provider', 503)
  return usable[0]
}

export async function aiRoute(req: Request): Promise<Response> {
  const body = await readJson<{
    provider?: string
    action?: string
    text?: string
    question?: string
    context?: string
    target?: string
  }>(req)

  const action = body.action as AiAction
  if (!AI_ACTIONS.includes(action)) {
    throw new ApiError('VALIDATION_FAILED', `action 必须是 ${AI_ACTIONS.join(' / ')}`)
  }
  const target = (body.target ?? 'zh').trim() || 'zh'
  const provider = pickProvider(loadProviders(), body.provider)

  let messages
  try {
    messages = buildAiMessages(action, { text: body.text, question: body.question, context: body.context }, target)
  } catch (e) {
    throw new ApiError('VALIDATION_FAILED', (e as Error).message)
  }

  let answer: string
  try {
    answer = await chat(provider, messages, { temperature: 0.2 })
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError('UPSTREAM_FAILED', (e as Error).message, 502)
  }

  return json({ data: { answer, provider: provider.name } })
}
