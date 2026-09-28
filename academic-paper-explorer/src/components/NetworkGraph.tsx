import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Loader2 } from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { usePaperNetwork } from '../hooks/usePaperNetwork'
import { filterGraph } from '../graph/graphFilters'
import { graphAdapter, linkEndId, type GraphLink, type GraphNode } from '../graph/graphAdapter'
import { withAlpha } from '../graph/encoding'
import GraphToolbar from './graph/GraphToolbar'
import GraphLegend from './graph/GraphLegend'
import GraphTimeline from './graph/GraphTimeline'
import GraphMinimap from './graph/GraphMinimap'
import GraphTooltip from './graph/GraphTooltip'
import type { Paper } from '../types/domain'

const ForceGraph3D = React.lazy(() => import('../graph/ForceGraph3DLazy'))

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
    graphQuery,
  } = useUiStore()

  const { data: networkData, isLoading, error } = usePaperNetwork(selectedPaper)

  const containerRef = useRef<HTMLDivElement>(null)
  const fg2dRef = useRef<any>(null)
  const fg3dRef = useRef<any>(null)
  const lastClick = useRef<{ id: string; t: number } | null>(null)

  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const [engineTick, setEngineTick] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setDimensions({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

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
      ctx.globalAlpha = dim ? 0.15 : 1
      ctx.beginPath()
      ctx.arc(x, y, node.size, 0, 2 * Math.PI)
      ctx.fillStyle = node.color
      ctx.fill()
      ctx.lineWidth = (node.isRoot ? 3 : selectedNodeId === node.id ? 2.5 : 1) / globalScale
      ctx.strokeStyle = node.isRoot ? '#ff6b35' : selectedNodeId === node.id ? '#ffd700' : 'rgba(255,255,255,0.55)'
      ctx.stroke()
      if (globalScale > 0.55) {
        const raw = node.title || node.label || ''
        const label = raw.length > 24 ? `${raw.slice(0, 24)}…` : raw
        ctx.font = `${12 / globalScale}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fillText(label, x, y + node.size + 2 / globalScale)
      }
      ctx.globalAlpha = 1
    },
    [activeId, neighborIds, selectedNodeId],
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
    onEngineStop: () => setEngineTick((v) => v + 1),
    cooldownTicks: 120,
    warmupTicks: 20,
  }

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

  const years = filteredNodes
    .map((n) => n.year)
    .filter((y): y is number => typeof y === 'number')
  const minYear = years.length > 0 ? Math.min(...years) : 1990
  const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear()

  return (
    <div
      ref={containerRef}
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
            nodeRelSize={4}
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
