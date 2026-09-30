import { test, expect } from 'bun:test'
import { bearerToken, cookieValue, extractToken, isAuthorized, safeEqual, clientIpFrom, cookieHeader } from './auth'

test('bearerToken parses a Bearer header', () => {
  expect(bearerToken('Bearer abc')).toBe('abc')
  expect(bearerToken('bearer  abc ')).toBe('abc')
  expect(bearerToken('Basic xyz')).toBeNull()
  expect(bearerToken(null)).toBeNull()
})

test('cookieValue reads a cookie by name', () => {
  expect(cookieValue('a=1; cp_token=secret; b=2', 'cp_token')).toBe('secret')
  expect(cookieValue(null, 'cp_token')).toBeNull()
  expect(cookieValue('other=1', 'cp_token')).toBeNull()
})

test('extractToken prefers bearer > cookie > query', () => {
  const headers = new Headers({ authorization: 'Bearer t1', cookie: 'cp_token=t2' })
  expect(extractToken(headers, new URL('https://x/'))).toMatchObject({ token: 't1', source: 'bearer' })

  const cookieOnly = new Headers({ cookie: 'cp_token=t2' })
  expect(extractToken(cookieOnly, new URL('https://x/'))).toMatchObject({ token: 't2', source: 'cookie' })

  const query = extractToken(new Headers(), new URL('https://x/?token=t3'))
  expect(query).toMatchObject({ token: 't3', source: 'query', fromQuery: true })
})

test('isAuthorized: open when no token configured, else constant-time match', () => {
  expect(isAuthorized(new Headers(), new URL('https://x/'), undefined)).toBe(true)
  expect(isAuthorized(new Headers({ authorization: 'Bearer good' }), new URL('https://x/'), 'good')).toBe(true)
  expect(isAuthorized(new Headers({ authorization: 'Bearer bad' }), new URL('https://x/'), 'good')).toBe(false)
})

test('safeEqual compares without throwing on length mismatch', () => {
  expect(safeEqual('a', 'a')).toBe(true)
  expect(safeEqual('a', 'ab')).toBe(false)
})

test('clientIpFrom honors trustProxy', () => {
  const h = new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })
  expect(clientIpFrom(h, true, '127.0.0.1')).toBe('1.2.3.4')
  expect(clientIpFrom(h, false, '127.0.0.1')).toBe('127.0.0.1')
})

test('cookieHeader includes Secure over https', () => {
  expect(cookieHeader('tok', true)).toContain('HttpOnly')
  expect(cookieHeader('tok', true)).toContain('Secure')
  expect(cookieHeader('tok', false)).not.toContain('Secure')
})

test('withBasePath prefixes a sub-path mount', async () => {
  const { withBasePath } = await import('./auth')
  expect(withBasePath('/papers', '/', '')).toBe('/papers/')
  expect(withBasePath('/papers', '/x', '?a=1')).toBe('/papers/x?a=1')
  expect(withBasePath('/papers/', '/x')).toBe('/papers/x')
  expect(withBasePath('', '/x')).toBe('/x')
})
