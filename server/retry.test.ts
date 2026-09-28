import { test, expect } from 'bun:test'
import { withRetry } from './retry'

test('retries then succeeds', async () => {
  let n = 0
  const out = await withRetry(async () => {
    n++
    if (n < 3) throw Object.assign(new Error('429'), { status: 429 })
    return 'ok'
  }, { retries: 3, baseDelayMs: 1 })
  expect(out).toBe('ok')
  expect(n).toBe(3)
})

test('gives up after retries', async () => {
  let n = 0
  await withRetry(async () => { n++; throw Object.assign(new Error('503'), { status: 503 }) },
    { retries: 2, baseDelayMs: 1 }).catch(() => {})
  expect(n).toBe(3)
})
