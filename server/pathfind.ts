/**
 * Pure graph search behind "how are these two papers connected?".
 *
 * The relation store mixes kinds with different semantics:
 *   reference / citation  directed, citing -> cited (Semantic Scholar ground truth)
 *   coupling              symmetric, the two papers share >= N references
 *   related               symmetric affinity (S2 recommendations / OpenAlex related)
 *   semantic              symmetric SPECTER2 kNN similarity
 *
 * Traversal is intentionally direction-agnostic: being cited by a paper still
 * connects you to its lineage, and Connected Papers lays the graph out
 * undirected anyway. Every hop nevertheless records whether it ran with or
 * against the stored direction, so the UI can say "A 引用了 X" honestly.
 */

export type PathEdgeType = 'reference' | 'citation' | 'related' | 'coupling' | 'semantic'

export interface PathEdge {
  from: string
  to: string
  type: PathEdgeType
  weight: number
}

/** A move from the current node to `node` along `edge`. */
export interface Traversal {
  node: string
  edge: PathEdge
}

export type Adjacency = Map<string, Traversal[]>

/**
 * One hop of a solved path.
 *
 * `from`/`to` always describe the *stored relation* (citing -> cited), never the
 * walk direction, so per-hop prose stays truthful even when the path doubles
 * back. `arrive` is the node the walk reaches, and `forward` says whether the
 * walk agreed with the stored direction.
 */
export interface PathStep {
  from: string
  to: string
  type: PathEdgeType
  weight: number
  arrive: string
  forward: boolean
}

export type PathKind =
  | 'same_paper'
  | 'direct'
  | 'citation_path'
  | 'coupling'
  | 'co_citation'
  | 'semantic_bridge'

/** How much a single hop should be trusted — ground-truth citation beats a kNN guess. */
export function edgeConfidence(type: PathEdgeType): number {
  switch (type) {
    case 'reference':
      return 1
    case 'citation':
      return 0.95
    case 'coupling':
      return 0.8
    case 'related':
      return 0.6
    case 'semantic':
      return 0.45
    default:
      return 0.4
  }
}

/** Types whose stored order carries no meaning. */
export function isSymmetric(type: PathEdgeType): boolean {
  return type === 'coupling' || type === 'related' || type === 'semantic'
}

/** Neighbours reachable in one hop, each edge traversable in both directions. */
export function buildAdjacency(edges: readonly PathEdge[]): Adjacency {
  const adj: Adjacency = new Map()
  const push = (from: string, t: Traversal) => {
    const list = adj.get(from)
    if (list) list.push(t)
    else adj.set(from, [t])
  }
  for (const edge of edges) {
    if (!edge.from || !edge.to || edge.from === edge.to) continue
    push(edge.from, { node: edge.to, edge })
    push(edge.to, { node: edge.from, edge })
  }
  return adj
}

function makeStep(edge: PathEdge, walkFrom: string, walkTo: string): PathStep {
  return {
    from: edge.from,
    to: edge.to,
    type: edge.type,
    weight: edge.weight,
    arrive: walkTo,
    forward: walkFrom === edge.from && walkTo === edge.to,
  }
}

/** A parent link expressed as a walk (from -> to) pointing back toward the root. */
interface BackLink {
  from: string
  to: string
  edge: PathEdge
}

/** Walk parent pointers back to the root, returning the links in walk order (node -> root). */
function traceBack(parents: Map<string, { prev: string; edge: PathEdge }>, node: string): BackLink[] {
  const links: BackLink[] = []
  let cur = node
  const guard = parents.size + 2
  for (let i = 0; i < guard; i++) {
    const p = parents.get(cur)
    if (!p) break
    links.push({ from: cur, to: p.prev, edge: p.edge })
    cur = p.prev
  }
  return links
}

/**
 * Join the two search trees at `mid`.
 *
 * Side A's links point mid -> start, so the forward path is those links
 * reversed in both order and direction. Side B's links already point
 * mid -> goal, which is exactly the forward path for that half.
 */
export function splicePath(
  parentsA: Map<string, { prev: string; edge: PathEdge }>,
  parentsB: Map<string, { prev: string; edge: PathEdge }>,
  mid: string,
): PathStep[] {
  const linksA = traceBack(parentsA, mid)
  const linksB = traceBack(parentsB, mid)

  const steps: PathStep[] = []
  for (let i = linksA.length - 1; i >= 0; i--) {
    const l = linksA[i]
    steps.push(makeStep(l.edge, l.to, l.from))
  }
  for (const l of linksB) {
    steps.push(makeStep(l.edge, l.from, l.to))
  }
  return steps
}

/**
 * Shortest path from `start` to `goal`, ties broken toward higher-confidence hops.
 *
 * Level-synchronous bidirectional BFS: only full levels are expanded, and the
 * shallower side goes first, so the first touch point yields a shortest path.
 */
export function bidirectionalPath(
  start: string,
  goal: string,
  adj: Adjacency,
  opts: { maxHops?: number; maxVisited?: number } = {},
): PathStep[] | null {
  if (start === goal) return []
  const maxHops = opts.maxHops ?? 8
  const maxVisited = opts.maxVisited ?? 20_000
  const maxSideDepth = Math.max(1, Math.ceil(maxHops / 2))

  const parentsA = new Map<string, { prev: string; edge: PathEdge }>()
  const parentsB = new Map<string, { prev: string; edge: PathEdge }>()
  const seenA = new Set<string>([start])
  const seenB = new Set<string>([goal])
  let frontierA = [start]
  let frontierB = [goal]
  let depthA = 0
  let depthB = 0

  while (frontierA.length && frontierB.length && seenA.size + seenB.size < maxVisited) {
    const expandA = depthA <= depthB
    const frontier = expandA ? frontierA : frontierB
    const ownSeen = expandA ? seenA : seenB
    const otherSeen = expandA ? seenB : seenA
    const ownParents = expandA ? parentsA : parentsB
    const ownDepth = expandA ? depthA : depthB
    if (ownDepth >= maxSideDepth) break

    const next: string[] = []
    let meet: string | null = null

    for (const node of frontier) {
      for (const t of adj.get(node) ?? []) {
        const nb = t.node
        if (ownSeen.has(nb)) continue
        ownParents.set(nb, { prev: node, edge: t.edge })
        ownSeen.add(nb)
        if (otherSeen.has(nb)) {
          meet = nb
          break
        }
        next.push(nb)
      }
      if (meet) break
    }

    if (meet) return splicePath(parentsA, parentsB, meet)

    if (expandA) {
      frontierA = next
      depthA++
    } else {
      frontierB = next
      depthB++
    }
  }
  return null
}

/** Node sequence a path walks through, starting at `start`. */
export function pathNodeIds(start: string, steps: readonly PathStep[]): string[] {
  const ids = [start]
  for (const s of steps) ids.push(s.arrive)
  return ids
}

/**
 * Two papers that both reference `middle` (bibliographic coupling) — the signal
 * Connected Papers is built around. Walkable as start -> middle <- goal.
 */
export function couplingSteps(start: string, goal: string, middle: string, weight = 1): PathStep[] {
  return [
    // Both edges are stored start->middle and goal->middle; the walk visits
    // start, middle, then goal, so the second hop runs against the stored order.
    makeStep({ from: start, to: middle, type: 'reference', weight }, start, middle),
    makeStep({ from: goal, to: middle, type: 'reference', weight }, middle, goal),
  ]
}

/** Two papers both referenced by `middle` (co-citation). Walkable as start <- middle -> goal. */
export function coCitationSteps(start: string, goal: string, middle: string, weight = 1): PathStep[] {
  return [
    makeStep({ from: middle, to: start, type: 'citation', weight }, start, middle),
    makeStep({ from: middle, to: goal, type: 'citation', weight }, middle, goal),
  ]
}

/** Types that assert a real citation link (as opposed to affinity or similarity). */
function isCitationish(type: PathEdgeType): boolean {
  return type === 'reference' || type === 'citation'
}

/** A single semantic-similarity hop (no citation relation exists). */
export function semanticSteps(a: string, b: string, weight: number): PathStep[] {
  return [makeStep({ from: a, to: b, type: 'semantic', weight }, a, b)]
}

/** Two papers with no shared lineage, bridged by a work similar to both. */
export function semanticBridgeSteps(
  a: string,
  mid: string,
  b: string,
  weightA: number,
  weightB: number,
): PathStep[] {
  return [
    makeStep({ from: a, to: mid, type: 'semantic', weight: weightA }, a, mid),
    makeStep({ from: mid, to: b, type: 'semantic', weight: weightB }, mid, b),
  ]
}

export function classifyPath(steps: readonly PathStep[]): PathKind {
  if (steps.length === 0) return 'same_paper'
  // An all-semantic route is a similarity bridge, never a citation claim.
  if (steps.every((s) => s.type === 'semantic')) return 'semantic_bridge'
  if (steps.length === 1) {
    // One hop is only a citation claim when it *is* a citation. A coupling row
    // is a derived summary and `related` / `semantic` rows are similarity
    // guesses, so those must not be dressed up as "A cites B".
    const only = steps[0].type
    if (only === 'coupling') return 'coupling'
    if (isSymmetric(only)) return 'semantic_bridge'
    return 'direct'
  }
  if (steps.length === 2) {
    const [a, b] = steps
    // Classified by shape, not by the stored type tag: the local `citations`
    // table cannot tell whether a row was discovered as a reference or as a
    // citation, yet the shape is unambiguous.
    if (isCitationish(a.type) && isCitationish(b.type)) {
      // Coupling: both papers reference the same work, so both hops point at it.
      if (a.to === b.to) return 'coupling'
      // Co-citation: one work references both papers, so both hops leave it.
      if (a.from === b.from) return 'co_citation'
    }
  }
  if (steps.every((s) => isSymmetric(s.type))) return 'semantic_bridge'
  return 'citation_path'
}

/**
 * Trust in one hop, folding in its weight: a coupling edge backed by 40 shared
 * references is far stronger evidence than one backed by the minimum of 2, and
 * a semantic edge's cosine similarity is its own confidence.
 */
export function hopConfidence(type: PathEdgeType, weight = 1): number {
  const base = edgeConfidence(type)
  if (type === 'semantic') return base * Math.max(0.2, Math.min(1, weight || 0))
  if (type === 'coupling') return base * Math.min(1, 0.75 + Math.log10(Math.max(1, weight) + 1) / 2)
  if (type === 'related') return base * Math.min(1, 0.8 + Math.log10(Math.max(1, weight) + 1) / 4)
  return base
}

/**
 * Rank a path: shorter wins, and among equals the one whose *weakest* hop is
 * strongest wins — a path is only as trustworthy as its shakiest link.
 */
export function pathScore(steps: readonly PathStep[]): number {
  const hops = steps.length
  if (hops === 0) return 0
  let sum = 0
  let weakest = 1
  for (const s of steps) {
    const c = hopConfidence(s.type, s.weight)
    sum += c
    if (c < weakest) weakest = c
  }
  const avg = sum / hops
  return (((avg + weakest) / 2) * 100) / (hops + 1)
}

/** Deduplicate paths by the node sequence they walk. */
export function pathKey(start: string, steps: readonly PathStep[]): string {
  return pathNodeIds(start, steps).join('>')
}

/**
 * Collect up to `limit` distinct paths by banning an interior node of each path
 * found so far, which surfaces genuinely different routes (a coupling bridge,
 * then a citation chain) instead of trivially shifted ones.
 */
export function rankedPaths(
  start: string,
  goal: string,
  adj: Adjacency,
  opts: { limit?: number; maxHops?: number; maxVisited?: number } = {},
): PathStep[][] {
  const limit = opts.limit ?? 3
  const banned = new Set<string>()
  const out: PathStep[][] = []
  const seen = new Set<string>()

  for (let i = 0; i < limit * 3 && out.length < limit; i++) {
    const pruned: Adjacency = new Map()
    for (const [node, list] of adj) {
      const kept = banned.size ? list.filter((t) => !banned.has(t.node)) : list
      pruned.set(node, kept)
    }
    const path = bidirectionalPath(start, goal, pruned, { maxHops: opts.maxHops, maxVisited: opts.maxVisited })
    if (!path || path.length === 0) break
    const key = pathKey(start, path)
    if (!seen.has(key)) {
      seen.add(key)
      out.push(path)
    }
    const interior = path.map((s) => s.arrive).filter((id) => id !== goal)
    if (!interior.length) break
    banned.add(interior[Math.floor(interior.length / 2)])
  }
  return out.sort((a, b) => pathScore(b) - pathScore(a))
}

/** Ids present in both collections, order taken from `a`, capped at `limit`. */
export function intersectIds(a: Iterable<string>, b: Iterable<string>, limit = 10): string[] {
  const setB = b instanceof Set ? b : new Set(b)
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of a) {
    if (!setB.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= limit) break
  }
  return out
}

/** Human-readable Chinese explanation of a single hop. */
export function explainHop(step: PathStep, titles: Map<string, string>): string {
  const label = (id: string) => titles.get(id) || id
  const from = label(step.from)
  const to = label(step.to)
  switch (step.type) {
    case 'reference':
      return `${from} 引用了 ${to}`
    case 'citation':
      return `${from} 引用了 ${to}`
    case 'coupling':
      return `${from} 与 ${to} 存在共同引用（文献耦合）`
    case 'related':
      return `${from} 与 ${to} 被推荐为相关研究`
    case 'semantic':
      return `${from} 与 ${to} 语义相似（SPECTER2 ≈ ${step.weight.toFixed(2)}）`
    default:
      return `${from} 与 ${to} 相关`
  }
}

/** One-line summary of the whole path, phrased for the connector that was found. */
export function describePath(
  start: string,
  goal: string,
  steps: readonly PathStep[],
  titles: Map<string, string>,
): string {
  const label = (id: string) => titles.get(id) || id
  const kind = classifyPath(steps)
  void goal
  if (kind === 'same_paper') return '两篇是同一篇论文'
  if (kind === 'direct') return explainHop(steps[0], titles)
  // A one-hop coupling is a stored summary row: the shared works were never
  // traversed, so there is no middle paper to name.
  if (kind === 'coupling') {
    if (steps.length < 2) return '两篇论文存在文献耦合（引用相同的文献），属于同一研究方向'
    return `两篇论文共同引用了 ${label(steps[0].arrive)}，属于同一研究方向`
  }
  if (kind === 'co_citation') {
    if (steps.length < 2) return '两篇论文存在共被引关系，常被并列讨论'
    return `两篇论文同时被 ${label(steps[0].arrive)} 引用，常被并列讨论`
  }
  if (kind === 'semantic_bridge') {
    const mids = steps.slice(0, -1).map((s) => label(s.arrive))
    if (!mids.length) return explainHop(steps[0], titles)
    return `没有直接引用关系，但经由 ${mids.join(' → ')} 语义相连`
  }
  const mids = steps.slice(0, -1).map((s) => label(s.arrive))
  return `经由 ${mids.length} 篇中间论文相连：${mids.join(' → ')}（共 ${steps.length} 跳）`
}
