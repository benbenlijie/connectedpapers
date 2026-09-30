import { describe, it, expect } from 'vitest'
import { emptyChat, startUserTurn, reduceChat, type ChatState } from './aiChat'

describe('aiChat reducer', () => {
  it('startUserTurn appends the user message and an empty assistant message', () => {
    const s = startUserTurn(emptyChat(), 'hi')
    expect(s.messages.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(s.streaming).toBe(true)
  })

  it('text events append deltas to the streaming assistant text', () => {
    let s = startUserTurn(emptyChat(), 'q')
    s = reduceChat(s, { type: 'text', text: 'Hel' })
    s = reduceChat(s, { type: 'text', text: 'lo!' })
    expect(s.messages.at(-1)!.text).toBe('Hello!')
  })

  it('tool events accumulate activity on the assistant message', () => {
    let s = startUserTurn(emptyChat(), 'q')
    s = reduceChat(s, { type: 'tool', name: 'paper_search', status: 'start', detail: 'graph' })
    s = reduceChat(s, { type: 'tool', name: 'paper_search', status: 'done' })
    expect(s.messages.at(-1)!.tools).toEqual([
      { name: 'paper_search', status: 'start', detail: 'graph' },
      { name: 'paper_search', status: 'done' },
    ])
  })

  it('done stops streaming and error records a message', () => {
    let s = startUserTurn(emptyChat(), 'q')
    s = reduceChat(s, { type: 'done' })
    expect(s.streaming).toBe(false)
    s = startUserTurn(s, 'again')
    s = reduceChat(s, { type: 'error', message: 'boom' })
    expect(s.messages.at(-1)!.error).toBe('boom')
    expect(s.streaming).toBe(false)
  })

  it('does not duplicate a start chip for pending then running on the same tool', () => {
    let s: ChatState = startUserTurn(emptyChat(), 'q')
    s = reduceChat(s, { type: 'tool', name: 'paper_search', status: 'start' })
    s = reduceChat(s, { type: 'tool', name: 'paper_search', status: 'start', detail: 'graph' })
    expect(s.messages.at(-1)!.tools).toEqual([
      { name: 'paper_search', status: 'start', detail: 'graph' },
    ])
    s = reduceChat(s, { type: 'tool', name: 'paper_search', status: 'done' })
    expect(s.messages.at(-1)!.tools).toEqual([
      { name: 'paper_search', status: 'start', detail: 'graph' },
      { name: 'paper_search', status: 'done' },
    ])
  })
})
