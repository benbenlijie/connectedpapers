import { test, expect } from 'bun:test'
import { buildWorkSearchUrl, buildWorkByDoiUrl, buildWorkSearchByTitleUrl, getRelatedWorksForPaper } from './openalex'

test('buildWorkSearchUrl includes search, per_page, select and polite-pool mailto', () => {
  const url = buildWorkSearchUrl('attention mechanism')
  expect(url.startsWith('https://api.openalex.org/works?')).toBe(true)
  expect(url).toContain('search=attention%20mechanism')
  expect(url).toContain('per_page=20')
  expect(url).toContain('select=')
  expect(url).toMatch(/mailto=.+%40/)
})

test('related-work URL builders target the doi and title-search endpoints', () => {
  expect(buildWorkByDoiUrl('10.1/x')).toContain('/works/doi:10.1%2Fx')
  const search = buildWorkSearchByTitleUrl('A Title')
  expect(search).toContain('/works?search=A%20Title')
  expect(search).toContain('per_page=1')
})

test('getRelatedWorksForPaper falls back to a title search when the DOI 404s', async () => {
  const real = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = ((url: unknown) => {
    const u = String(url)
    calls.push(u)
    if (u.includes('/works/doi:')) return Promise.resolve(new Response('nf', { status: 404 }))
    if (u.includes('search=')) {
      return Promise.resolve(
        new Response(JSON.stringify({ results: [{ id: 'W1', related_works: ['https://openalex.org/W2'] }] }), { status: 200 }),
      )
    }
    return Promise.resolve(new Response(JSON.stringify({ results: [{ id: 'W2', doi: 'https://doi.org/10.2/y' }] }), { status: 200 }))
  }) as unknown as typeof fetch

  try {
    const results = await getRelatedWorksForPaper({ doi: '10.1/x', title: 'T', limit: 5 })
    expect(calls.some((c) => c.includes('/works/doi:'))).toBe(true)
    expect(calls.some((c) => c.includes('search='))).toBe(true)
    expect(results).toHaveLength(1)
  } finally {
    globalThis.fetch = real
  }
})
