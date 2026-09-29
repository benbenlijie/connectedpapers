import { test, expect } from 'bun:test'
import { buildTranslateMessages, parseTranslationArray } from './translate'

test('buildTranslateMessages declares the target and carries the texts', () => {
  const messages = buildTranslateMessages('zh', ['Hello', 'World'], 'en')
  expect(messages[0].role).toBe('system')
  expect(messages[0].content).toContain('zh')
  const user = messages[1].content
  expect(user).toContain('Hello')
  expect(user).toContain('World')
})

test('parseTranslationArray accepts a plain JSON array', () => {
  expect(parseTranslationArray('["甲","乙"]', 2)).toEqual(['甲', '乙'])
})

test('parseTranslationArray strips code fences', () => {
  expect(parseTranslationArray('```json\n["甲","乙"]\n```', 2)).toEqual(['甲', '乙'])
})

test('parseTranslationArray rejects a length mismatch', () => {
  expect(() => parseTranslationArray('["甲"]', 2)).toThrow()
})

test('parseTranslationArray rejects non-arrays', () => {
  expect(() => parseTranslationArray('{"a":1}', 1)).toThrow()
  expect(() => parseTranslationArray('garbage', 1)).toThrow()
})
