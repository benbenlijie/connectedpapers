import { describe, it, expect } from 'vitest'
import { pickVisibleLabels, ZOOM_LABEL_THRESHOLD, type LabelNode } from './labelLod'

const node = (id: string, size = 10, isRoot = false): LabelNode => ({ id, size, isRoot })

describe('pickVisibleLabels', () => {
  it('always shows root, active and neighbours, even when zoomed out', () => {
    const nodes = [node('root', 30, true), node('a', 20), node('b', 20), node('c', 5)]
    const visible = pickVisibleLabels(nodes, {
      activeId: 'a',
      neighborIds: new Set(['b']),
      globalScale: 0.4,
      limit: 3,
    })
    expect(visible.has('root')).toBe(true)
    expect(visible.has('a')).toBe(true)
    expect(visible.has('b')).toBe(true)
    expect(visible.has('c')).toBe(false)
  })

  it('adds no extra labels below the zoom threshold', () => {
    const nodes = [node('a', 20), node('b', 10)]
    const visible = pickVisibleLabels(nodes, {
      activeId: null,
      neighborIds: new Set(),
      globalScale: ZOOM_LABEL_THRESHOLD - 0.01,
      limit: 5,
    })
    expect(visible.size).toBe(0)
  })

  it('adds the largest remaining nodes above the zoom threshold', () => {
    const nodes = [node('root', 30, true), node('small', 5), node('mid', 15), node('big', 25)]
    const visible = pickVisibleLabels(nodes, {
      activeId: null,
      neighborIds: new Set(),
      globalScale: 1.5,
      limit: 2,
    })
    expect(visible.has('root')).toBe(true)
    expect(visible.has('big')).toBe(true)
    expect(visible.has('mid')).toBe(true)
    expect(visible.has('small')).toBe(false)
  })

  it('respects a zero limit', () => {
    const nodes = [node('a', 20), node('b', 10)]
    const visible = pickVisibleLabels(nodes, {
      activeId: null,
      neighborIds: new Set(),
      globalScale: 2,
      limit: 0,
    })
    expect(visible.size).toBe(0)
  })

  it('does not duplicate priority labels into the extra set', () => {
    const nodes = [node('a', 30, true), node('b', 20)]
    const visible = pickVisibleLabels(nodes, {
      activeId: 'b',
      neighborIds: new Set(['b']),
      globalScale: 2,
      limit: 5,
    })
    expect([...visible].sort()).toEqual(['a', 'b'])
  })
})
