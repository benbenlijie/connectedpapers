import { test, expect, describe } from 'bun:test'
import {
  bidirectionalPath,
  buildAdjacency,
  classifyPath,
  coCitationSteps,
  couplingSteps,
  describePath,
  edgeConfidence,
  explainHop,
  hopConfidence,
  intersectIds,
  isSymmetric,
  pathKey,
  pathNodeIds,
  pathScore,
  rankedPaths,
  type PathEdge,
  type PathStep,
} from './pathfind'

const ref = (from: string, to: string, weight = 1): PathEdge => ({ from, to, type: 'reference', weight })
const cite = (citing: string, cited: string, weight = 1): PathEdge => ({
  from: citing,
  to: cited,
  type: 'citation',
  weight,
})
const sem = (a: string, b: string, weight = 0.9): PathEdge => ({ from: a, to: b, type: 'semantic', weight })

/** Turn a chain of edges into the PathStep[] a walk along it would produce. */
const walk = (start: string, edges: PathEdge[]): PathStep[] => {
  const steps: PathStep[] = []
  let cur = start
  for (const e of edges) {
    const next = e.from === cur ? e.to : e.from
    steps.push({
      from: e.from,
      to: e.to,
      type: e.type,
      weight: e.weight,
      arrive: next,
      forward: e.from === cur,
    })
    cur = next
  }
  return steps
}
const semWalk = (): PathStep[] => walk('A', [sem('A', 'X'), sem('X', 'B')])

describe('buildAdjacency', () => {
  test('every edge is walkable in both directions', () => {
    const adj = buildAdjacency([ref('A', 'B')])
    expect(adj.get('A')).toEqual([{ node: 'B', edge: ref('A', 'B') }])
    expect(adj.get('B')).toEqual([{ node: 'A', edge: ref('A', 'B') }])
  })

  test('drops self loops and blank endpoints', () => {
    const adj = buildAdjacency([ref('A', 'A'), { from: '', to: 'B', type: 'reference', weight: 1 }])
    expect(adj.size).toBe(0)
  })
})

describe('classifyPath for a single hop', () => {
  // A one-hop path is not automatically "A cites B": the local table holds
  // derived summary rows and similarity guesses too.
  test('a lone reference hop is a direct citation', () => {
    expect(classifyPath(walk('A', [ref('A', 'B')]))).toBe('direct')
  })

  test('a lone citation hop is a direct citation', () => {
    expect(classifyPath(walk('A', [cite('B', 'A')]))).toBe('direct')
  })

  test('a lone coupling summary row is not dressed up as a citation', () => {
    const edge: PathEdge = { from: 'A', to: 'B', type: 'coupling', weight: 6 }
    expect(classifyPath(walk('A', [edge]))).toBe('coupling')
  })

  test('lone related and semantic hops are similarity bridges', () => {
    const related: PathEdge = { from: 'A', to: 'B', type: 'related', weight: 3 }
    expect(classifyPath(walk('A', [related]))).toBe('semantic_bridge')
    expect(classifyPath(walk('A', [sem('A', 'B')]))).toBe('semantic_bridge')
  })
})

describe('bidirectionalPath', () => {
  test('finds a direct edge in one hop', () => {
    const adj = buildAdjacency([ref('A', 'B')])
    const path = bidirectionalPath('A', 'B', adj)!
    expect(pathNodeIds('A', path)).toEqual(['A', 'B'])
    expect(path).toHaveLength(1)
    expect(path[0].forward).toBe(true)
    expect(classifyPath(path)).toBe('direct')
  })

  test('records walking against the stored direction', () => {
    // Stored: B cites A, i.e. the walk A -> B runs against it.
    const adj = buildAdjacency([cite('B', 'A')])
    const path = bidirectionalPath('A', 'B', adj)!
    expect(path).toHaveLength(1)
    expect(path[0].forward).toBe(false)
    expect(path[0].from).toBe('B')
    expect(path[0].to).toBe('A')
    expect(explainHop(path[0], new Map())).toBe('B 引用了 A')
  })

  test('walks a multi-hop chain in order', () => {
    const adj = buildAdjacency([ref('A', 'X'), ref('X', 'Y'), ref('Y', 'B')])
    const path = bidirectionalPath('A', 'B', adj)!
    expect(pathNodeIds('A', path)).toEqual(['A', 'X', 'Y', 'B'])
    expect(path.map((s) => s.arrive)).toEqual(['X', 'Y', 'B'])
    expect(path.every((s) => s.forward)).toBe(true)
    expect(classifyPath(path)).toBe('citation_path')
  })

  test('prefers the shortest route when several exist', () => {
    const adj = buildAdjacency([
      ref('A', 'X'),
      ref('X', 'Y'),
      ref('Y', 'B'),
      ref('A', 'B'),
    ])
    const path = bidirectionalPath('A', 'B', adj)!
    expect(path).toHaveLength(1)
  })

  test('returns null when the two papers are not connected', () => {
    const adj = buildAdjacency([ref('A', 'X'), ref('B', 'Y')])
    expect(bidirectionalPath('A', 'B', adj)).toBeNull()
  })

  test('returns an empty path for the same paper', () => {
    expect(bidirectionalPath('A', 'A', buildAdjacency([]))).toEqual([])
    expect(classifyPath([])).toBe('same_paper')
  })

  test('respects the hop budget', () => {
    const adj = buildAdjacency([ref('A', 'X'), ref('X', 'Y'), ref('Y', 'B')])
    expect(bidirectionalPath('A', 'B', adj, { maxHops: 2 })).toBeNull()
    expect(bidirectionalPath('A', 'B', adj, { maxHops: 3 })).not.toBeNull()
  })

  test('finds a path that only exists in one direction of a long chain', () => {
    // Deliberately asymmetric: the meeting point is deep on one side.
    const edges: PathEdge[] = []
    for (let i = 0; i < 6; i++) edges.push(ref(`n${i}`, `n${i + 1}`))
    const adj = buildAdjacency(edges)
    const path = bidirectionalPath('n0', 'n6', adj)!
    expect(pathNodeIds('n0', path)).toEqual(['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6'])
  })
})

describe('coupling and co-citation shapes', () => {
  test('coupling walks start -> middle <- goal', () => {
    const steps = couplingSteps('A', 'B', 'X')
    expect(pathNodeIds('A', steps)).toEqual(['A', 'X', 'B'])
    expect(steps[0]).toMatchObject({ from: 'A', to: 'X', arrive: 'X', forward: true })
    expect(steps[1]).toMatchObject({ from: 'B', to: 'X', arrive: 'B', forward: false })
    expect(classifyPath(steps)).toBe('coupling')
  })

  test('co-citation walks start <- middle -> goal', () => {
    const steps = coCitationSteps('A', 'B', 'X')
    expect(pathNodeIds('A', steps)).toEqual(['A', 'X', 'B'])
    expect(steps[0]).toMatchObject({ from: 'X', to: 'A', arrive: 'X', forward: false })
    expect(steps[1]).toMatchObject({ from: 'X', to: 'B', arrive: 'B', forward: true })
    expect(classifyPath(steps)).toBe('co_citation')
  })

  test('explains each coupling hop with the real citation direction', () => {
    const titles = new Map([['A', '论文A'], ['B', '论文B'], ['X', '桥梁X']])
    const steps = couplingSteps('A', 'B', 'X')
    expect(explainHop(steps[0], titles)).toBe('论文A 引用了 桥梁X')
    expect(explainHop(steps[1], titles)).toBe('论文B 引用了 桥梁X')
    expect(describePath('A', 'B', steps, titles)).toBe('两篇论文共同引用了 桥梁X，属于同一研究方向')
  })

  test('a genuine two-hop citation chain is not mistaken for coupling', () => {
    const adj = buildAdjacency([ref('A', 'X'), ref('X', 'B')])
    const path = bidirectionalPath('A', 'B', adj)!
    expect(classifyPath(path)).toBe('citation_path')
    expect(describePath('A', 'B', path, new Map([['X', 'X']]))).toBe('经由 1 篇中间论文相连：X（共 2 跳）')
  })
})

describe('score and ranking', () => {
  const direct: PathStep[] = walk('A', [ref('A', 'B')])

  test('a direct citation beats a two-hop semantic bridge', () => {
    expect(pathScore(direct)).toBeGreaterThan(pathScore(semWalk()))
  })

  test('a two-hop coupling bridge beats a two-hop semantic bridge', () => {
    expect(pathScore(couplingSteps('A', 'B', 'X'))).toBeGreaterThan(pathScore(semWalk()))
  })

  test('a shorter path of equal confidence outranks a longer one', () => {
    const two = couplingSteps('A', 'B', 'X')
    const three = walk('A', [ref('A', 'X'), ref('X', 'Y'), ref('Y', 'B')])
    expect(pathScore(two)).toBeGreaterThan(pathScore(three))
  })

  test('a coupling edge backed by more shared references scores higher', () => {
    expect(hopConfidence('coupling', 40)).toBeGreaterThan(hopConfidence('coupling', 2))
  })

  test('a semantic edge scores with its cosine similarity', () => {
    expect(hopConfidence('semantic', 0.95)).toBeGreaterThan(hopConfidence('semantic', 0.5))
  })

  test('ground-truth citation hops ignore the display weight', () => {
    expect(hopConfidence('reference', 40)).toBe(hopConfidence('reference', 1))
  })

  test('edge confidence is ordered citation > related > semantic', () => {
    expect(edgeConfidence('reference')).toBeGreaterThan(edgeConfidence('citation'))
    expect(edgeConfidence('citation')).toBeGreaterThan(edgeConfidence('related'))
    expect(edgeConfidence('related')).toBeGreaterThan(edgeConfidence('semantic'))
  })

  test('classifies an all-semantic route as a semantic bridge', () => {
    expect(classifyPath(semWalk())).toBe('semantic_bridge')
  })

  test('isSymmetric marks only the undirected relations', () => {
    expect(isSymmetric('coupling')).toBe(true)
    expect(isSymmetric('semantic')).toBe(true)
    expect(isSymmetric('related')).toBe(true)
    expect(isSymmetric('reference')).toBe(false)
    expect(isSymmetric('citation')).toBe(false)
  })
})

describe('rankedPaths', () => {
  test('surfaces a different route after banning the first meeting point', () => {
    const adj = buildAdjacency([
      ref('A', 'X1'),
      ref('X1', 'B'),
      ref('A', 'X2'),
      ref('X2', 'B'),
    ])
    const paths = rankedPaths('A', 'B', adj, { limit: 2 })
    expect(paths).toHaveLength(2)
    expect(new Set(paths.map((p) => pathKey('A', p))).size).toBe(2)
    expect(paths.map((p) => p.map((s) => s.arrive).join(','))).toEqual(
      expect.arrayContaining(['X1,B', 'X2,B']),
    )
  })

  test('returns nothing when disconnected', () => {
    expect(rankedPaths('A', 'B', buildAdjacency([ref('A', 'Z')]))).toEqual([])
  })
})

describe('intersectIds', () => {
  test('keeps the order of the first collection', () => {
    expect(intersectIds(['x', 'y', 'z'], new Set(['z', 'x']))).toEqual(['x', 'z'])
  })

  test('caps the result and drops duplicates', () => {
    expect(intersectIds(['a', 'a', 'b'], ['a', 'b'], 1)).toEqual(['a'])
  })
})

describe('describePath', () => {
  test('describes a direct citation', () => {
    const step: PathStep = {
      from: 'Citing',
      to: 'Cited',
      type: 'citation',
      weight: 1,
      arrive: 'Cited',
      forward: true,
    }
    expect(describePath('Cited', 'Citing', [step], new Map([['Citing', '引用者'], ['Cited', '被引者']]))).toBe(
      '引用者 引用了 被引者',
    )
  })

  test('describes a co-citation bridge', () => {
    const titles = new Map([['M', '综述M']])
    expect(describePath('A', 'B', coCitationSteps('A', 'B', 'M'), titles)).toBe(
      '两篇论文同时被 综述M 引用，常被并列讨论',
    )
  })

  test('does not name a shared work for a one-hop coupling summary row', () => {
    const edge: PathEdge = { from: 'A', to: 'B', type: 'coupling', weight: 6 }
    // The shared works were never traversed, so naming one would be a lie.
    expect(describePath('A', 'B', walk('A', [edge]), new Map([['B', '论文乙']]))).toBe(
      '两篇论文存在文献耦合（引用相同的文献），属于同一研究方向',
    )
  })

  test('describes a one-hop semantic bridge from its hop', () => {
    expect(describePath('A', 'B', walk('A', [sem('A', 'B', 0.91)]), new Map())).toBe(
      'A 与 B 语义相似（SPECTER2 ≈ 0.91）',
    )
  })

  test('falls back to the raw id when no title is known', () => {
    expect(explainHop(couplingSteps('A', 'B', 'X')[0], new Map())).toBe('A 引用了 X')
  })
})
