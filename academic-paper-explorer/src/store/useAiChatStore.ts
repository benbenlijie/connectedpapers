import { create } from 'zustand'
import {
  emptyChat,
  reduceChat,
  startUserTurn,
  type AiClientEvent,
  type ChatState,
} from '../lib/aiChat'

export const AI_CHAT_STORAGE_KEY = 'connectedpapers.aiChat.sessions.v1'

interface AiChatStore {
  sessions: Record<string, string>
  chats: Record<string, ChatState>
  setSession: (arxivId: string, sessionId: string) => void
  setHistory: (arxivId: string, messages: ChatState['messages']) => void
  beginTurn: (arxivId: string, text: string) => void
  applyEvent: (arxivId: string, event: AiClientEvent) => void
  clear: (arxivId: string) => void
}

function loadSessions(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(AI_CHAT_STORAGE_KEY) ?? '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
    return {}
  } catch {
    return {}
  }
}

function persistSessions(sessions: Record<string, string>): void {
  try {
    localStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // ignore storage failures
  }
}

export const useAiChatStore = create<AiChatStore>((set, get) => ({
  sessions: loadSessions(),
  chats: {},
  setSession: (arxivId, sessionId) => {
    const sessions = { ...get().sessions, [arxivId]: sessionId }
    persistSessions(sessions)
    set({ sessions })
  },
  setHistory: (arxivId, messages) =>
    set({ chats: { ...get().chats, [arxivId]: { messages, streaming: false } } }),
  beginTurn: (arxivId, text) => {
    const current = get().chats[arxivId] ?? emptyChat()
    set({ chats: { ...get().chats, [arxivId]: startUserTurn(current, text) } })
  },
  applyEvent: (arxivId, event) => {
    const current = get().chats[arxivId] ?? emptyChat()
    set({ chats: { ...get().chats, [arxivId]: reduceChat(current, event) } })
  },
  clear: (arxivId) => {
    const chats = { ...get().chats }
    delete chats[arxivId]
    set({ chats })
  },
}))
