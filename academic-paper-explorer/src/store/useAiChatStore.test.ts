import { describe, it, expect, beforeEach } from 'vitest'
import { useAiChatStore } from './useAiChatStore'

beforeEach(() => {
  localStorage.clear()
  useAiChatStore.setState({ sessions: {} })
})

describe('useAiChatStore', () => {
  it('records the session id per paper', () => {
    useAiChatStore.getState().setSession('2401.00001', 's1')
    expect(useAiChatStore.getState().sessions['2401.00001']).toBe('s1')
  })

  it('applies chat events to the paper transcript', () => {
    const s = useAiChatStore.getState()
    s.beginTurn('2401.00001', 'hi')
    s.applyEvent('2401.00001', { type: 'text', text: 'Hey' })
    const chat = useAiChatStore.getState().chats['2401.00001']
    expect(chat.messages.at(-1)!.text).toBe('Hey')
    expect(chat.streaming).toBe(true)
  })
})
