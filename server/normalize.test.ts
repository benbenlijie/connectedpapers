import { test, expect } from 'bun:test'
import { normalizeS2Paper } from './normalize'

test('normalize exposes the arXiv id', () => {
  const out = normalizeS2Paper({ paperId: 'p', title: 'T', externalIds: { ArXiv: '2401.00001' } } as any)
  expect(out.arxiv_id).toBe('2401.00001')
})

test('normalize sets arxiv_id to null when absent', () => {
  const out = normalizeS2Paper({ paperId: 'p', title: 'T' } as any)
  expect(out.arxiv_id).toBeNull()
})
