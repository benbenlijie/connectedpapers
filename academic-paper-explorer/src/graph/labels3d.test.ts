import { describe, it, expect } from 'vitest'
import { truncateTitle } from './labels3d'

describe('truncateTitle', () => {
  it('returns short titles unchanged', () => {
    expect(truncateTitle('Graph Neural Networks')).toBe('Graph Neural Networks')
  })

  it('truncates long titles with an ellipsis', () => {
    const out = truncateTitle('Attention Is All You Need For Everything Everywhere', 22)
    expect(out).toBe('Attention Is All You N…')
  })

  it('handles undefined / empty titles', () => {
    expect(truncateTitle(undefined)).toBe('')
    expect(truncateTitle('   ')).toBe('')
  })
})
