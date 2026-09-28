import { getPapersBatch, type S2Paper } from './s2'
import { config } from './config'
import { upsertPaper, upsertCitation, ensurePaperStub } from './papers'

export interface GraphNode {
  id: string; label: string; title: string; abstract?: string; year?: number
  citationCount: number; authors: string; venue?: string; url?: string; pdfUrl?: string
  fieldsOfStudy: string[]; isRoot: boolean; depth: number
  pageRankScore: number; clusterId: number; size: number; color: string
}
export interface GraphEdge { from: string; to: string; type: 'reference' | 'citation'; weight: number }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }

export function connectedComponents(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    adj.get(e.from)?.push(e.to)
    adj.get(e.to)?.push(e.from)
  }
  const comp = new Map<string, number>()
  let id = 0
  for (const n of nodes) {
    if (comp.has(n.id)) continue
    const stack = [n.id]
    while (stack.length) {
      const cur = stack.pop()!
      if (comp.has(cur)) continue
      comp.set(cur, id)
      for (const nb of adj.get(cur) ?? []) if (!comp.has(nb)) stack.push(nb)
    }
    id++
  }
  return comp
}

export function pagerank(nodes: GraphNode[], edges: GraphEdge[], damping = 0.85, iterations = 20): Map<string, number> {
  const n = nodes.length
  const pr = new Map<string, number>()
  const out = new Map<string, string[]>()
  for (const node of nodes) { pr.set(node.id, 1 / n); out.set(node.id, []) }
  for (const e of edges) out.get(e.from)?.push(e.to)

  for (let i = 0; i < iterations; i++) {
    const next = new Map<string, number>()
    for (const node of nodes) next.set(node.id, (1 - damping) / n)
    let dangling = 0
    for (const node of nodes) {
      const links = out.get(node.id)!
      if (!links.length) { dangling += pr.get(node.id) ?? 0; continue }
      const share = (damping * (pr.get(node.id) ?? 0)) / links.length
      for (const t of links) {
        if (next.has(t)) next.set(t, next.get(t)! + share)
        else dangling += (pr.get(node.id) ?? 0) / links.length
      }
    }
    // 悬挂节点（无出链）的质量按标准 PageRank 均摊，保证总和恒为 1。
    const dShare = (damping * dangling) / n
    for (const node of nodes) next.set(node.id, (next.get(node.id) ?? 0) + dShare)
    for (const [k, v] of next) pr.set(k, v)
  }
  return pr
}

const DEPTH_COLORS = ['#ff6b35', '#059669', '#7c3aed', '#dc2626', '#6b7280']
const colorFor = (d: number) => DEPTH_COLORS[Math.min(d, DEPTH_COLORS.length - 1)]

function toNode(p: S2Paper, isRoot: boolean, depth: number): GraphNode {
  return {
    id: p.paperId, label: p.title ?? '未知标题', title: p.title ?? '', abstract: p.abstract,
    year: p.year, citationCount: p.citationCount ?? 0,
    authors: (p.authors ?? []).map((a) => a.name).join(', '),
    venue: p.venue, url: p.url, pdfUrl: p.openAccessPdf?.url,
    fieldsOfStudy: p.fieldsOfStudy ?? [], isRoot, depth,
    pageRankScore: 0, clusterId: 0,
    size: Math.max(15, Math.log10((p.citationCount ?? 0) + 1) * 12), color: colorFor(depth),
  }
}

export interface BuildOpts {
  depth: number
  maxNodes: number
  onProgress?: (done: number, total: number) => void
}

export async function buildNetwork(root: S2Paper, opts: BuildOpts): Promise<Graph> {
  const { depth, maxNodes, onProgress } = opts
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  const seen = new Set<string>([root.paperId])
  nodes.set(root.paperId, toNode(root, true, 0))
  upsertPaper(root)

  let frontier = [root]
  let level = 0
  const started = Date.now()

  while (frontier.length && nodes.size < maxNodes && level < depth) {
    if (Date.now() - started > config.crawl.maxExecutionMs) break
    const refIds: string[] = []
    const citeIds: string[] = []
    const refLimit = config.crawl.refLimit[Math.min(level, 3)]
    const citeLimit = config.crawl.citeLimit[Math.min(level, 3)]

    for (const paper of frontier) {
      for (const r of (paper.references ?? []).slice(0, refLimit)) {
        if (!edges.some((e) => e.from === paper.paperId && e.to === r.paperId)) {
          edges.push({ from: paper.paperId, to: r.paperId, type: 'reference', weight: 1 })
          ensurePaperStub(r.paperId)
          upsertCitation(paper.paperId, r.paperId)
        }
        if (!seen.has(r.paperId) && refIds.length + citeIds.length < maxNodes) refIds.push(r.paperId)
      }
      if (citeLimit > 0) {
        for (const c of (paper.citations ?? []).slice(0, citeLimit)) {
          if (!edges.some((e) => e.from === c.paperId && e.to === paper.paperId)) {
            edges.push({ from: c.paperId, to: paper.paperId, type: 'citation', weight: 1 })
            ensurePaperStub(c.paperId)
            upsertCitation(c.paperId, paper.paperId)
          }
          if (!seen.has(c.paperId) && refIds.length + citeIds.length < maxNodes) citeIds.push(c.paperId)
        }
      }
    }

    const wanted = [...new Set([...refIds, ...citeIds])].filter((id) => !seen.has(id)).slice(0, config.crawl.s2BatchSize)
    if (!wanted.length) break

    const fetched = await getPapersBatch(wanted)
    const nextFrontier: S2Paper[] = []
    fetched.forEach((p, i) => {
      if (!p || nodes.size >= maxNodes) return
      seen.add(p.paperId)
      nodes.set(p.paperId, toNode(p, false, level + 1))
      upsertPaper(p)
      nextFrontier.push(p)
    })
    onProgress?.(nodes.size, maxNodes)
    frontier = nextFrontier
    level++
    if (frontier.length && Date.now() - started < config.crawl.maxExecutionMs) {
      await new Promise((r) => setTimeout(r, config.crawl.perBatchDelayMs))
    }
  }

  const nodeList = [...nodes.values()]
  const pr = pagerank(nodeList, edges)
  const comps = connectedComponents(nodeList, edges)
  for (const node of nodeList) {
    node.pageRankScore = pr.get(node.id) ?? 0
    node.clusterId = comps.get(node.id) ?? 0
    node.size = Math.max(15, node.pageRankScore * 1000)
  }
  return { nodes: nodeList, edges }
}
