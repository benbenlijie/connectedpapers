import { describe, it, expect } from 'vitest'
import { searchResponseSchema, networkDataSchema } from './schemas'

describe('schemas', () => {
  it('accepts a valid search response', () => {
    const r = searchResponseSchema.parse({ data: { papers: [{ title: 'T', source: 'semantic_scholar' }], total_count: 1 } })
    expect(r.data.total_count).toBe(1)
  })
  it('rejects a search response without total_count', () => {
    expect(() => searchResponseSchema.parse({ data: { papers: [] } })).toThrow()
  })
  it('accepts empty network', () => {
    expect(networkDataSchema.parse({ nodes: [], edges: [] }).nodes).toEqual([])
  })
})
