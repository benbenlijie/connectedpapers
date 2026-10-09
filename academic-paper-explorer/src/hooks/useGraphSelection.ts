import { useMemo } from 'react'
import { useUiStore } from '../store/useUiStore'
import { usePaperNetwork } from './usePaperNetwork'
import { nodeToPaper } from '../graph/graphAdapter'
import type { Paper } from '../types/domain'

interface GraphSelection {
  /** The most recently clicked graph node as a Paper, or null. */
  selected: Paper | null
  /** Best title known for a paper id, from either pane's cached network. */
  titleOf: (id: string | null | undefined) => string | null
}

/**
 * Read the graph's current selection as a Paper.
 *
 * DetailsPanel already resolves "which node is the user looking at" with a
 * compare-pane-wins precedence, so this mirrors it rather than inventing a
 * second convention. It reads the same React Query keys NetworkGraph uses
 * (including the pinned depth / maxNodes) so it piggybacks on the cached
 * network instead of triggering another crawl.
 */
export function useGraphSelection(): GraphSelection {
  const selectedPaper = useUiStore((s) => s.selectedPaper)
  const comparePaper = useUiStore((s) => s.comparePaper)
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)
  const compareSelectedNodeId = useUiStore((s) => s.compareSelectedNodeId)
  const graphDepth = useUiStore((s) => s.graphDepth)
  const graphMaxNodes = useUiStore((s) => s.graphMaxNodes)
  const connection = useUiStore((s) => s.connection)

  const depth = graphDepth ?? undefined
  const maxNodes = graphMaxNodes ?? undefined
  const primary = usePaperNetwork(selectedPaper, depth, maxNodes)
  const compare = usePaperNetwork(comparePaper, depth, maxNodes)

  // Titles for URL-restored papers that only carry an id: the network payload
  // already holds them, so a slot can show a real title instead of a hash.
  const titles = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of compare.data?.nodes ?? []) if (n.title) map.set(n.id, n.title)
    for (const n of primary.data?.nodes ?? []) if (n.title) map.set(n.id, n.title)
    // A shared ?from/?to link carries no root paper, so nothing above resolves —
    // but the answer the server returns names both ends.
    if (connection) {
      for (const n of [connection.from, connection.to]) {
        if (n?.id && n.title) map.set(n.id, n.title)
      }
    }
    return map
  }, [primary.data, compare.data, connection])

  const selected = useMemo(() => {
    const id = compareSelectedNodeId || selectedNodeId
    if (!id) return null
    const nodes = (compareSelectedNodeId ? compare.data : primary.data)?.nodes ?? []
    const node = nodes.find((n) => n.id === id)
    return node ? nodeToPaper(node) : null
  }, [compareSelectedNodeId, selectedNodeId, compare.data, primary.data])

  const titleOf = useMemo(() => {
    const rootFallbacks: [string | null, string | undefined][] = [
      [comparePaper ? (comparePaper.semantic_scholar_id || comparePaper.id) : null, comparePaper?.title],
      [selectedPaper ? (selectedPaper.semantic_scholar_id || selectedPaper.id) : null, selectedPaper?.title],
    ]
    return (id: string | null | undefined) => {
      if (!id) return null
      const fromGraph = titles.get(id)
      if (fromGraph) return fromGraph
      for (const [key, title] of rootFallbacks) if (key === id && title) return title
      return null
    }
  }, [titles, comparePaper, selectedPaper])

  return { selected, titleOf }
}
