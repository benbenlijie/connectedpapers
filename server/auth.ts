import { createHash, timingSafeEqual } from 'node:crypto'

export const AUTH_COOKIE = 'cp_token'

export function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  return match ? match[1].trim() : null
}

export function cookieValue(cookieHeaderValue: string | null, name: string): string | null {
  if (!cookieHeaderValue) return null
  for (const part of cookieHeaderValue.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export interface ExtractedToken {
  token: string | null
  source: 'bearer' | 'cookie' | 'query' | 'none'
  fromQuery: boolean
}

export function extractToken(headers: Headers, url: URL): ExtractedToken {
  const header = bearerToken(headers.get('authorization')) ?? headers.get('x-access-token')
  if (header) return { token: header, source: 'bearer', fromQuery: false }
  const cookie = cookieValue(headers.get('cookie'), AUTH_COOKIE)
  if (cookie) return { token: cookie, source: 'cookie', fromQuery: false }
  const query = url.searchParams.get('token')
  if (query) return { token: query, source: 'query', fromQuery: true }
  return { token: null, source: 'none', fromQuery: false }
}

/** Constant-time string compare (hashed to equal lengths). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function isAuthorized(headers: Headers, url: URL, expected: string | undefined): boolean {
  if (!expected) return true
  const { token } = extractToken(headers, url)
  return token != null && safeEqual(token, expected)
}

export function clientIpFrom(headers: Headers, trustProxy: boolean, fallback: string): string {
  if (trustProxy) {
    const forwarded = headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
  }
  return fallback
}

export function cookieHeader(token: string, secure: boolean): string {
  const parts = [
    `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=2592000',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}
