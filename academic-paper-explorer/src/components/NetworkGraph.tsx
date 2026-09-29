import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { forceCollide } from 'd3-force'
import { Loader2 } from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { usePaperNetwork } from '../hooks/usePaperNetwork'
import { filterGraph } from '../graph/graphFilters'
import { graphAdapter, linkEndId, type GraphLink, type GraphNode } from '../graph/graphAdapter'
import { pickVisibleLabels, ZOOM_LABEL_THRESHOLD } from '../graph/labelLod'

import { withAlpha } from '../graph/encoding'
import GraphToolbar from './graph/GraphToolbar'
import GraphLegend from './graph/GraphLegend'
import GraphTimeline from './graph/GraphTimeline'
import GraphMinimap from './graph/GraphMinimap'
import GraphTooltip from './graph/GraphTooltip'
import type { Paper } from '../types/domain'

const ForceGraph3D = React.lazy(() => import('../graph/ForceGraph3DLazy'))

interface LabelRect {
  x: number
  y: number
  w: number
  h: number
}

function paintRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  if (typeof (ctx as any).roundRect === 'function') {
    ;(ctx as any).roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

const NetworkGraph: React.FC = () => {
  const {
    selectedPaper,
    selectedNodeId,
    setSelectedNodeId,
    setSelectedPaper,
    filters,
    graphView,
    colorMode,
    sizeMode,
    timelineYear,
    setTimelineYear,
    setTimelinePlaying,
    graphQuery,
  } = useUiStore()

  const { data: networkData, isLoading, error } = usePaperNetwork(selectedPaper)

  const roRef = useRef<ResizeObserver | null>(null)
  const fg2dRef = useRef<any>(null)
  const fg3dRef = useRef<any>(null)
  const lastClick = useRef<{ id: string; t: number } | null>(null)
  const labelRectsRef = useRef<LabelRect[]>([])
  const fittedRef = useRef<unknown>(null)

  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const [engineTick, setEngineTick] = useState(0)

  const setContainer = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect()
    roRef.current = null
    if (!el) return
    const measure = () => setDimensions({ width: el.clientWidth, height: el.clientHeight })
    measure()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      roRef.current = ro
    }
  }, [])

  useEffect(() => () => roRef.current?.disconnect(), [])

  const { nodes: filteredNodes, edges: filteredEdges } = useMemo(() => {
    if (!networkData) return { nodes: [], edges: [] }
    return filterGraph(networkData.nodes, networkData.edges, {
      yearRange: filters.yearRange,
      minCitations: filters.minCitations,
      selectedFields: filters.selectedFields,
      selectedVenues: filters.selectedVenues,
      timelineYear,
    })
  }, [networkData, filters, timelineYear])

  // Year domain for the timeline slider: everything except the timeline filter,
  // otherwise the slider range collapses while dragging (feedback loop).
  const domainNodes = useMemo(() => {
    if (!networkData) return []
    return filterGraph(networkData.nodes, [], {
      yearRange: filters.yearRange,
      minCitations: filters.minCitations,
      selectedFields: filters.selectedFields,
      selectedVenues: filters.selectedVenues,
      timelineYear: null,
    }).nodes
  }, [networkData, filters])

  // A new network invalidates any year filter carried over from the old paper.
  useEffect(() => {
    setTimelineYear(null)
    setTimelinePlaying(false)
  }, [networkData, setTimelineYear, setTimelinePlaying])

  const graphData = useMemo(
    () => graphAdapter(filteredNodes, filteredEdges, { colorMode, sizeMode }),
    [filteredNodes, filteredEdges, colorMode, sizeMode],
  )

  const activeId = hoverNode?.id ?? selectedNodeId ?? null

  const { neighborIds, linkKeys } = useMemo(() => {
    const nIds = new Set<string>()
    const lKeys = new Set<string>()
    if (!activeId) return { neighborIds: nIds, linkKeys: lKeys }
    nIds.add(activeId)
    for (const link of graphData.links) {
      const s = linkEndId(link.source)
      const t = linkEndId(link.target)
      if (s === activeId || t === activeId) {
        nIds.add(s)
        nIds.add(t)
        lKeys.add(`${s}->${t}`)
      }
    }
    return { neighborIds: nIds, linkKeys: lKeys }
  }, [activeId, graphData])

  const priorityLabelIds = useMemo(
    () => pickVisibleLabels(graphData.nodes, { activeId, neighborIds, globalScale: 0, limit: 0 }),
    [graphData, activeId, neighborIds],
  )

  const zoomLabelIds = useMemo(
    () => pickVisibleLabels(graphData.nodes, { activeId, neighborIds, globalScale: 2, limit: 12 }),
    [graphData, activeId, neighborIds],
  )

  // 3D labels: base on selection only (not hover) so hovering does not rebuild
  // the whole three.js node object set every frame.
  const selectedNeighborIds = useMemo(() => {
    const ids = new Set<string>()
    if (!selectedNodeId) return ids
    ids.add(selectedNodeId)
    for (const link of graphData.links) {
      const s = linkEndId(link.source)
      const t = linkEndId(link.target)
      if (s === selectedNodeId) ids.add(t)
      if (t === selectedNodeId) ids.add(s)
    }
    return ids
  }, [graphData, selectedNodeId])

  const labelIds3d = useMemo(
    () =>
      pickVisibleLabels(graphData.nodes, {
        activeId: selectedNodeId,
        neighborIds: selectedNeighborIds,
        globalScale: 2,
        limit: 15,
      }),
    [graphData, selectedNodeId, selectedNeighborIds],
  )

  const rebuildFromNode = useCallback(
    (node: GraphNode) => {
      const paper: Paper = {
        id: node.id,
        title: node.title,
        authors: node.authors,
        publication_year: node.year,
        year: node.year,
        citation_count: node.citationCount,
        abstract: node.abstract,
        venue: node.venue,
        url: node.url,
        pdf_url: node.pdfUrl,
        fields_of_study: node.fieldsOfStudy,
        source: 'semantic_scholar',
      }
      setSelectedPaper(paper)
      setSelectedNodeId(null)
    },
    [setSelectedPaper, setSelectedNodeId],
  )

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      const now = Date.now()
      const prev = lastClick.current
      if (prev && prev.id === node.id && now - prev.t < 320) {
        lastClick.current = null
        rebuildFromNode(node)
        return
      }
      lastClick.current = { id: node.id, t: now }
      setSelectedNodeId(node.id)
    },
    [rebuildFromNode, setSelectedNodeId],
  )

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      const dim = activeId !== null && !neighborIds.has(node.id)

      if (node.isRoot || selectedNodeId === node.id) {
        ctx.globalAlpha = dim ? 0.12 : 0.35
        ctx.beginPath()
        ctx.arc(x, y, node.size + 4 / globalScale, 0, 2 * Math.PI)
        ctx.fillStyle = node.isRoot ? 'rgba(255,107,53,0.45)' : 'rgba(255,215,0,0.4)'
        ctx.fill()
      }

      ctx.globalAlpha = dim ? 0.12 : 1
      ctx.beginPath()
      ctx.arc(x, y, node.size, 0, 2 * Math.PI)
      ctx.fillStyle = node.color
      ctx.fill()
      ctx.lineWidth = (node.isRoot ? 2.5 : selectedNodeId === node.id ? 2 : 1.25) / globalScale
      ctx.strokeStyle = node.isRoot ? '#ff6b35' : selectedNodeId === node.id ? '#ffd700' : 'rgba(9,14,20,0.9)'
      ctx.stroke()

      const showLabel =
        (globalScale >= ZOOM_LABEL_THRESHOLD ? zoomLabelIds.has(node.id) : priorityLabelIds.has(node.id)) && !dim
      if (showLabel) {
        const raw = node.title || node.label || ''
        const label = raw.length > 22 ? `${raw.slice(0, 22)}…` : raw
        const fontSize = 11 / globalScale
        ctx.font = `600 ${fontSize}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const tw = ctx.measureText(label).width
        const padX = 3 / globalScale
        const padY = 2 / globalScale
        const lx = x - tw / 2 - padX
        const ly = y + node.size + 3 / globalScale
        const lw = tw + padX * 2
        const lh = fontSize + padY * 2
        const isPriority = priorityLabelIds.has(node.id)
        const overlaps = labelRectsRef.current.some(
          (r) => !(lx + lw < r.x || lx > r.x + r.w || ly + lh < r.y || ly > r.y + r.h),
        )
        if (isPriority || !overlaps) {
          labelRectsRef.current.push({ x: lx, y: ly, w: lw, h: lh })
          ctx.globalAlpha = 0.82
          ctx.fillStyle = '#0b1220'
          paintRoundedRect(ctx, lx, ly, lw, lh, 3 / globalScale)
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.fillStyle = 'rgba(241,245,249,0.98)'
          ctx.fillText(label, x, ly + padY)
        }
      }
      ctx.globalAlpha = 1
    },
    [activeId, neighborIds, selectedNodeId, priorityLabelIds, zoomLabelIds],
  )

  const paintPointerArea = useCallback((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(node.x ?? 0, node.y ?? 0, node.size + 3, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  const linkColor = useCallback(
    (link: GraphLink) => {
      const base = link.type === 'citation' ? '#4ade80' : '#60a5fa'
      if (!activeId) return withAlpha(base, 0.35)
      const key = `${linkEndId(link.source)}->${linkEndId(link.target)}`
      return linkKeys.has(key) ? base : withAlpha(base, 0.06)
    },
    [activeId, linkKeys],
  )

  const nodeColor = useCallback(
    (node: GraphNode) => {
      if (!activeId) return node.color
      return neighborIds.has(node.id) ? node.color : '#2a2f3a'
    },
    [activeId, neighborIds],
  )

  const commonProps = {
    graphData,
    backgroundColor: '#111827',
    nodeColor,
    nodeVal: (n: GraphNode) => n.val,
    linkColor,
    linkWidth: (l: GraphLink) => Math.max(0.5, l.weight * 1.5),
    linkDirectionalArrowLength: 4,
    linkDirectionalArrowRelPos: 0.9,
    linkDirectionalArrowColor: linkColor,
    onNodeClick: handleNodeClick,
    onNodeHover: (n: GraphNode | null) => setHoverNode(n),
    onBackgroundClick: () => setSelectedNodeId(null),
    onRenderFramePre: () => {
      labelRectsRef.current = []
    },
    onEngineStop: () => {
      setEngineTick((v) => v + 1)
      if (fittedRef.current !== networkData) {
        fittedRef.current = networkData
        const fg = graphView === '3d' ? fg3dRef.current : fg2dRef.current
        fg?.zoomToFit?.(600, 60)
      }
    },
    cooldownTicks: 200,
    warmupTicks: 30,
  }

  useEffect(() => {
    if (graphView !== '2d') return
    const fg = fg2dRef.current
    if (!fg) return
    fg.d3Force('charge')?.strength(-260)
    fg.d3Force('link')?.distance((l: any) => ((l.source?.size ?? 5) + (l.target?.size ?? 5)) * 4 + 24)
    fg.d3Force('collide', forceCollide((n: any) => (n.size ?? 5) + 6).strength(1))
    fg.d3ReheatSimulation?.()
  }, [graphData, graphView, dimensions])

  useEffect(() => {
    const q = graphQuery.trim().toLowerCase()
    if (!q) return
    const target = graphData.nodes.find((n) => (n.title || n.label || '').toLowerCase().includes(q))
    if (!target || target.x == null || target.y == null) return
    if (graphView === '3d') {
      const dist = 160
      const x = target.x
      const y = target.y
      const z = target.z ?? 0
      const hyp = Math.hypot(x, y, z) || 1
      const ratio = 1 + dist / hyp
      fg3dRef.current?.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio || dist }, target, 900)
    } else {
      fg2dRef.current?.centerAt(target.x, target.y, 900)
      fg2dRef.current?.zoom(2.2, 900)
    }
  }, [graphQuery, graphData, graphView, engineTick])

  const handleMinimapSelect = useCallback((gx: number, gy: number) => {
    fg2dRef.current?.centerAt(gx, gy, 600)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
          <h3 className="mb-2 text-lg font-semibold text-white">正在构建网络图...</h3>
          <p className="text-gray-400">正在获取引用关系并计算网络结构</p>
          <div className="mt-4 space-y-1 text-xs text-gray-500">
            <p>• 获取论文引用数据</p>
            <p>• 构建节点和边关系</p>
            <p>• 计算网络布局</p>
            <p className="text-yellow-400">请耐心等待，大约需要10-30秒</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400">网络构建失败</p>
          <p className="mt-2 text-sm text-gray-400">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!networkData) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400">请选择一篇论文来生成网络图</p>
        </div>
      </div>
    )
  }

  if (!networkData.nodes || networkData.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-yellow-400">网络数据为空</p>
          <p className="mt-2 text-sm text-gray-400">该论文可能没有可用的引用关系数据</p>
        </div>
      </div>
    )
  }

  const years = domainNodes
    .map((n) => n.year)
    .filter((y): y is number => typeof y === 'number')
  const minYear = years.length > 0 ? Math.min(...years) : 1990
  const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear()

  return (
    <div
      ref={setContainer}
      className="relative h-full bg-gray-900"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
    >
      {dimensions && graphView === '2d' && (
        <ForceGraph2D
          ref={fg2dRef}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintPointerArea}
          {...commonProps}
        />
      )}

      {dimensions && graphView === '3d' && (
        <React.Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-gray-400">正在加载 3D 渲染器…</div>
          }
        >
          <ForceGraph3D
            ref={fg3dRef}
            width={dimensions.width}
            height={dimensions.height}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={1.5}
            nodeRelSize={2}
            labelIds={labelIds3d}
            {...commonProps}
          />
        </React.Suspense>
      )}

      <GraphToolbar />
      <GraphLegend nodes={graphData.nodes} />
      <GraphTimeline minYear={minYear} maxYear={maxYear} />
      {graphView === '2d' && engineTick > 0 && (
        <GraphMinimap nodes={graphData.nodes} selectedId={selectedNodeId} onSelect={handleMinimapSelect} />
      )}

      <div className="absolute right-4 top-4 z-10 rounded-lg bg-gray-800/90 px-3 py-2 text-xs text-white">
        {filteredNodes.length} 节点 · {filteredEdges.length} 边
      </div>

      {hoverNode && pointer && <GraphTooltip node={hoverNode} x={pointer.x} y={pointer.y} />}
    </div>
  )
}

export default NetworkGraph
