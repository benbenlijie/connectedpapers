import { test, expect } from 'bun:test'
import { rankSections, tokenize } from './paper-search'

const sections = [
  { idx: 0, heading: 'Introduction', text: 'Graph neural networks are popular. We study graphs.' },
  { idx: 1, heading: 'Methods', text: 'We optimize a transformer with attention and dropout.' },
  { idx: 2, heading: 'Results', text: 'Our transformer beats baselines on translation tasks.' },
]

test('tokenize drops short/stop tokens and lowercases', () => {
  expect(tokenize('The Transformer, a model!')).toEqual(['transformer', 'model'])
})

test('rankSections scores the most relevant sections first', () => {
  const hits = rankSections(sections, 'transformer attention', 2)
  expect(hits[0].sectionIdx).toBe(1)
  expect(hits.map((h) => h.sectionIdx)).toContain(2)
})

test('rankSections returns an empty list for an empty query', () => {
  expect(rankSections(sections, '')).toEqual([])
})
