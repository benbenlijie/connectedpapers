/**
 * Pure bookkeeping for lazy, viewport-driven translation. Tracks which block
 * indices still need translating and hands them out in document order, in
 * bounded batches. DOM work (placeholders, providers) lives in the caller.
 */
export interface TranslationQueue {
  readonly size: number
  /** Queue an index for translation. Returns false if unknown, done, or already queued. */
  enqueue(index: number): boolean
  /** Remove and return up to `max` queued indices, lowest (document order) first. */
  takeBatch(max: number): number[]
  markDone(index: number): void
  isDone(index: number): boolean
  isIdle(): boolean
  pendingCount(): number
  doneCount(): number
}

class Queue implements TranslationQueue {
  readonly size: number
  private readonly done: Set<number>
  private readonly queued = new Set<number>()

  constructor(size: number, done: Iterable<number>) {
    this.size = size
    this.done = new Set(done)
  }

  enqueue(index: number): boolean {
    if (!Number.isInteger(index) || index < 0 || index >= this.size) return false
    if (this.done.has(index) || this.queued.has(index)) return false
    this.queued.add(index)
    return true
  }

  takeBatch(max: number): number[] {
    if (max <= 0 || this.queued.size === 0) return []
    const batch = [...this.queued].sort((a, b) => a - b).slice(0, max)
    for (const index of batch) this.queued.delete(index)
    return batch
  }

  markDone(index: number): void {
    this.queued.delete(index)
    this.done.add(index)
  }

  isDone(index: number): boolean {
    return this.done.has(index)
  }

  isIdle(): boolean {
    return this.queued.size === 0
  }

  pendingCount(): number {
    return this.queued.size
  }

  doneCount(): number {
    return this.done.size
  }
}

export function createTranslationQueue(size: number, done: Iterable<number> = []): TranslationQueue {
  return new Queue(size, done)
}
