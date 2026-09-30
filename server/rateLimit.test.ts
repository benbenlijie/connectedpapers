import { test, expect } from 'bun:test'
import { createLimiter, createRateLimiter } from './rateLimit'

test('createLimiter runs tasks in order and spaces them by the interval', async () => {
  const schedule = createLimiter(20)
  const order: number[] = []
  const started = Date.now()
  await Promise.all([
    schedule(async () => { order.push(1) }),
    schedule(async () => { order.push(2) }),
    schedule(async () => { order.push(3) }),
  ])
  expect(order).toEqual([1, 2, 3])
  // two gaps of 20ms between the three tasks
  expect(Date.now() - started).toBeGreaterThanOrEqual(35)
})

test('createLimiter keeps the chain alive after a rejection', async () => {
  const schedule = createLimiter(0)
  await expect(schedule(async () => { throw new Error('boom') })).rejects.toThrow('boom')
  await expect(schedule(async () => 'ok')).resolves.toBe('ok')
})

test('createRateLimiter allows up to max then blocks within the window', () => {
  let t = 0
  const check = createRateLimiter({ windowMs: 1000, max: 2, now: () => t })
  expect(check('ip')).toBe(true)
  expect(check('ip')).toBe(true)
  expect(check('ip')).toBe(false)
  expect(check('other')).toBe(true)
  t = 1000
  expect(check('ip')).toBe(true)
})
