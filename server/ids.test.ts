import { test, expect } from 'bun:test'
import { resolvePaperId } from './ids'

test('doi', () => {
  const r = resolvePaperId('10.1038/nature12373')
  expect(r.kind).toBe('doi')
  expect(r.s2Path).toBe('DOI:10.1038/nature12373')
})
test('arxiv bare', () => expect(resolvePaperId('1706.03762').s2Path).toBe('ARXIV:1706.03762'))
test('arxiv versioned', () => expect(resolvePaperId('1706.03762v5').s2Path).toBe('ARXIV:1706.03762v5'))
test('arxiv doi', () => expect(resolvePaperId('10.48550/arXiv.1706.03762').s2Path).toBe('ARXIV:1706.03762'))
test('openalex', () => {
  const r = resolvePaperId('W2741809807')
  expect(r.kind).toBe('openalex')
  expect(r.openalexWorkId).toBe('W2741809807')
})
test('s2 passthrough', () => expect(resolvePaperId('649def34f8be52c8b66281af98ae884c09aef38b').s2Path).toBe('649def34f8be52c8b66281af98ae884c09aef38b'))
