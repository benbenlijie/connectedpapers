import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { openDb } from './db'
import { ApiError } from './errors'
import {
  findConnection,
  loadLocalEdges,
  orderReferences,
  pickFrontier,
} from './connect'

const A = 'PAPER_A'
const B = 'PAPER_B'
const X = 'PAPER_X'
const M = 'PAPER_M'
const Z = 'PAPER_Z'

interface World {
  papers: Map<string, any>
  embeddings: Map<string, number[]>
  calls: string[][]
  live: boolean
}

let database: Database

beforeEach(() => {
  database = openDb(':memory:')
})

/** Stub the S2 HTTP surface; returns a restorer. */
function mockS2(world: World): () => void {
  const real = globalThis.fetch
  globalThis.fetch = (async (input: unknown, init?: { body?: unknown }) => {
    const url = String(input)
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (url.includes('/paper/batch')) {
      const ids: string[] = body.ids ?? []
      world.calls.push(ids)
      if (url.includes('embedding.specter_v2')) {
        const payload = ids.map((id) => {
          const vector = world.embeddings.get(id)
          return vector ? { embedding: { vector } } : null
        })
        return new Response(JSON.stringify(payload), { status: 200 })
      }
      const payload = ids.map((id) => world.papers.get(id) ?? null)
      return new Response(JSON.stringify(payload), { status: 200 })
    }
    // Citing lists are a capped request of their own now.
    if (url.includes('/citations')) {
      const id = decodeURIComponent(url.split('/paper/')[1]?.split('/citations')[0] ?? '')
      const limit = Number(new URL(url).searchParams.get('limit') ?? '0')
      const cites = ((world.papers.get(id)?.citations ?? []) as unknown[]).slice(0, limit)
      return new Response(JSON.stringify({ data: cites.map((c) => ({ citingPaper: c })) }), { status: 200 })
    }
    return new Response('{}', { status: 404 })
  }) as unknown as typeof fetch
  return () => {
    globalThis.fetch = real
  }
}

function seedEmbedding(id: string, vector: number[]): void {
  database.run('insert or replace into paper_embeddings (id, model, vector) values (?,?,?)', [
    id,
    'specter_v2',
    JSON.stringify(vector),
  ])
}

const paper = (id: string, extra: Record<string, unknown> = {}) => ({
  paperId: id,
  title: `论文 ${id}`,
  year: 2020,
  citationCount: 10,
  ...extra,
})

/** Seed orthogonal embeddings so the semantic fallback never interferes. */
function seedOrthogonal(): void {
  seedEmbedding(A, [1, 0])
  seedEmbedding(B, [0, 1])
}

/** Seed near-identical embeddings so the semantic fallback does fire. */
function seedSimilar(): void {
  seedEmbedding(A, [1, 0])
  seedEmbedding(B, [1, 0.05])
}

describe('loadLocalEdges', () => {
  test('reads persisted relations and the citations table', () => {
    database.run(`insert into paper_relations (from_id, to_id, type, weight) values (?,?,?,?)`, [
      A,
      X,
      'reference',
      1,
    ])
    database.run(`insert into paper_relations (from_id, to_id, type, weight) values (?,?,?,?)`, [
      A,
      B,
      'coupling',
      4.5,
    ])
    database.run('insert into papers (id, title) values (?,?)', [A, 'a'])
    database.run('insert into papers (id, title) values (?,?)', [B, 'b'])
    database.run('insert or ignore into citations (citing_paper_id, cited_paper_id) values (?,?)', [A, B])

    const edges = loadLocalEdges(database)
    expect(edges).toContainEqual({ from: A, to: X, type: 'reference', weight: 1 })
    expect(edges).toContainEqual({ from: A, to: B, type: 'coupling', weight: 4.5 })
    expect(edges.filter((e) => e.from === A && e.to === B)).toHaveLength(2)
  })

  test('drops relation types it cannot traverse', () => {
    database.run(`insert into paper_relations (from_id, to_id, type, weight) values (?,?,?,?)`, [
      A,
      B,
      'mystery',
      1,
    ])
    expect(loadLocalEdges(database)).toEqual([])
  })
})

describe('orderReferences', () => {
  test('puts works shared with the other paper first, then the most cited', () => {
    const refs = [
      { paperId: 'low', citationCount: 1 },
      { paperId: 'shared-low', citationCount: 2 },
      { paperId: 'high', citationCount: 99 },
      { paperId: 'shared-high', citationCount: 50 },
    ]
    const ordered = orderReferences(refs, new Set(['shared-low', 'shared-high']), 10)
    expect(ordered.map((r) => r.paperId)).toEqual(['shared-high', 'shared-low', 'high', 'low'])
  })

  test('caps the list', () => {
    const refs = Array.from({ length: 10 }, (_, i) => ({ paperId: `p${i}`, citationCount: i }))
    expect(orderReferences(refs, new Set(), 3)).toHaveLength(3)
  })

  test('breaks equal citation counts by paper id regardless of input order', () => {
    const refs = [
      { paperId: 'z', citationCount: 10 },
      { paperId: 'a', citationCount: 10 },
    ]
    for (const input of [refs, [...refs].reverse()]) {
      expect(orderReferences(input, new Set(), 10).map((r) => r.paperId)).toEqual(['a', 'z'])
    }
  })
})

describe('pickFrontier', () => {
  test('skips seen ids, dedupes, ranks by citations and caps', () => {
    const candidates = [
      { paperId: 'seen', citationCount: 100 },
      { paperId: 'a', citationCount: 5 },
      { paperId: 'b', citationCount: 50 },
      { paperId: 'b', citationCount: 50 },
      { paperId: 'c', citationCount: 1 },
    ]
    expect(pickFrontier(candidates, new Set(['seen']), 2)).toEqual(['b', 'a'])
  })

  test('breaks equal citation counts by paper id regardless of input order', () => {
    const candidates = [
      { paperId: 'z', citationCount: 10 },
      { paperId: 'a', citationCount: 10 },
    ]
    for (const input of [candidates, [...candidates].reverse()]) {
      expect(pickFrontier(input, new Set(), 2)).toEqual(['a', 'z'])
    }
  })
})

describe('findConnection', () => {
  let world: World
  let restore: (() => void) | null = null

  beforeEach(() => {
    world = { papers: new Map(), embeddings: new Map(), calls: [], live: true }
    seedOrthogonal()
  })

  afterEach(() => {
    restore?.()
    restore = null
  })

  const run = (from = A, to = B, opts: Record<string, unknown> = {}) => {
    restore = mockS2(world)
    return findConnection(from, to, { db: database, ...opts })
  }

  test('calls a rate-limited upstream unavailable rather than "paper not found"', async () => {
    // 429 is what the shared S2 pool answers under load. The user should be told
    // to retry, not sent hunting for a typo — and it has to come back quickly:
    // the old 1200 ms retry base spent 8.4 s asleep before giving up.
    restore = mockS2(world)
    globalThis.fetch = (async () => new Response('{}', { status: 429 })) as unknown as typeof fetch
    const started = Date.now()
    const err = await findConnection(A, B, { db: database, live: true }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe('UPSTREAM_FAILED')
    expect((err as ApiError).status).toBe(503)
    expect(Date.now() - started).toBeLessThan(4000)
  })

  test('detects a direct citation', async () => {
    world.papers.set(A, paper(A, { references: [paper(B)] }))
    world.papers.set(B, paper(B))

    const result = await run()
    expect(result.found).toBe(true)
    expect(result.best!.kind).toBe('direct')
    expect(result.best!.nodeIds).toEqual([A, B])
    expect(result.best!.hops).toHaveLength(1)
    expect(result.best!.summary).toContain('引用了')
  })

  test('detects bibliographic coupling through a shared reference', async () => {
    // S2 embeds reference titles, which is where the prose gets its labels.
    world.papers.set(A, paper(A, { references: [paper(X, { title: '共同祖先' }), paper('R1')] }))
    world.papers.set(B, paper(B, { references: [paper(X, { title: '共同祖先' }), paper('R2')] }))

    const result = await run()
    expect(result.found).toBe(true)
    expect(result.best!.kind).toBe('coupling')
    expect(result.best!.nodeIds).toEqual([A, X, B])
    expect(result.best!.summary).toContain('共同引用了 共同祖先')
    expect(result.best!.edges).toEqual([
      { from: A, to: X, type: 'reference', weight: 1 },
      { from: B, to: X, type: 'reference', weight: 1 },
    ])
    expect(result.signals.sharedReferences.map((n) => n.id)).toEqual([X])
  })

  test('prefers the most cited work among several shared references', async () => {
    world.papers.set(
      A,
      paper(A, { references: [paper('SMALL', { citationCount: 1 }), paper('BIG', { citationCount: 900 })] }),
    )
    world.papers.set(
      B,
      paper(B, { references: [paper('SMALL', { citationCount: 1 }), paper('BIG', { citationCount: 900 })] }),
    )

    const result = await run()
    expect(result.best!.nodeIds).toEqual([A, 'BIG', B])
  })

  test('detects co-citation through a shared citing paper', async () => {
    world.papers.set(A, paper(A, { citations: [paper(M, { title: '综述' })] }))
    world.papers.set(B, paper(B, { citations: [paper(M, { title: '综述' })] }))

    const result = await run()
    expect(result.best!.kind).toBe('co_citation')
    expect(result.best!.nodeIds).toEqual([A, M, B])
    expect(result.best!.summary).toContain('同时被 综述 引用')
    expect(result.signals.sharedCiters.map((n) => n.id)).toEqual([M])
  })

  test('answers from local SQLite relations without a live crawl', async () => {
    world.papers.set(A, paper(A))
    world.papers.set(B, paper(B))
    database.run('insert into papers (id, title) values (?,?)', [A, 'a'])
    database.run('insert into papers (id, title) values (?,?)', [B, 'b'])
    database.run('insert or ignore into citations (citing_paper_id, cited_paper_id) values (?,?)', [A, B])

    const result = await run()
    expect(result.found).toBe(true)
    expect(result.best!.kind).toBe('direct')
    expect(result.stats.source).toBe('local')
    expect(world.calls).toHaveLength(1)
  })

  test('shows the shared work instead of a one-hop coupling summary row', async () => {
    // The graph builder stores both the two reference rows and a denormalised
    // coupling row for the pair. The coupling row must not shortcut the answer:
    // the user asked which papers connect A and B, so X has to appear.
    world.papers.set(A, paper(A, { references: [paper(X, { title: '共同祖先' })] }))
    world.papers.set(B, paper(B, { references: [paper(X, { title: '共同祖先' })] }))
    database.run('insert into paper_relations (from_id, to_id, type, weight) values (?,?,?,?)', [
      A,
      X,
      'reference',
      1,
    ])
    database.run('insert into paper_relations (from_id, to_id, type, weight) values (?,?,?,?)', [
      B,
      X,
      'reference',
      1,
    ])
    database.run('insert into paper_relations (from_id, to_id, type, weight) values (?,?,?,?)', [
      A,
      B,
      'coupling',
      40,
    ])

    const result = await run()
    expect(result.best!.kind).toBe('coupling')
    expect(result.best!.nodeIds).toEqual([A, X, B])
  })

  test('falls back to a coupling summary row when the backing rows are gone', async () => {
    world.papers.set(A, paper(A))
    world.papers.set(B, paper(B))
    database.run('insert into paper_relations (from_id, to_id, type, weight) values (?,?,?,?)', [
      A,
      B,
      'coupling',
      6,
    ])

    const result = await run()
    expect(result.found).toBe(true)
    expect(result.best!.kind).toBe('coupling')
    expect(result.best!.nodeIds).toEqual([A, B])
    expect(result.best!.summary).toContain('存在文献耦合')
  })

  test(
    'snowballs outward when the endpoints share nothing directly',
    async () => {
      world.papers.set(A, paper(A, { references: [paper(M, { citationCount: 500 })] }))
      world.papers.set(B, paper(B, { references: [paper('N')] }))
      world.papers.set(M, paper(M, { references: [paper(B)] }))
      world.papers.set('N', paper('N'))

      const result = await run()
      expect(result.found).toBe(true)
      expect(result.best!.nodeIds).toEqual([A, M, B])
      expect(result.stats.source).toBe('live')
      expect(world.calls.length).toBeGreaterThan(1)
    },
    // This is the one test that deliberately walks several upstream rounds, and
    // the spacing between those calls is a real setting: `bun run test:server`
    // zeroes it, but a bare `bun test server/` would otherwise hit the default
    // 5 s limit and look like a product bug.
    30_000,
  )

  test('stays offline when live is disabled', async () => {
    world.papers.set(A, paper(A, { references: [paper(M)] }))
    world.papers.set(B, paper(B, { references: [paper('N')] }))
    world.papers.set(M, paper(M, { references: [paper(B)] }))

    const result = await run(A, B, { live: false })
    expect(result.found).toBe(false)
    expect(result.best).toBeNull()
    expect(world.calls).toHaveLength(1)
  })

  test('falls back to semantic similarity when there is no structural route', async () => {
    world.papers.set(A, paper(A))
    world.papers.set(B, paper(B))
    seedSimilar()

    const result = await run()
    expect(result.found).toBe(true)
    expect(result.best!.kind).toBe('semantic_bridge')
    expect(result.best!.nodeIds).toEqual([A, B])
    expect(result.signals.semanticSimilarity).toBeGreaterThan(0.99)
  })

  test('bridges two papers through a work similar to both', async () => {
    world.papers.set(A, paper(A, { references: [paper(Z, { title: '桥梁' })] }))
    world.papers.set(B, paper(B))
    seedEmbedding(A, [1, 0])
    seedEmbedding(B, [0.8, 0.6])
    seedEmbedding(Z, [0.9, 0.436])

    const result = await run()
    expect(result.found).toBe(true)
    expect(result.best!.kind).toBe('semantic_bridge')
    expect(result.best!.nodeIds).toEqual([A, Z, B])
  })

  test('reports shared fields and authors even when nothing connects', async () => {
    world.papers.set(
      A,
      paper(A, { fieldsOfStudy: ['NLP', 'ML'], authors: [{ name: '张三' }, { name: '李四' }] }),
    )
    world.papers.set(
      B,
      paper(B, { fieldsOfStudy: ['ML', 'CV'], authors: [{ name: '李四' }, { name: '王五' }] }),
    )

    const result = await run()
    expect(result.found).toBe(false)
    expect(result.best).toBeNull()
    expect(result.signals.sharedFields).toEqual(['ML'])
    expect(result.signals.sharedAuthors).toEqual(['李四'])
  })

  test('handles the same paper being passed twice', async () => {
    world.papers.set(A, paper(A))
    const result = await run(A, A)
    expect(result.found).toBe(true)
    expect(result.best!.kind).toBe('same_paper')
    expect(result.best!.nodeIds).toEqual([A])
  })

  test('answers from local SQLite when the upstream API is down', async () => {
    // A cached paper still carries its embedded references, so an upstream
    // failure degrades to a cache-only answer instead of a 500.
    // 401 rather than 429 on purpose: `withRetry` backs off for ~8s on 429/5xx
    // before giving up, and the fallback under test is the same either way.
    database.run(
      `insert into papers (id, title, raw, citation_count) values (?,?,?,?)`,
      [A, '论文甲', JSON.stringify(paper(A, { title: '论文甲', references: [paper(X, { title: '共同祖先' })] })), 1],
    )
    database.run('insert into papers (id, title) values (?,?)', [B, '论文乙'])
    database.run('insert into paper_relations (from_id, to_id, type, weight) values (?,?,?,?)', [B, X, 'reference', 1])
    world.embeddings.set(A, [1, 0])
    world.embeddings.set(B, [0, 1])
    restore = mockS2(world)
    globalThis.fetch = (async () => new Response('{"error":"unauthorized"}', { status: 401 })) as unknown as typeof fetch

    const result = await findConnection(A, B, { db: database })
    expect(result.found).toBe(true)
    expect(result.best!.kind).toBe('coupling')
    expect(result.best!.nodeIds).toEqual([A, X, B])
    expect(result.stats.upstreamUnavailable).toBe(true)
  })

  test('still reports a genuinely unknown paper as not found when offline', async () => {
    restore = mockS2(world)
    globalThis.fetch = (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch
    await expect(findConnection(A, 'PAPER_MISSING', { db: database })).rejects.toMatchObject({
      code: 'PAPER_NOT_FOUND',
    })
  })

  test('propagates a missing endpoint as a 404-style ApiError', async () => {
    world.papers.set(A, paper(A))
    await expect(run()).rejects.toMatchObject({ code: 'PAPER_NOT_FOUND' })
  })

  test('writes what it learned back into SQLite', async () => {
    world.papers.set(A, paper(A, { references: [paper(X)] }))
    world.papers.set(B, paper(B, { references: [paper(X)] }))
    await run()

    const rows = database
      .query('select from_id, to_id, type from paper_relations order by from_id')
      .all() as { from_id: string; to_id: string; type: string }[]
    expect(rows).toContainEqual({ from_id: A, to_id: X, type: 'reference' })
    expect(rows).toContainEqual({ from_id: B, to_id: X, type: 'reference' })
  })
})
