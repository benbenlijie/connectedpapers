import { test, expect } from 'bun:test'
import { buildWorkSearchUrl } from './openalex'

test('buildWorkSearchUrl includes search, per_page, select and polite-pool mailto', () => {
  const url = buildWorkSearchUrl('attention mechanism')
  expect(url.startsWith('https://api.openalex.org/works?')).toBe(true)
  expect(url).toContain('search=attention%20mechanism')
  expect(url).toContain('per_page=20')
  expect(url).toContain('select=')
  expect(url).toMatch(/mailto=.+%40/)
})
