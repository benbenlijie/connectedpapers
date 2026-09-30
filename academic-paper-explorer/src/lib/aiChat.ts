export type AiClientEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; status: 'start' | 'done'; detail?: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface ToolActivity {
  name: string
  status: 'start' | 'done'
  detail?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  tools: ToolActivity[]
  error?: string
}

export interface ChatState {
  messages: ChatMessage[]
  streaming: boolean
}

export function emptyChat(): ChatState {
  return { messages: [], streaming: false }
}

let counter = 0
function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now()}-${counter}`
}

export function startUserTurn(state: ChatState, text: string): ChatState {
  return {
    streaming: true,
    messages: [
      ...state.messages,
      { id: nextId('u'), role: 'user', text, tools: [] },
      { id: nextId('a'), role: 'assistant', text: '', tools: [] },
    ],
  }
}

function updateLastAssistant(state: ChatState, fn: (m: ChatMessage) => ChatMessage): ChatState {
  const messages = state.messages.slice()
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      messages[i] = fn(messages[i])
      break
    }
  }
  return { ...state, messages }
}

export function reduceChat(state: ChatState, event: AiClientEvent): ChatState {
  switch (event.type) {
    case 'text':
      return updateLastAssistant(state, (m) => ({ ...m, text: m.text + event.text }))
    case 'tool': {
      const activity: ToolActivity = { name: event.name, status: event.status, detail: event.detail }
      return updateLastAssistant(state, (m) => {
        const tools = m.tools.slice()
        const last = tools[tools.length - 1]
        // opencode emits `pending` then `running` as two consecutive `start`
        // events for one call (findings §3): replace, don't duplicate.
        if (activity.status === 'start' && last && last.name === activity.name && last.status === 'start') {
          tools[tools.length - 1] = activity
        } else {
          tools.push(activity)
        }
        return { ...m, tools }
      })
    }
    case 'error':
      return {
        streaming: false,
        messages: updateLastAssistant(state, (m) => ({ ...m, error: event.message })).messages,
      }
    case 'done':
      return { ...state, streaming: false }
  }
}
