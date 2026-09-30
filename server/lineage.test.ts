import { test, expect } from 'bun:test'
import { mapLineageEntries } from './lineage'

const paper = (id: string, extra: Record<string, unknown> = {}) => ({
  paperId: id,
  title: `Paper ${id}`,
  year: 2000,
  citationCount: 0,
  authors: [{ name: 'A' }, { name: 'B' }],
  venue: 'V',
  ...extra,
})

test('mapLineageEntries reads citedPaper for references', () => {
  const out = mapLineageEntries(
    [{ citedPaper: paper('p1'), isInfluential: false }],
    'reference',
    10,
  )
  expect(out).toHaveLength(1)
  expect(out[0]).toMatchObject({ paperId: 'p1', title: 'Paper p1', authors: 'A, B', venue: 'V' })
})

test('mapLineageEntries reads citingPaper for citations', () => {
  const out = mapLineageEntries([{ citingPaper: paper('c1'), isInfluential: true }], 'citation', 10)
  expect(out[0].paperId).toBe('c1')
  expect(out[0].isInfluential).toBe(true)
})

test('mapLineageEntries ranks influential first then citations', () => {
  const rows = [
    { citedPaper: paper('low', { citationCount: 5 }) },
    { citedPaper: paper('top', { citationCount: 1 }), isInfluential: true },
    { citedPaper: paper('mid', { citationCount: 50 }) },
  ]
  expect(mapLineageEntries(rows, 'reference', 10).map((p) => p.paperId)).toEqual(['top', 'mid', 'low'])
})

test('mapLineageEntries dedupes and respects limit', () => {
  const rows = [
    { citedPaper: paper('a', { citationCount: 3 }) },
    { citedPaper: paper('a', { citationCount: 9 }) },
    { citedPaper: paper('b', { citationCount: 1 }) },
  ]
  const out = mapLineageEntries(rows, 'reference', 1)
  expect(out).toHaveLength(1)
  expect(out[0].paperId).toBe('a')
  expect(out[0].citationCount).toBe(3)
})

test('mapLineageEntries drops malformed rows and handles empty input', () => {
  expect(mapLineageEntries([], 'citation', 10)).toEqual([])
  expect(mapLineageEntries([{}, { citingPaper: { title: 'no id' } }], 'citation', 10)).toEqual([])
})
