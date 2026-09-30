export type AiClientEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; status: 'start' | 'done'; detail?: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

interface RawEvent {
  type?: string
  properties?: Record<string, any>
}

function detailFromInput(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined
  const v = Object.values(input as Record<string, unknown>)[0]
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return undefined
}

/**
 * Map one opencode SSE event to a client event, or null when irrelevant.
 * Streaming text arrives as `message.part.delta` (shape captured in the spike,
 * findings §3) — a delta, not a cumulative snapshot.
 */
export function normalizeOpencodeEvent(sessionId: string, event: RawEvent): AiClientEvent | null {
  const props = event.properties ?? {}
  const evSession = props.sessionID ?? props.part?.sessionID
  if (event.type === 'session.idle') {
    return { type: 'done' }
  }
  if (event.type === 'session.error') {
    if (evSession !== undefined && evSession !== sessionId) return null
    return { type: 'error', message: props.error?.message ?? 'AI 运行出错' }
  }
  if (event.type === 'message.part.delta') {
    if (evSession !== sessionId || props.field !== 'text' || typeof props.delta !== 'string') return null
    return { type: 'text', text: props.delta }
  }
  if (event.type === 'message.part.updated') {
    if (evSession !== sessionId) return null
    const part = props.part
    if (!part || part.type !== 'tool' || typeof part.tool !== 'string') return null
    const status = part.state?.status
    if (status === 'completed') return { type: 'tool', name: part.tool, status: 'done' }
    if (status === 'running' || status === 'pending') {
      return { type: 'tool', name: part.tool, status: 'start', detail: detailFromInput(part.state?.input) }
    }
  }
  return null
}

export function serializeClientEvent(event: AiClientEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}
