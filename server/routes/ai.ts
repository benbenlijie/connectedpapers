import type { Database } from 'bun:sqlite'
import { readJson, json, ApiError } from '../errors'
import { loadProviders, type ProviderConfig } from '../llm'
import { getSession, setSession } from '../ai-sessions'
import { OPENCODE_AGENT } from '../opencode-config'
import { normalizeOpencodeEvent, serializeClientEvent } from '../ai-events'
import type { OpencodeClient } from '../opencode'

function firstOpenaiProvider(requested?: string | ProviderConfig) {
  if (requested && typeof requested !== 'string') return requested
  const usable = loadProviders().filter((p) => p.kind === 'openai')
  if (requested) {
    const found = usable.find((p) => p.name === requested)
    if (!found) throw new ApiError('LLM_UNAVAILABLE', `provider ${requested} 不可用`, 503)
    return found
  }
  if (!usable[0]) throw new ApiError('LLM_UNAVAILABLE', '未配置可用的 AI provider', 503)
  return usable[0]
}

export async function aiSessionRoute(req: Request, db: Database, client: OpencodeClient): Promise<Response> {
  const body = await readJson<{ arxivId?: string }>(req)
  const arxivId = body.arxivId?.trim()
  if (!arxivId) throw new ApiError('VALIDATION_FAILED', 'arxivId 不能为空')
  let sessionId = getSession(arxivId, db)
  if (!sessionId) {
    sessionId = await client.createSession(`paper:${arxivId}`)
    setSession(arxivId, sessionId, db)
  }
  return json({ data: { sessionId } })
}

export async function aiChatRoute(req: Request, client: OpencodeClient): Promise<Response> {
  const body = await readJson<{ sessionId?: string; message?: string; excerpt?: string; target?: string; provider?: string }>(req)
  const sessionId = body.sessionId?.trim()
  const message = body.message?.trim()
  if (!sessionId) throw new ApiError('VALIDATION_FAILED', 'sessionId 不能为空')
  if (!message) throw new ApiError('VALIDATION_FAILED', 'message 不能为空')
  const provider = firstOpenaiProvider(body.provider)
  const target = (body.target ?? 'zh').trim() || 'zh'
  const excerpt = body.excerpt?.trim()
  const text = [
    excerpt ? `Selected excerpt:\n${excerpt}\n` : '',
    `Answer in ${target}.`,
    `Question: ${message}`,
  ]
    .filter(Boolean)
    .join('\n')
  try {
    await client.promptAsync(sessionId, OPENCODE_AGENT, provider.name, provider.model ?? '', text)
  } catch (e) {
    throw new ApiError('UPSTREAM_FAILED', (e as Error).message, 502)
  }
  return json({ data: { ok: true } })
}

export async function aiHistoryRoute(req: Request, client: OpencodeClient): Promise<Response> {
  const sessionId = new URL(req.url).searchParams.get('sessionId')
  if (!sessionId) throw new ApiError('VALIDATION_FAILED', 'sessionId 不能为空')
  const raw = (await client.messages(sessionId)) as {
    info?: { role?: string }
    parts?: { type?: string; text?: string }[]
  }[]
  const messages = raw
    .map((m) => ({
      role: m.info?.role === 'user' ? 'user' : 'assistant',
      text: (m.parts ?? []).filter((p) => p.type === 'text').map((p) => p.text ?? '').join(''),
    }))
    .filter((m) => m.text.trim().length > 0)
  return json({ data: { messages } })
}

export async function aiStreamRoute(req: Request, client: OpencodeClient, sessionId: string): Promise<Response> {
  if (!sessionId) throw new ApiError('VALIDATION_FAILED', 'sessionId 不能为空')
  const upstream = await client.eventStream()
  if (!upstream.ok || !upstream.body) {
    throw new ApiError('UPSTREAM_FAILED', `opencode event stream ${upstream.status}`, 502)
  }
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader()
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split('\n\n')
          buffer = frames.pop() ?? ''
          for (const frame of frames) {
            const line = frame.split('\n').find((l) => l.startsWith('data:'))
            if (!line) continue
            let parsed: unknown
            try {
              parsed = JSON.parse(line.slice(5).trim())
            } catch {
              continue
            }
            const event = normalizeOpencodeEvent(sessionId, parsed as { type?: string; properties?: Record<string, unknown> })
            if (event) controller.enqueue(encoder.encode(serializeClientEvent(event)))
          }
        }
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function aiAbortRoute(client: OpencodeClient, sessionId: string): Promise<Response> {
  if (!sessionId) throw new ApiError('VALIDATION_FAILED', 'sessionId 不能为空')
  await client.abort(sessionId)
  return json({ data: { ok: true } })
}
