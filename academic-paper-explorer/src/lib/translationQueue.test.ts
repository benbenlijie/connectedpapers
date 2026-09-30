import { describe, it, expect } from 'vitest'
import { createTranslationQueue } from './translationQueue'

describe('createTranslationQueue', () => {
  it('hands out queued indices in document order, up to the batch size', () => {
    const q = createTranslationQueue(5)
    q.enqueue(3)
    q.enqueue(1)
    q.enqueue(4)
    expect(q.takeBatch(2)).toEqual([1, 3])
    expect(q.takeBatch(2)).toEqual([4])
    expect(q.takeBatch(2)).toEqual([])
    expect(q.isIdle()).toBe(true)
  })

  it('ignores duplicate, done, and out-of-range indices', () => {
    const q = createTranslationQueue(3, [0])
    expect(q.enqueue(0)).toBe(false)
    expect(q.enqueue(1)).toBe(true)
    expect(q.enqueue(1)).toBe(false)
    expect(q.enqueue(-1)).toBe(false)
    expect(q.enqueue(99)).toBe(false)
    expect(q.takeBatch(10)).toEqual([1])
    expect(q.doneCount()).toBe(1)
    expect(q.pendingCount()).toBe(0)
  })

  it('reports busy while work is queued and idle once drained', () => {
    const q = createTranslationQueue(2)
    expect(q.isIdle()).toBe(true)
    q.enqueue(0)
    expect(q.isIdle()).toBe(false)
    q.takeBatch(1)
    expect(q.isIdle()).toBe(true)
  })

  it('tracks done count through markDone', () => {
    const q = createTranslationQueue(4)
    q.enqueue(0)
    q.enqueue(1)
    const batch = q.takeBatch(2)
    batch.forEach((i) => q.markDone(i))
    expect(q.doneCount()).toBe(2)
    expect(q.isDone(0)).toBe(true)
    expect(q.enqueue(0)).toBe(false)
  })
})
