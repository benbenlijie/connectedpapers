import { API_BASE } from './apiBase'
import type { AiClientEvent } from './aiChat'

export interface HistoryMessage {
  role: 'user' | 'assistant'
  text: string
}

export function parseSseChunk(buffer: string): { events: AiClientEvent[]; rest: string } {
  const frames = buffer.split('\n\n')
  const rest = frames.pop() ?? ''
  const events: AiClientEvent[] = []
  for (const frame of frames) {
    const line = frame.split('\n').find((l) => l.startsWith('data:'))
    if (!line) continue
    try {
      events.push(JSON.parse(line.slice(5).trim()) as AiClientEvent)
    } catch {
      // ignore malformed frames
    }
  }
  return { events, rest }
}

export async function ensureSession(arxivId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/ai/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arxivId }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message ?? `创建会话失败: ${res.status}`)
  return body.data.sessionId as string
}

export async function sendMessage(input: {
  sessionId: string
  message: string
  excerpt?: string
  target: string
}): Promise<void> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `发送失败: ${res.status}`)
  }
}

export async function abortSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/ai/abort?sessionId=${encodeURIComponent(sessionId)}`, { method: 'POST' })
}

export async function fetchHistory(sessionId: string): Promise<HistoryMessage[]> {
  const res = await fetch(`${API_BASE}/ai/history?sessionId=${encodeURIComponent(sessionId)}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message ?? `加载历史失败: ${res.status}`)
  return body.data.messages as HistoryMessage[]
}

/** Subscribe to the session event stream; returns an unsubscribe function. */
export function streamEvents(
  sessionId: string,
  onEvent: (event: AiClientEvent) => void,
  onError?: (err: unknown) => void,
): () => void {
  const controller = new AbortController()
  ;(async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/stream?sessionId=${encodeURIComponent(sessionId)}`, {
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error(`事件流失败: ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parsed = parseSseChunk(buffer)
        buffer = parsed.rest
        parsed.events.forEach(onEvent)
      }
    } catch (e) {
      if (!controller.signal.aborted) onError?.(e)
    }
  })()
  return () => controller.abort()
}
