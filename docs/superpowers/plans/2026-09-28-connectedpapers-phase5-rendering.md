# ConnectedPapers Phase 5 — 渲染重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把手写的静态环形布局 + 逐边 `nodes.find` 的 canvas 渲染，换成「WebWorker 里用 d3-force 算力导向布局 + 主线程用 `Map<id,node>` 绘制」，并启用邻接高亮。

**Architecture:** 纯函数 `computeLayout`（d3-force 同步 tick）可单测；`layout.worker.ts` 在独立线程运行它，主线程只画不算；`NetworkGraph` 保留缩放/平移/点击逻辑，新增按 `Map` 查找与高亮淡化。

**Tech Stack:** React 18 + Vite 6、TypeScript、d3-force、Web Worker (module)、vitest。

---

## Global Constraints

- 不引入 Supabase；不改动后端 `server/`。
- 保留暗色三栏布局与既有交互（缩放、平移、点击选中、图例、操作提示）。
- 保留 `usePaperNetwork(selectedPaper)` 作为数据源（不新建请求）。
- 提交信息必须与每个 Task 的指定文本完全一致。
- 前端校验命令：`cd academic-paper-explorer && pnpm typecheck && pnpm lint && pnpm test && pnpm build` 必须全绿。

---

## Task 5.1: 依赖替换（加 d3-force，去 vis-network）

**Files:**
- Modify: `academic-paper-explorer/package.json`
- Modify: `academic-paper-explorer/pnpm-lock.yaml`

- [ ] Step 1: 安装与移除

```bash
cd academic-paper-explorer
pnpm add d3-force
pnpm add -D @types/d3-force
pnpm remove vis-network
```
Expected: `package.json` dependencies 含 `d3-force`，devDependencies 含 `@types/d3-force`，无 `vis-network`。

- [ ] Step 2: 确认无残留引用

Run: `rg -n "vis-network" academic-paper-explorer/src academic-paper-explorer/package.json`
Expected: 无输出。

- [ ] Step 3: 基线验证

Run: `cd academic-paper-explorer && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: 全绿。

- [ ] Step 4: Commit

```bash
git add academic-paper-explorer/package.json academic-paper-explorer/pnpm-lock.yaml
git commit -m "chore(frontend): add d3-force, remove unused vis-network"
```

---

## Task 5.2: `computeLayout` 纯函数 + 单测

**Files:**
- Create: `academic-paper-explorer/src/graph/computeLayout.ts`
- Test: `academic-paper-explorer/src/graph/computeLayout.test.ts`

- [ ] Step 1: 写失败测试

Create `academic-paper-explorer/src/graph/computeLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeLayout } from './computeLayout'
import type { NetworkEdge, NetworkNode } from '../types/domain'

const node = (id: string, isRoot = false): NetworkNode => ({
  id, label: id, title: id, citationCount: 1, authors: '', isRoot,
  pageRankScore: 0.1, clusterId: 0, size: 20, color: '#1e3a8a',
})

describe('computeLayout', () => {
  it('returns a position for every node', () => {
    const out = computeLayout({ nodes: [node('a', true), node('b')], edges: [], width: 800, height: 600 })
    expect(out).toHaveLength(2)
    for (const n of out) {
      expect(Number.isFinite(n.x)).toBe(true)
      expect(Number.isFinite(n.y)).toBe(true)
      expect(n.size).toBeGreaterThanOrEqual(15)
    }
  })

  it('keeps nodes distinct (force pushes them apart)', () => {
    const out = computeLayout({
      nodes: [node('a', true), node('b'), node('c')],
      edges: [{ from: 'a', to: 'b', type: 'reference', weight: 1 }],
      width: 800, height: 600,
    })
    const positions = out.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`)
    expect(new Set(positions).size).toBe(out.length)
  })

  it('is deterministic for the same input', () => {
    const input = { nodes: [node('a', true), node('b')], edges: [], width: 800, height: 600 }
    const a = computeLayout(input)
    const b = computeLayout(input)
    expect(a.map((n) => [n.x, n.y])).toEqual(b.map((n) => [n.x, n.y]))
  })

  it('ignores edges referencing unknown ids without throwing', () => {
    const out = computeLayout({
      nodes: [node('a')],
      edges: [{ from: 'a', to: 'ghost', type: 'reference', weight: 1 } as NetworkEdge],
      width: 400, height: 400,
    })
    expect(out).toHaveLength(1)
  })
})
```

- [ ] Step 2: 运行失败

Run: `cd academic-paper-explorer && pnpm test src/graph/computeLayout.test.ts`
Expected: FAIL（模块不存在）。

- [ ] Step 3: 实现 computeLayout.ts

Create `academic-paper-explorer/src/graph/computeLayout.ts`:

```ts
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
```

- [ ] Step 4: 运行通过

Run: `cd academic-paper-explorer && pnpm test src/graph/computeLayout.test.ts`
Expected: 4 passed。

- [ ] Step 5: Commit

```bash
git add academic-paper-explorer/src/graph/computeLayout.ts academic-paper-explorer/src/graph/computeLayout.test.ts
git commit -m "feat(frontend): d3-force layout pure function with tests"
```

---

## Task 5.3: 布局 WebWorker

**Files:**
- Create: `academic-paper-explorer/src/graph/layout.worker.ts`
- Create: `academic-paper-explorer/src/graph/useLayout.ts`（封装 worker 的 React hook）

- [ ] Step 1: 实现 worker

Create `academic-paper-explorer/src/graph/layout.worker.ts`:

```ts
/// <reference lib="webworker" />
import { computeLayout, type LayoutInput, type PositionedNode } from './computeLayout'

interface LayoutRequest { id: number; input: LayoutInput }
interface LayoutResponse { id: number; nodes: PositionedNode[] }

self.onmessage = (e: MessageEvent<LayoutRequest>) => {
  const { id, input } = e.data
  const nodes = computeLayout(input)
  const res: LayoutResponse = { id, nodes }
  ;(self as unknown as Worker).postMessage(res)
}

export {}
```

- [ ] Step 2: 实现 useLayout hook（管理 worker 生命周期与请求去重）

Create `academic-paper-explorer/src/graph/useLayout.ts`:

```ts
import { useEffect, useRef, useState } from 'react'
import type { NetworkEdge, NetworkNode } from '../types/domain'
import type { PositionedNode } from './computeLayout'

export function useLayout(
  nodes: NetworkNode[] | null,
  edges: NetworkEdge[] | null,
  width: number,
  height: number,
): PositionedNode[] {
  const [positions, setPositions] = useState<PositionedNode[]>([])
  const workerRef = useRef<Worker | null>(null)
  const reqId = useRef(0)

  useEffect(() => {
    workerRef.current = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' })
    return () => workerRef.current?.terminate()
  }, [])

  useEffect(() => {
    const worker = workerRef.current
    if (!worker || !nodes || !edges || nodes.length === 0) {
      setPositions([])
      return
    }
    const id = ++reqId.current
    const onMessage = (e: MessageEvent<{ id: number; nodes: PositionedNode[] }>) => {
      if (e.data.id === id) setPositions(e.data.nodes)
    }
    worker.addEventListener('message', onMessage)
    worker.postMessage({ id, input: { nodes, edges, width, height } })
    return () => worker.removeEventListener('message', onMessage)
  }, [nodes, edges, width, height])

  return positions
}
```

- [ ] Step 3: 验证（worker 不参与单测；确认可构建）

Run: `cd academic-paper-explorer && pnpm typecheck && pnpm build`
Expected: 构建成功，产物含独立 worker chunk。

- [ ] Step 4: Commit

```bash
git add academic-paper-explorer/src/graph/layout.worker.ts academic-paper-explorer/src/graph/useLayout.ts
git commit -m "feat(frontend): offload layout to a module web worker"
```

---

## Task 5.4: 重写 `NetworkGraph` 用 Map + worker + 高亮

**Files:**
- Modify: `academic-paper-explorer/src/components/NetworkGraph.tsx`

- [ ] Step 1: 替换布局来源：改用 `useLayout`

把第 17–24 行的本地 `nodes/edges` state 与第 43–78 行的环形布局 `useEffect` 替换为：

```tsx
import { useLayout } from '../graph/useLayout'
import type { NetworkEdge, NetworkNode } from '../types/domain'

// 过滤年份（保留原行为）
const filteredNodes: NetworkNode[] = useMemo(() => {
  if (!networkData) return []
  return networkData.nodes.filter((node) =>
    !filters.yearRange || !node.year || (node.year >= filters.yearRange[0] && node.year <= filters.yearRange[1]),
  )
}, [networkData, filters.yearRange])

const nodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes])

const filteredEdges: NetworkEdge[] = useMemo(
  () => (networkData ? networkData.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to)) : []),
  [networkData, nodeIds],
)

const positions = useLayout(filteredNodes, filteredEdges, dimensions.width, dimensions.height)

// O(1) 查找，取代逐边 nodes.find
const nodeById = useMemo(() => new Map(positions.map((n) => [n.id, n])), [positions])
```

- [ ] Step 2: 绘制循环改用 `nodeById`

把绘制 `useEffect`（原第 81–171 行）中的：

- 边循环里的 `const fromNode = nodes.find(...)` / `const toNode = nodes.find(...)` → `const fromNode = nodeById.get(edge.from)` / `nodeById.get(edge.to)`。
- 节点循环 `nodes.forEach` → `positions.forEach`。
- 依赖数组 `[nodes, edges, dimensions, zoom, offset, selectedNodeId]` → `[positions, filteredEdges, nodeById, dimensions, zoom, offset, selectedNodeId, highlightedNodes]`。
- 节点标签用 `node.title || node.label || ''` 取长度（防止 null）。

- [ ] Step 3: 高亮淡化（启用 `highlightedNodes`）

在绘制边的循环开头加入淡化判断：

```tsx
const dim = highlightedNodes.length > 0 && !highlightedNodes.includes(edge.from) && !highlightedNodes.includes(edge.to)
ctx.globalAlpha = dim ? 0.08 : Math.max(0.3, edge.weight)
```
（删除原来单独设置 `ctx.globalAlpha = Math.max(0.3, edge.weight)` 的那行，避免覆盖。）

节点循环里同样：`const nodeDim = highlightedNodes.length > 0 && !highlightedNodes.includes(node.id)`，绘制前 `ctx.globalAlpha = nodeDim ? 0.15 : 1`。

- [ ] Step 4: 命中测试用 `positions`

把 `handleMouseDown` 里的 `nodes.find(...)` 改为遍历 `positions`（同逻辑，`distance <= node.size`）。

- [ ] Step 5: 底部计数用 `positions.length` / `filteredEdges.length`

- [ ] Step 6: 验证

Run: `cd academic-paper-explorer && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: 全绿。
Run: `rg -n "nodes\.find|\.find\(n => n\.id" academic-paper-explorer/src/components/NetworkGraph.tsx`
Expected: 无输出（绘制路径不再线性查找）。

- [ ] Step 7: Commit

```bash
git add academic-paper-explorer/src/components/NetworkGraph.tsx
git commit -m "refactor(frontend): worker force layout, Map lookup, adjacency highlight"
```

---

## Task 5.5: 端到端与性能记录

**Files:**
- 无（验证任务）

- [ ] Step 1: 构建并本地起服务

```bash
cd /home/mt/Documents/projects/connectedpapers
bun run build:web
(timeout 10 bun run server &) ; sleep 1
curl -s -o /dev/null -w '%{http_code}\n' localhost:8787/
pkill -f 'bun run server' || true
```
Expected: `200`。

- [ ] Step 2: 前端 dev 打开

```bash
(timeout 20 pnpm --dir academic-paper-explorer dev &) ; sleep 3
curl -s -o /dev/null -w '%{http_code}\n' localhost:5173/
pkill -f vite || true
```
Expected: `200`。若 S2 网络不可用，人工图交互留待用户本地验证，记录在报告。

- [ ] Step 3: 记录性能结论（人工，写入报告）

用 Chrome Performance 打开一张 ≥100 节点图，确认主线程无 >50ms 长任务（布局在 worker）。若无法执行，记录为「未测」。

- [ ] Step 4: 若产生了 tracked 变更则提交，否则报告「无需提交」

---

## Self-Review

**Spec coverage:** E(渲染不可扩展) → 5.2 d3-force 布局、5.3 worker、5.4 Map/highlight。依赖清理（vis-network 零引用）→ 5.1。
**Placeholder scan:** 每个 Task 含完整代码与命令；NetworkGraph 改动给出精确片段与行号锚点。
**Type consistency:** `PositionedNode`(5.2) 被 worker(5.3) 与 `useLayout`(5.3) 与 NetworkGraph(5.4) 一致消费；`LayoutInput{nodes,edges,width,height}` 三处一致；`NetworkNode/NetworkEdge` 源自 `types/domain.ts`。
**风险:** d3-force 同步 tick 在大图（>500 节点）可能偏慢；worker 已隔离主线程，且当前后端 max_nodes≤300。
