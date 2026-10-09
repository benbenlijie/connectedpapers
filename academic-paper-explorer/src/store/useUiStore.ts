import { create } from 'zustand'
import type { Paper, EdgeType, PaperConnection } from '../types/domain'
import { resolvePaperKey } from '../lib/paperKey'
import type { ColorMode, SizeMode } from '../graph/encoding'

interface UiState {
  selectedPaper: Paper | null
  selectedNodeId: string | null
  highlightedNodes: string[]
  submittedQuery: { query: string; query_type: string } | null
  filters: {
    yearRange: [number, number]
    minCitations: number
    selectedFields: string[]
    selectedVenues: string[]
  }
  graphView: '2d' | '3d'
  colorMode: ColorMode
  sizeMode: SizeMode
  timelineYear: number | null
  timelinePlaying: boolean
  graphQuery: string
  graphDepth: number | null
  graphMaxNodes: number | null
  expandedNodeIds: string[]
  compareExpandedNodeIds: string[]
  hiddenEdgeTypes: EdgeType[]
  comparePaper: Paper | null
  compareSelectedNodeId: string | null
  // "How are these two papers connected?" — the endpoints, the pending query
  // and the answer, kept here so the toolbar, context menu and graph highlight
  // all read the same source of truth.
  connectionOpen: boolean
  connectionFrom: Paper | null
  connectionTo: Paper | null
  connectionRequest: { fromId: string; toId: string } | null
  connection: PaperConnection | null
  setConnectionOpen: (open: boolean) => void
  setConnectionFrom: (p: Paper | null) => void
  setConnectionTo: (p: Paper | null) => void
  requestConnection: (fromId: string, toId: string) => void
  setConnection: (c: PaperConnection | null) => void
  clearConnection: () => void
  /** 列表行 / 详情面板的单篇入口：填进空槽位，两槽都满则替换终点。 */
  connectPaper: (paper: Paper, opts?: { run?: boolean }) => void
  /** 明确指定一对论文并打开面板（对比分屏的入口）。 */
  connectPair: (from: Paper | null, to: Paper | null, opts?: { run?: boolean }) => void
  setSelectedPaper: (p: Paper | null) => void
  selectRootPaper: (p: Paper) => void
  setComparePaper: (p: Paper | null) => void
  setCompareSelectedNodeId: (id: string | null) => void
  setSelectedNodeId: (id: string | null) => void
  setHighlightedNodes: (ids: string[]) => void
  submitQuery: (q: { query: string; query_type: string }) => void
  updateFilters: (f: Partial<UiState['filters']>) => void
  resetFilters: () => void
  setGraphView: (v: UiState['graphView']) => void
  setColorMode: (m: ColorMode) => void
  setSizeMode: (m: SizeMode) => void
  setTimelineYear: (y: number | null) => void
  setTimelinePlaying: (playing: boolean) => void
  setGraphQuery: (q: string) => void
  setGraphParams: (depth: number | null, maxNodes: number | null) => void
  setExpandedNodeIds: (ids: string[]) => void
  addExpandedNode: (id: string) => void
  setCompareExpandedNodeIds: (ids: string[]) => void
  addCompareExpandedNode: (id: string) => void
  toggleEdgeType: (type: EdgeType) => void
}

const defaultFilters = {
  yearRange: [1990, new Date().getFullYear()] as [number, number],
  minCitations: 0,
  selectedFields: [] as string[],
  selectedVenues: [] as string[],
}

/**
 * Start the search for a complete pair. A half-filled pair only opens the
 * panel: running one paper against nothing would burn an upstream crawl.
 */
function runConnectionFor(from: Paper | null, to: Paper | null) {
  const fromId = resolvePaperKey(from)
  const toId = resolvePaperKey(to)
  if (!fromId || !toId || fromId === toId) return
  useUiStore.setState({ connectionRequest: { fromId, toId }, connection: null })
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedPaper: null,
  selectedNodeId: null,
  highlightedNodes: [],
  submittedQuery: null,
  filters: defaultFilters,
  graphView: '2d',
  colorMode: 'cluster',
  sizeMode: 'citations',
  timelineYear: null,
  timelinePlaying: false,
  graphQuery: '',
  graphDepth: null,
  graphMaxNodes: null,
  expandedNodeIds: [],
  compareExpandedNodeIds: [],
  hiddenEdgeTypes: [],
  comparePaper: null,
  compareSelectedNodeId: null,
  connectionOpen: false,
  connectionFrom: null,
  connectionTo: null,
  connectionRequest: null,
  connection: null,
  setConnectionOpen: (open) => set({ connectionOpen: open }),
  setConnectionFrom: (p) => set({ connectionFrom: p }),
  setConnectionTo: (p) => set({ connectionTo: p }),
  requestConnection: (fromId, toId) =>
    set({ connectionOpen: true, connectionRequest: { fromId, toId }, connection: null }),
  setConnection: (c) => set({ connection: c }),
  clearConnection: () => set({ connectionRequest: null, connection: null }),
  connectPaper: (paper, opts) => {
    const key = resolvePaperKey(paper)
    if (!key) return
    const { connectionFrom, connectionTo, selectedPaper } = get()
    const fromKey = resolvePaperKey(connectionFrom)
    const toKey = resolvePaperKey(connectionTo)

    let nextFrom = connectionFrom
    let nextTo = connectionTo

    if (fromKey === key || toKey === key) {
      // Pressing the slot button again takes the paper back out, matching the
      // 收藏 / 对比 buttons sitting next to it.
      if (fromKey === key) nextFrom = null
      if (toKey === key) nextTo = null
    } else {
      // The paper being explored anchors the pair, so adding a neighbour never
      // silently swaps out the paper the user is actually reading.
      const anchor = connectionFrom ?? selectedPaper
      const anchorKey = resolvePaperKey(anchor)
      if (anchor && anchorKey && anchorKey !== key) {
        nextFrom = anchor
        nextTo = paper
      } else if (!nextFrom) {
        nextFrom = paper
      } else {
        nextTo = paper
      }
    }

    set({ connectionOpen: true, connectionFrom: nextFrom, connectionTo: nextTo })
    if (opts?.run) runConnectionFor(nextFrom, nextTo)
  },
  connectPair: (from, to, opts) => {
    set({ connectionOpen: true, connectionFrom: from, connectionTo: to })
    if (opts?.run) runConnectionFor(from, to)
  },
  setSelectedPaper: (p) => set({ selectedPaper: p }),
  selectRootPaper: (p) => set({ selectedPaper: p, selectedNodeId: null, graphDepth: null, graphMaxNodes: null }),
  setComparePaper: (p) => set({ comparePaper: p, compareSelectedNodeId: null }),
  setCompareSelectedNodeId: (id) => set({ compareSelectedNodeId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHighlightedNodes: (ids) => set({ highlightedNodes: ids }),
  submitQuery: (q) => set({ submittedQuery: q }),
  updateFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: defaultFilters }),
  setGraphView: (v) => set({ graphView: v }),
  setColorMode: (m) => set({ colorMode: m }),
  setSizeMode: (m) => set({ sizeMode: m }),
  setTimelineYear: (y) => set({ timelineYear: y }),
  setTimelinePlaying: (playing) => set({ timelinePlaying: playing }),
  setGraphQuery: (q) => set({ graphQuery: q }),
  setGraphParams: (depth, maxNodes) => set({ graphDepth: depth, graphMaxNodes: maxNodes }),
  setExpandedNodeIds: (ids) => set({ expandedNodeIds: ids }),
  addExpandedNode: (id) =>
    set((s) => (s.expandedNodeIds.includes(id) ? {} : { expandedNodeIds: [...s.expandedNodeIds, id] })),
  setCompareExpandedNodeIds: (ids) => set({ compareExpandedNodeIds: ids }),
  addCompareExpandedNode: (id) =>
    set((s) =>
      s.compareExpandedNodeIds.includes(id)
        ? {}
        : { compareExpandedNodeIds: [...s.compareExpandedNodeIds, id] },
    ),
  toggleEdgeType: (type) =>
    set((s) => ({
      hiddenEdgeTypes: s.hiddenEdgeTypes.includes(type)
        ? s.hiddenEdgeTypes.filter((t) => t !== type)
        : [...s.hiddenEdgeTypes, type],
    })),
}))
