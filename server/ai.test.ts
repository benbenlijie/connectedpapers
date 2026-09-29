import { test, expect } from 'bun:test'
import { buildAiMessages } from './ai'

test('explain asks for a concise explanation in the target language', () => {
  const m = buildAiMessages('explain', { text: 'Attention is all you need.' }, 'zh')
  expect(m[0].role).toBe('system')
  expect(m[0].content).toContain('zh')
  expect(m[1].content).toContain('Attention is all you need.')
})

test('summarize mentions summarizing and carries the excerpt', () => {
  const m = buildAiMessages('summarize', { text: 'Long excerpt here' }, 'zh')
  expect(m[0].content.toLowerCase()).toContain('summar')
  expect(m[1].content).toContain('Long excerpt here')
})

test('ask includes both the question and the excerpt', () => {
  const m = buildAiMessages('ask', { text: 'excerpt text', question: 'What is X?' }, 'zh')
  expect(m[1].content).toContain('What is X?')
  expect(m[1].content).toContain('excerpt text')
})

test('includes paper context when provided', () => {
  const m = buildAiMessages('explain', { text: 'x', context: 'Paper: Foo (2024)' }, 'zh')
  expect(m[1].content).toContain('Paper: Foo (2024)')
})

test('throws on missing text or question and on an unknown action', () => {
  expect(() => buildAiMessages('explain', {}, 'zh')).toThrow()
  expect(() => buildAiMessages('ask', { text: 'x' }, 'zh')).toThrow()
  expect(() => buildAiMessages('nope' as never, { text: 'x' }, 'zh')).toThrow()
})
