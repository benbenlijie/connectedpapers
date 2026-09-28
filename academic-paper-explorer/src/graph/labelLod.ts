export interface LabelNode {
  id: string
  isRoot: boolean
  size: number
}

export interface LabelLodOptions {
  activeId: string | null
  neighborIds: Set<string>
  globalScale: number
  limit: number
}

export const ZOOM_LABEL_THRESHOLD = 1.1

export function pickVisibleLabels(nodes: LabelNode[], opts: LabelLodOptions): Set<string> {
  const visible = new Set<string>()
  for (const n of nodes) {
    if (n.isRoot || n.id === opts.activeId || opts.neighborIds.has(n.id)) visible.add(n.id)
  }
  if (opts.globalScale < ZOOM_LABEL_THRESHOLD || opts.limit <= 0) return visible
  const rest = nodes.filter((n) => !visible.has(n.id)).sort((a, b) => b.size - a.size)
  for (const n of rest.slice(0, opts.limit)) visible.add(n.id)
  return visible
}
