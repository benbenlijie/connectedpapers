import { forceCenter, forceLink, forceManyBody, forceSimulation } from 'd3-force'
import type { NetworkEdge, NetworkNode } from '../types/domain'

export interface PositionedNode extends NetworkNode {
  x: number
  y: number
  size: number
}

export interface LayoutInput {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  width: number
  height: number
}

const MIN_SIZE = 15
const MAX_SIZE = 40

/**
 * 用 d3-force 同步计算力导向布局，返回带坐标的节点副本。
 * 同步 tick 保证可单测、可放进 WebWorker；不修改入参。
 */
export function computeLayout({ nodes, edges, width, height }: LayoutInput): PositionedNode[] {
  const ids = new Set(nodes.map((n) => n.id))
  const simNodes = nodes.map((n) => ({
    ...n,
    size: Math.max(MIN_SIZE, Math.min(MAX_SIZE, n.size || MIN_SIZE)),
  }))
  // 丢弃指向未知节点的边，避免 d3 forceLink 抛错
  const simEdges = edges
    .filter((e) => ids.has(e.from) && ids.has(e.to))
    .map((e) => ({ source: e.from, target: e.to }))

  const simulation = forceSimulation(simNodes as any)
    .force('charge', forceManyBody().strength(-220))
    .force('link', forceLink(simEdges as any).id((d: any) => d.id).distance(90).strength(0.5))
    .force('center', forceCenter(width / 2, height / 2))
    .stop()

  const ticks = Math.min(300, Math.max(100, nodes.length * 4))
  simulation.tick(ticks)

  return simNodes.map((n) => ({
    ...(n as any),
    x: Number.isFinite((n as any).x) ? (n as any).x : width / 2,
    y: Number.isFinite((n as any).y) ? (n as any).y : height / 2,
  })) as PositionedNode[]
}
