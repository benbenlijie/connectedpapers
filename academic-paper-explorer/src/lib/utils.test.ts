import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('joins truthy classes', () => {
    const maybe: string | undefined = undefined
    expect(cn('a', maybe && 'b', 'c')).toBe('a c')
  })
})
