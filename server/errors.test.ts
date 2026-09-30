import { test, expect } from 'bun:test'
import { ApiError, json, handleError } from './errors'

test('json envelope', async () => {
  const r = json({ error: { code: 'X', message: 'y' } }, 400)
  expect(r.status).toBe(400)
  expect(((await r.json()) as { error: { code: string } }).error.code).toBe('X')
})

test('handleError maps ApiError', async () => {
  const r = handleError(new ApiError('MISSING_PAPER_ID', '论文ID不能为空'))
  expect(r.status).toBe(400)
  expect(((await r.json()) as { error: { code: string } }).error.code).toBe('MISSING_PAPER_ID')
})

test('handleError maps unknown to 500', async () => {
  const r = handleError(new Error('boom'))
  expect(r.status).toBe(500)
  expect(((await r.json()) as { error: { code: string } }).error.code).toBe('INTERNAL_SERVER_ERROR')
})
