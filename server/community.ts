export interface WeightedEdge {
  from: string
  to: string
  weight: number
}

export interface LouvainOptions {
  resolution?: number
  maxPasses?: number
}

/**
 * Louvain modularity local-moving (single level). Good enough for the graph
 * sizes this app renders (<= 300 nodes); returns a normalized community id per
 * node (0..k-1 in first-seen order).
 */
export function louvain(
  nodeIds: string[],
  edges: WeightedEdge[],
  opts: LouvainOptions = {},
): Map<string, number> {
  const resolution = opts.resolution ?? 1
  const maxPasses = opts.maxPasses ?? 20

  const adj = new Map<string, Map<string, number>>()
  for (const id of nodeIds) adj.set(id, new Map())
  let m = 0
  for (const e of edges) {
    if (e.from === e.to) continue
    const a = adj.get(e.from)
    const b = adj.get(e.to)
    if (!a || !b) continue
    const w = e.weight > 0 ? e.weight : 1
    a.set(e.to, (a.get(e.to) ?? 0) + w)
    b.set(e.from, (b.get(e.from) ?? 0) + w)
    m += w
  }

  if (m === 0) return normalize(nodeIds, new Map(nodeIds.map((id, i) => [id, i])))

  const degree = new Map<string, number>()
  for (const id of nodeIds) {
    let d = 0
    for (const w of adj.get(id)!.values()) d += w
    degree.set(id, d)
  }

  const comm = new Map<string, number>()
  const commTotal = new Map<number, number>()
  nodeIds.forEach((id, i) => {
    comm.set(id, i)
    commTotal.set(i, degree.get(id)!)
  })

  const twoM = 2 * m
  let improved = true
  let passes = 0
  while (improved && passes < maxPasses) {
    improved = false
    passes++
    for (const node of nodeIds) {
      const cur = comm.get(node)!
      const k = degree.get(node)!
      const wToComm = new Map<number, number>()
      for (const [nb, w] of adj.get(node)!) {
        const c = comm.get(nb)!
        wToComm.set(c, (wToComm.get(c) ?? 0) + w)
      }

      commTotal.set(cur, commTotal.get(cur)! - k)
      let bestComm = cur
      let bestGain = (wToComm.get(cur) ?? 0) - (resolution * (commTotal.get(cur) ?? 0) * k) / twoM
      for (const [c, w] of wToComm) {
        const gain = w - (resolution * (commTotal.get(c) ?? 0) * k) / twoM
        if (gain > bestGain) {
          bestGain = gain
          bestComm = c
        }
      }
      commTotal.set(bestComm, (commTotal.get(bestComm) ?? 0) + k)
      if (bestComm !== cur) {
        comm.set(node, bestComm)
        improved = true
      }
    }
  }

  return normalize(nodeIds, comm)
}

function normalize(nodeIds: string[], comm: Map<string, number>): Map<string, number> {
  const relabel = new Map<number, number>()
  const out = new Map<string, number>()
  for (const id of nodeIds) {
    const c = comm.get(id) ?? 0
    if (!relabel.has(c)) relabel.set(c, relabel.size)
    out.set(id, relabel.get(c)!)
  }
  return out
}
