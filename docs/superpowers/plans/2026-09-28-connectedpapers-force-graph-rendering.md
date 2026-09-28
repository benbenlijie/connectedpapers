# ConnectedPapers Force-Graph Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-written Canvas 2D renderer and custom d3-force worker layout with `react-force-graph` (2D canvas + lazy 3D three.js), adding richer interactions, encoding switches, search, timeline, and a minimap.

**Architecture:** `NetworkGraph.tsx` stays the orchestrator. Pure logic lives in `src/graph/` (`encoding`, `graphFilters`, `graphAdapter`) and is unit-tested. The UI store gains UI-only fields for view mode, color/size encoding, timeline, and search. Data still comes from `usePaperNetwork(selectedPaper)`.

**Tech Stack:** React 18 + Vite 6, TypeScript, Zustand, `react-force-graph-2d` / `react-force-graph-3d`, vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-28-connectedpapers-force-graph-rendering-design.md`

## Global Constraints

- No backend (`server/`) changes.
- Data source stays `const { data: networkData, isLoading, error } = usePaperNetwork(selectedPaper)`.
- Dark three-column layout, loading / error / empty-network copy preserved.
- Store stays UI-only (no server state in Zustand).
- 3D package lazy-loaded with `React.lazy`; three.js must not be in the initial bundle.
- Verification: `cd academic-paper-explorer && pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
- `strict` is false and `@typescript-eslint/no-explicit-any` is off in this repo; `any` is acceptable where library types are awkward.

---

## Task 1: Add force-graph dependencies

**Files:**
- Modify: `academic-paper-explorer/package.json`
- Modify: `academic-paper-explorer/pnpm-lock.yaml`

- [ ] **Step 1: Install packages**

```bash
cd academic-paper-explorer
pnpm add react-force-graph-2d react-force-graph-3d
```

Expected: both appear under `dependencies` at `^1.29.x`.

- [ ] **Step 2: Verify resolved versions**

Run: `cd academic-paper-explorer && node -e "const p=require('./package.json');console.log(p.dependencies['react-force-graph-2d'],p.dependencies['react-force-graph-3d'])"`
Expected: prints two `^1.29...` (or newer 1.x) ranges.

- [ ] **Step 3: Baseline build check**

Run: `cd academic-paper-explorer && pnpm typecheck && pnpm build`
Expected: both succeed (nothing imports the new packages yet).

- [ ] **Step 4: Commit**

```bash
git add academic-paper-explorer/package.json academic-paper-explorer/pnpm-lock.yaml
git commit -m "chore(frontend): add react-force-graph-2d/3d"
```

---

## Task 2: Node color/size encoding (pure)

**Files:**
- Create: `academic-paper-explorer/src/graph/encoding.ts`
- Test: `academic-paper-explorer/src/graph/encoding.test.ts`

- [ ] **Step 1: Write the failing test**

Create `academic-paper-explorer/src/graph/encoding.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { colorFor, sizeFor, withAlpha } from './encoding'
import type { NetworkNode } from '../types/domain'

const node = (over: Partial<NetworkNode> = {}): NetworkNode => ({
  id: 'x', label: 'x', title: 'x', citationCount: 0, authors: '', isRoot: false,
  pageRankScore: 0, clusterId: 0, size: 10, color: '#000000', ...over,
})

describe('colorFor', () => {
  it('is deterministic for cluster mode', () => {
    expect(colorFor(node({ clusterId: 3 }), 'cluster')).toBe(colorFor(node({ clusterId: 3 }), 'cluster'))
  })
  it('returns gray for missing year', () => {
    expect(colorFor(node({ year: undefined }), 'year')).toBe('#6b7280')
  })
  it('returns gray for empty fields', () => {
    expect(colorFor(node({ fieldsOfStudy: [] }), 'field')).toBe('#6b7280')
  })
  it('is stable for the same field', () => {
    expect(colorFor(node({ fieldsOfStudy: ['Physics'] }), 'field')).toBe(
      colorFor(node({ fieldsOfStudy: ['Physics'] }), 'field'),
    )
  })
})

describe('sizeFor', () => {
  it('clamps zero citations to the minimum radius', () => {
    expect(sizeFor(node({ citationCount: 0 }), 'citations')).toBe(6)
  })
  it('clamps huge citation counts to the maximum radius', () => {
    expect(sizeFor(node({ citationCount: 100000 }), 'citations')).toBe(30)
  })
  it('is monotonic in citations', () => {
    expect(sizeFor(node({ citationCount: 100 }), 'citations')).toBeGreaterThan(
      sizeFor(node({ citationCount: 10 }), 'citations'),
    )
  })
  it('clamps pagerank into [6, 30]', () => {
    const v = sizeFor(node({ pageRankScore: 0.5 }), 'pagerank')
    expect(v).toBeGreaterThanOrEqual(6)
    expect(v).toBeLessThanOrEqual(30)
  })
})

describe('withAlpha', () => {
  it('converts #rrggbb to rgba', () => {
    expect(withAlpha('#4ade80', 0.5)).toBe('rgba(74, 222, 128, 0.5)')
  })
  it('expands shorthand hex', () => {
    expect(withAlpha('#fff', 1)).toBe('rgba(255, 255, 255, 1)')
  })
  it('passes through non-hex strings', () => {
    expect(withAlpha('hsl(1,2%,3%)', 0.5)).toBe('hsl(1,2%,3%)')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd academic-paper-explorer && pnpm test src/graph/encoding.test.ts`
Expected: FAIL — module `./encoding` not found.

- [ ] **Step 3: Implement encoding.ts**

Create `academic-paper-explorer/src/graph/encoding.ts`:

```ts
import type { NetworkNode } from '../types/domain'

export type ColorMode = 'cluster' | 'year' | 'field'
export type SizeMode = 'citations' | 'pagerank'

const CLUSTER_PALETTE = [
  '#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa',
  '#f87171', '#34d399', '#38bdf8', '#fb923c', '#c084fc',
]

const FIELD_PALETTE = [
  '#818cf8', '#22d3ee', '#facc15', '#f472b6',
  '#4ade80', '#fb923c', '#a78bfa', '#2dd4bf',
]

const MIN_YEAR = 1970
const FALLBACK_COLOR = '#6b7280'
const MIN_RADIUS = 6
const MAX_RADIUS = 30

export function yearColor(year?: number): string {
  if (!year) return FALLBACK_COLOR
  const maxYear = new Date().getFullYear()
  const t = Math.max(0, Math.min(1, (year - MIN_YEAR) / (maxYear - MIN_YEAR)))
  const hue = 220 - t * 220
  return `hsl(${Math.round(hue)}, 70%, 55%)`
}

export function fieldColor(fields?: string[]): string {
  const key = fields && fields.length > 0 ? fields[0] : ''
  if (!key) return FALLBACK_COLOR
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return FIELD_PALETTE[Math.abs(hash) % FIELD_PALETTE.length]
}

export function colorFor(node: NetworkNode, mode: ColorMode): string {
  switch (mode) {
    case 'cluster':
      return CLUSTER_PALETTE[Math.abs(node.clusterId) % CLUSTER_PALETTE.length]
    case 'year':
      return yearColor(node.year)
    case 'field':
      return fieldColor(node.fieldsOfStudy)
  }
}

export function sizeFor(node: NetworkNode, mode: SizeMode): number {
  const raw = mode === 'citations' ? node.citationCount : node.pageRankScore * 600
  const value = mode === 'citations' ? MIN_RADIUS + Math.sqrt(Math.max(0, raw)) * 1.2 : MIN_RADIUS + Math.max(0, raw)
  return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, value))
}

export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return hex
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd academic-paper-explorer && pnpm test src/graph/encoding.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add academic-paper-explorer/src/graph/encoding.ts academic-paper-explorer/src/graph/encoding.test.ts
git commit -m "feat(frontend): graph color/size encoding helpers"
```

---

## Task 3: Graph filtering (pure)

**Files:**
- Create: `academic-paper-explorer/src/graph/graphFilters.ts`
- Test: `academic-paper-explorer/src/graph/graphFilters.test.ts`

- [ ] **Step 1: Write the failing test**

Create `academic-paper-explorer/src/graph/graphFilters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { filterGraph } from './graphFilters'
import type { NetworkEdge, NetworkNode } from '../types/domain'

const node = (id: string, over: Partial<NetworkNode> = {}): NetworkNode => ({
  id, label: id, title: id, citationCount: 0, authors: '', isRoot: false,
  pageRankScore: 0, clusterId: 0, size: 10, color: '#000000', ...over,
})

const base = {
  yearRange: [1990, 2026] as [number, number],
  minCitations: 0,
  selectedFields: [] as string[],
  selectedVenues: [] as string[],
  timelineYear: null as number | null,
}

describe('filterGraph', () => {
  it('keeps everything with default filters', () => {
    const nodes = [node('a', { year: 2000 }), node('b', { year: 2010 })]
    const edges: NetworkEdge[] = [{ from: 'a', to: 'b', type: 'reference', weight: 1 }]
    const out = filterGraph(nodes, edges, base)
    expect(out.nodes).toHaveLength(2)
    expect(out.edges).toHaveLength(1)
  })

  it('applies the timeline as an upper bound', () => {
    const nodes = [node('a', { year: 2000 }), node('b', { year: 2015 })]
    const out = filterGraph(nodes, [], { ...base, timelineYear: 2010 })
    expect(out.nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('applies the year range', () => {
    const nodes = [node('a', { year: 1980 }), node('b', { year: 2010 })]
    const out = filterGraph(nodes, [], base)
    expect(out.nodes.map((n) => n.id)).toEqual(['b'])
  })

  it('drops edges whose endpoints were removed', () => {
    const nodes = [node('a', { year: 2000 })]
    const edges: NetworkEdge[] = [{ from: 'a', to: 'b', type: 'reference', weight: 1 }]
    const out = filterGraph(nodes, edges, base)
    expect(out.edges).toHaveLength(0)
  })

  it('filters by minimum citations', () => {
    const nodes = [node('a', { citationCount: 5 }), node('b', { citationCount: 50 })]
    const out = filterGraph(nodes, [], { ...base, minCitations: 10 })
    expect(out.nodes.map((n) => n.id)).toEqual(['b'])
  })

  it('filters by fields of study', () => {
    const nodes = [node('a', { fieldsOfStudy: ['Physics'] }), node('b', { fieldsOfStudy: ['Biology'] })]
    const out = filterGraph(nodes, [], { ...base, selectedFields: ['Physics'] })
    expect(out.nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('filters by venue', () => {
    const nodes = [node('a', { venue: 'Nature' }), node('b', { venue: 'Cell' })]
    const out = filterGraph(nodes, [], { ...base, selectedVenues: ['Nature'] })
    expect(out.nodes.map((n) => n.id)).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd academic-paper-explorer && pnpm test src/graph/graphFilters.test.ts`
Expected: FAIL — module `./graphFilters` not found.

- [ ] **Step 3: Implement graphFilters.ts**

Create `academic-paper-explorer/src/graph/graphFilters.ts`:

```ts
import type { NetworkEdge, NetworkNode } from '../types/domain'

export interface GraphFilters {
  yearRange: [number, number]
  minCitations: number
  selectedFields: string[]
  selectedVenues: string[]
  timelineYear: number | null
}

export function filterGraph(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  f: GraphFilters,
): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  const kept = nodes.filter((n) => {
    if (n.year != null) {
      if (n.year < f.yearRange[0] || n.year > f.yearRange[1]) return false
      if (f.timelineYear != null && n.year > f.timelineYear) return false
    }
    if (n.citationCount < f.minCitations) return false
    if (f.selectedFields.length > 0) {
      const fields = n.fieldsOfStudy ?? []
      if (!fields.some((x) => f.selectedFields.includes(x))) return false
    }
    if (f.selectedVenues.length > 0) {
      if (!n.venue || !f.selectedVenues.includes(n.venue)) return false
    }
    return true
  })

  const ids = new Set(kept.map((n) => n.id))
  const keptEdges = edges.filter((e) => ids.has(e.from) && ids.has(e.to))
  return { nodes: kept, edges: keptEdges }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd academic-paper-explorer && pnpm test src/graph/graphFilters.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add academic-paper-explorer/src/graph/graphFilters.ts academic-paper-explorer/src/graph/graphFilters.test.ts
git commit -m "feat(frontend): graph filtering pure function"
```

---

## Task 4: Force-graph data adapter (pure)

**Files:**
- Create: `academic-paper-explorer/src/graph/graphAdapter.ts`
- Test: `academic-paper-explorer/src/graph/graphAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `academic-paper-explorer/src/graph/graphAdapter.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { graphAdapter } from './graphAdapter'
import type { NetworkEdge, NetworkNode } from '../types/domain'

const node = (id: string, over: Partial<NetworkNode> = {}): NetworkNode => ({
  id, label: id, title: id, citationCount: 0, authors: '', isRoot: false,
  pageRankScore: 0, clusterId: 0, size: 10, color: '#000000', ...over,
})

describe('graphAdapter', () => {
  it('maps every node with color, size and val', () => {
    const out = graphAdapter([node('a'), node('b')], [], { colorMode: 'cluster', sizeMode: 'citations' })
    expect(out.nodes).toHaveLength(2)
    for (const n of out.nodes) {
      expect(typeof n.color).toBe('string')
      expect(n.size).toBeGreaterThan(0)
      expect(n.val).toBe(n.size)
    }
  })

  it('drops edges pointing at unknown nodes', () => {
    const edges: NetworkEdge[] = [{ from: 'a', to: 'ghost', type: 'reference', weight: 1 }]
    const out = graphAdapter([node('a')], edges, { colorMode: 'cluster', sizeMode: 'citations' })
    expect(out.links).toHaveLength(0)
  })

  it('preserves edge type and weight', () => {
    const edges: NetworkEdge[] = [{ from: 'a', to: 'b', type: 'citation', weight: 3 }]
    const out = graphAdapter([node('a'), node('b')], edges, { colorMode: 'cluster', sizeMode: 'citations' })
    expect(out.links[0]).toMatchObject({ source: 'a', target: 'b', type: 'citation', weight: 3 })
  })

  it('does not mutate its input nodes', () => {
    const input = [node('a')]
    const before = JSON.parse(JSON.stringify(input))
    graphAdapter(input, [], { colorMode: 'year', sizeMode: 'pagerank' })
    expect(input).toEqual(before)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd academic-paper-explorer && pnpm test src/graph/graphAdapter.test.ts`
Expected: FAIL — module `./graphAdapter` not found.

- [ ] **Step 3: Implement graphAdapter.ts**

Create `academic-paper-explorer/src/graph/graphAdapter.ts`:

```ts
import type { NetworkEdge, NetworkNode } from '../types/domain'
import { colorFor, sizeFor, type ColorMode, type SizeMode } from './encoding'

export interface GraphNode extends NetworkNode {
  color: string
  size: number
  val: number
  x?: number
  y?: number
  z?: number
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: 'reference' | 'citation'
  weight: number
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export function linkEndId(end: string | GraphNode): string {
  return typeof end === 'object' ? end.id : end
}

export function graphAdapter(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  opts: { colorMode: ColorMode; sizeMode: SizeMode },
): GraphData {
  const ids = new Set(nodes.map((n) => n.id))
  const outNodes: GraphNode[] = nodes.map((n) => {
    const size = sizeFor(n, opts.sizeMode)
    return { ...n, color: colorFor(n, opts.colorMode), size, val: size }
  })
  const links: GraphLink[] = edges
    .filter((e) => ids.has(e.from) && ids.has(e.to))
    .map((e) => ({ source: e.from, target: e.to, type: e.type, weight: e.weight }))
  return { nodes: outNodes, links }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd academic-paper-explorer && pnpm test src/graph/graphAdapter.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add academic-paper-explorer/src/graph/graphAdapter.ts academic-paper-explorer/src/graph/graphAdapter.test.ts
git commit -m "feat(frontend): force-graph data adapter"
```

---

## Task 5: Extend the UI store

**Files:**
- Modify: `academic-paper-explorer/src/store/useUiStore.ts`
- Test: `academic-paper-explorer/src/store/useUiStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `academic-paper-explorer/src/store/useUiStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './useUiStore'

beforeEach(() => {
  useUiStore.setState({
    graphView: '2d', colorMode: 'cluster', sizeMode: 'citations',
    timelineYear: null, timelinePlaying: false, graphQuery: '',
  })
})

describe('useUiStore graph UI state', () => {
  it('defaults to 2D cluster/citations', () => {
    const s = useUiStore.getState()
    expect(s.graphView).toBe('2d')
    expect(s.colorMode).toBe('cluster')
    expect(s.sizeMode).toBe('citations')
  })
  it('updates view and encodings', () => {
    const s = useUiStore.getState()
    s.setGraphView('3d')
    s.setColorMode('year')
    s.setSizeMode('pagerank')
    const next = useUiStore.getState()
    expect(next.graphView).toBe('3d')
    expect(next.colorMode).toBe('year')
    expect(next.sizeMode).toBe('pagerank')
  })
  it('updates timeline and search state', () => {
    const s = useUiStore.getState()
    s.setTimelineYear(2015)
    s.setTimelinePlaying(true)
    s.setGraphQuery('attention')
    const next = useUiStore.getState()
    expect(next.timelineYear).toBe(2015)
    expect(next.timelinePlaying).toBe(true)
    expect(next.graphQuery).toBe('attention')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd academic-paper-explorer && pnpm test src/store/useUiStore.test.ts`
Expected: FAIL — `graphView`/setters undefined.

- [ ] **Step 3: Add fields to the store**

Edit `academic-paper-explorer/src/store/useUiStore.ts`. After the import add:

```ts
import type { ColorMode, SizeMode } from '../graph/encoding'
```

Add these fields to the `UiState` interface (after `filters`):

```ts
  graphView: '2d' | '3d'
  colorMode: ColorMode
  sizeMode: SizeMode
  timelineYear: number | null
  timelinePlaying: boolean
  graphQuery: string
```

Add these setters to the interface:

```ts
  setGraphView: (v: UiState['graphView']) => void
  setColorMode: (m: ColorMode) => void
  setSizeMode: (m: SizeMode) => void
  setTimelineYear: (y: number | null) => void
  setTimelinePlaying: (playing: boolean) => void
  setGraphQuery: (q: string) => void
```

Add these defaults to the `create` initial state (after `filters: defaultFilters,`):

```ts
  graphView: '2d',
  colorMode: 'cluster',
  sizeMode: 'citations',
  timelineYear: null,
  timelinePlaying: false,
  graphQuery: '',
```

Add these implementations (after `resetFilters`):

```ts
  setGraphView: (v) => set({ graphView: v }),
  setColorMode: (m) => set({ colorMode: m }),
  setSizeMode: (m) => set({ sizeMode: m }),
  setTimelineYear: (y) => set({ timelineYear: y }),
  setTimelinePlaying: (playing) => set({ timelinePlaying: playing }),
  setGraphQuery: (q) => set({ graphQuery: q }),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd academic-paper-explorer && pnpm test src/store/useUiStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add academic-paper-explorer/src/store/useUiStore.ts academic-paper-explorer/src/store/useUiStore.test.ts
git commit -m "feat(frontend): extend UI store with graph view state"
```

---

## Task 6: Graph overlay components

**Files:**
- Create: `academic-paper-explorer/src/graph/ForceGraph3DLazy.tsx`
- Create: `academic-paper-explorer/src/components/graph/GraphTooltip.tsx`
- Create: `academic-paper-explorer/src/components/graph/GraphToolbar.tsx`
- Create: `academic-paper-explorer/src/components/graph/GraphLegend.tsx`
- Create: `academic-paper-explorer/src/components/graph/GraphTimeline.tsx`
- Create: `academic-paper-explorer/src/components/graph/GraphMinimap.tsx`

- [ ] **Step 1: Create the lazy 3D wrapper**

Create `academic-paper-explorer/src/graph/ForceGraph3DLazy.tsx`:

```tsx
import ForceGraph3D from 'react-force-graph-3d'

export default ForceGraph3D
```

- [ ] **Step 2: Create the hover tooltip**

Create `academic-paper-explorer/src/components/graph/GraphTooltip.tsx`:

```tsx
import React from 'react'
import type { GraphNode } from '../../graph/graphAdapter'

interface Props {
  node: GraphNode
  x: number
  y: number
}

const GraphTooltip: React.FC<Props> = ({ node, x, y }) => (
  <div
    className="pointer-events-none absolute z-20 max-w-xs rounded-lg border border-gray-600 bg-gray-800/95 p-3 text-xs text-gray-100 shadow-lg"
    style={{ left: x + 14, top: y + 14 }}
  >
    <div className="mb-1 font-medium text-white line-clamp-3">{node.title || node.label}</div>
    <div className="space-y-0.5 text-gray-400">
      {node.authors && <div className="line-clamp-1">{node.authors}</div>}
      <div>
        {node.year ? `${node.year} · ` : ''}
        {node.citationCount} 引用
      </div>
      {node.venue && <div className="line-clamp-1">{node.venue}</div>}
      {node.isRoot && <div className="text-orange-400">根论文</div>}
    </div>
  </div>
)

export default GraphTooltip
```

- [ ] **Step 3: Create the toolbar**

Create `academic-paper-explorer/src/components/graph/GraphToolbar.tsx`:

```tsx
import React from 'react'
import { Search } from 'lucide-react'
import { useUiStore } from '../../store/useUiStore'
import type { ColorMode, SizeMode } from '../../graph/encoding'

const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: 'cluster', label: '簇' },
  { value: 'year', label: '年份' },
  { value: 'field', label: '领域' },
]

const SIZE_MODES: { value: SizeMode; label: string }[] = [
  { value: 'citations', label: '引用数' },
  { value: 'pagerank', label: 'PageRank' },
]

const GraphToolbar: React.FC = () => {
  const { graphView, setGraphView, colorMode, setColorMode, sizeMode, setSizeMode, graphQuery, setGraphQuery } =
    useUiStore()

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-lg bg-gray-800/90 p-3 text-xs text-white">
      <div className="flex overflow-hidden rounded border border-gray-600">
        {(['2d', '3d'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setGraphView(v)}
            className={`px-3 py-1 ${graphView === v ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2">
        <span className="text-gray-400">配色</span>
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as ColorMode)}
          className="rounded bg-gray-700 px-1 py-0.5"
        >
          {COLOR_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <span className="text-gray-400">大小</span>
        <select
          value={sizeMode}
          onChange={(e) => setSizeMode(e.target.value as SizeMode)}
          className="rounded bg-gray-700 px-1 py-0.5"
        >
          {SIZE_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1">
        <Search className="h-3 w-3 text-gray-400" />
        <input
          value={graphQuery}
          onChange={(e) => setGraphQuery(e.target.value)}
          placeholder="图内搜索"
          className="w-28 bg-transparent outline-none placeholder:text-gray-500"
        />
      </div>
    </div>
  )
}

export default GraphToolbar
```

- [ ] **Step 4: Create the legend**

Create `academic-paper-explorer/src/components/graph/GraphLegend.tsx`:

```tsx
import React from 'react'
import { useUiStore } from '../../store/useUiStore'
import { colorFor } from '../../graph/encoding'
import type { GraphNode } from '../../graph/graphAdapter'

interface Props {
  nodes: GraphNode[]
}

const GraphLegend: React.FC<Props> = ({ nodes }) => {
  const { colorMode } = useUiStore()

  let entries: { key: string; label: string; color: string }[] = []
  if (colorMode === 'cluster') {
    const seen = new Map<number, string>()
    for (const n of nodes) if (!seen.has(n.clusterId)) seen.set(n.clusterId, colorFor(n, 'cluster'))
    entries = [...seen.entries()].map(([id, color]) => ({ key: `c${id}`, label: `簇 ${id}`, color }))
  } else if (colorMode === 'field') {
    const seen = new Map<string, string>()
    for (const n of nodes) {
      const f = n.fieldsOfStudy?.[0]
      if (f && !seen.has(f)) seen.set(f, colorFor(n, 'field'))
    }
    entries = [...seen.entries()].map(([f, color]) => ({ key: f, label: f, color }))
  }

  return (
    <div className="absolute bottom-4 right-4 z-10 max-w-[220px] rounded-lg bg-gray-800/90 p-3 text-xs text-white">
      {colorMode === 'year' ? (
        <div>
          <div className="mb-1 text-gray-300">年份</div>
          <div
            className="h-2 w-40 rounded"
            style={{ background: 'linear-gradient(to right, hsl(220,70%,55%), hsl(0,70%,55%))' }}
          />
        </div>
      ) : (
        <div className="space-y-1">
          <div className="mb-1 text-gray-300">{colorMode === 'cluster' ? '聚类' : '学科领域'}</div>
          {entries.slice(0, 8).map((e) => (
            <div key={e.key} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: e.color }} />
              <span className="line-clamp-1">{e.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 space-y-1 border-t border-gray-600 pt-2 text-gray-300">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-orange-500" />
          <span>根论文</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-green-400" />
          <span>引用关系</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-blue-400" />
          <span>参考关系</span>
        </div>
      </div>
    </div>
  )
}

export default GraphLegend
```

- [ ] **Step 5: Create the timeline**

Create `academic-paper-explorer/src/components/graph/GraphTimeline.tsx`:

```tsx
import React, { useEffect } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { useUiStore } from '../../store/useUiStore'

interface Props {
  minYear: number
  maxYear: number
}

const GraphTimeline: React.FC<Props> = ({ minYear, maxYear }) => {
  const { timelineYear, timelinePlaying, setTimelineYear, setTimelinePlaying } = useUiStore()
  const value = timelineYear ?? maxYear

  useEffect(() => {
    if (!timelinePlaying) return
    const id = setInterval(() => {
      const current = useUiStore.getState().timelineYear ?? maxYear
      if (current >= maxYear) {
        setTimelinePlaying(false)
        return
      }
      setTimelineYear(Math.min(maxYear, current + 1))
    }, 700)
    return () => clearInterval(id)
  }, [timelinePlaying, maxYear, setTimelineYear, setTimelinePlaying])

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-gray-800/90 px-4 py-2 text-xs text-white">
      <button onClick={() => setTimelinePlaying(!timelinePlaying)} title={timelinePlaying ? '暂停' : '播放'}>
        {timelinePlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <input
        type="range"
        min={minYear}
        max={maxYear}
        value={value}
        onChange={(e) => {
          setTimelinePlaying(false)
          setTimelineYear(parseInt(e.target.value))
        }}
        className="w-48"
      />
      <span className="w-10 tabular-nums">{value}</span>
      {timelineYear != null && (
        <button
          onClick={() => {
            setTimelinePlaying(false)
            setTimelineYear(null)
          }}
          title="清除时间过滤"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

export default GraphTimeline
```

- [ ] **Step 6: Create the minimap**

Create `academic-paper-explorer/src/components/graph/GraphMinimap.tsx`:

```tsx
import React, { useEffect, useMemo, useRef } from 'react'
import type { GraphNode } from '../../graph/graphAdapter'

interface Props {
  nodes: GraphNode[]
  selectedId: string | null
  onSelect: (x: number, y: number) => void
}

const WIDTH = 180
const HEIGHT = 120
const PADDING = 8

const GraphMinimap: React.FC<Props> = ({ nodes, selectedId, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const bounds = useMemo(() => {
    if (nodes.length === 0) return null
    const xs = nodes.map((n) => n.x ?? 0)
    const ys = nodes.map((n) => n.y ?? 0)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    return { minX, minY, spanX: Math.max(1, maxX - minX), spanY: Math.max(1, maxY - minY) }
  }, [nodes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !bounds) return
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    const scale = Math.min((WIDTH - PADDING * 2) / bounds.spanX, (HEIGHT - PADDING * 2) / bounds.spanY)
    for (const n of nodes) {
      const px = PADDING + ((n.x ?? 0) - bounds.minX) * scale
      const py = PADDING + ((n.y ?? 0) - bounds.minY) * scale
      ctx.beginPath()
      ctx.arc(px, py, n.id === selectedId ? 2.5 : 1.4, 0, 2 * Math.PI)
      ctx.fillStyle = n.id === selectedId ? '#ffd700' : n.color
      ctx.fill()
    }
  }, [nodes, bounds, selectedId])

  if (!bounds) return null

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = Math.min((WIDTH - PADDING * 2) / bounds.spanX, (HEIGHT - PADDING * 2) / bounds.spanY)
    const gx = bounds.minX + (e.clientX - rect.left - PADDING) / scale
    const gy = bounds.minY + (e.clientY - rect.top - PADDING) / scale
    onSelect(gx, gy)
  }

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      onClick={handleClick}
      className="absolute bottom-4 left-4 z-10 cursor-pointer rounded-lg border border-gray-600 opacity-90"
    />
  )
}

export default GraphMinimap
```

- [ ] **Step 7: Typecheck**

Run: `cd academic-paper-explorer && pnpm typecheck`
Expected: PASS. If `react-force-graph-3d` has no type declarations, add `// @ts-expect-error -- library ships untyped` above the import in `ForceGraph3DLazy.tsx` and re-run.

- [ ] **Step 8: Commit**

```bash
git add academic-paper-explorer/src/graph/ForceGraph3DLazy.tsx academic-paper-explorer/src/components/graph/
git commit -m "feat(frontend): graph toolbar, legend, timeline, tooltip, minimap"
```

---

## Task 7: Rewrite NetworkGraph with force-graph

**Files:**
- Modify: `academic-paper-explorer/src/components/NetworkGraph.tsx`

- [ ] **Step 1: Replace the whole file**

Overwrite `academic-paper-explorer/src/components/NetworkGraph.tsx` with:

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `cd academic-paper-explorer && pnpm typecheck`
Expected: PASS. If `onBackgroundClick`/`onEngineStop`/`cameraPosition` need narrower types, cast the ref as `any` (already done) and keep props as written. If a prop is genuinely unsupported by the installed version, remove only that prop and re-run; the functional behavior it provides (search fly-to / minimap gating) degrades gracefully.

- [ ] **Step 3: Lint**

Run: `cd academic-paper-explorer && pnpm lint`
Expected: no errors (warnings from `react-hooks/exhaustive-deps` are acceptable; lint exits 0).

- [ ] **Step 4: Build**

Run: `cd academic-paper-explorer && pnpm build`
Expected: succeeds; output should show a separate lazy chunk for the 3D renderer.

- [ ] **Step 5: Commit**

```bash
git add academic-paper-explorer/src/components/NetworkGraph.tsx
git commit -m "feat(frontend): force-graph 2D/3D network view with overlays"
```

---

## Task 8: Remove the old layout stack

**Files:**
- Delete: `academic-paper-explorer/src/graph/computeLayout.ts`
- Delete: `academic-paper-explorer/src/graph/computeLayout.test.ts`
- Delete: `academic-paper-explorer/src/graph/layout.worker.ts`
- Delete: `academic-paper-explorer/src/graph/useLayout.ts`
- Modify: `academic-paper-explorer/package.json`

- [ ] **Step 1: Confirm there are no remaining imports**

Run: `cd academic-paper-explorer && rg -n "computeLayout|layout\.worker|useLayout" src`
Expected: no matches (NetworkGraph no longer imports them).

- [ ] **Step 2: Delete the files**

```bash
cd academic-paper-explorer
git rm src/graph/computeLayout.ts src/graph/computeLayout.test.ts src/graph/layout.worker.ts src/graph/useLayout.ts
```

- [ ] **Step 3: Remove the direct d3-force dependency**

```bash
cd academic-paper-explorer
pnpm remove d3-force @types/d3-force
```

Expected: neither appears in `package.json`; `react-force-graph-*` still depend on it transitively.

- [ ] **Step 4: Verify**

Run: `cd academic-paper-explorer && rg -n "d3-force" src`
Expected: no matches.
Run: `cd academic-paper-explorer && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A academic-paper-explorer
git commit -m "refactor(frontend): drop custom worker layout for library simulation"
```

---

## Task 9: Component integration test

**Files:**
- Create: `academic-paper-explorer/src/components/NetworkGraph.test.tsx`

- [ ] **Step 1: Write the test**

Create `academic-paper-explorer/src/components/NetworkGraph.test.tsx`:

```tsx
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-force-graph-2d', () => ({
  default: (props: any) => (
    <div data-testid="fg2d">
      <button data-testid="node-a-click" onClick={() => props.onNodeClick({ id: 'a', title: 'A' })}>
        click
      </button>
      <button data-testid="node-a-hover" onClick={() => props.onNodeHover({ id: 'a', title: 'A' })}>
        hover
      </button>
      <button data-testid="background" onClick={() => props.onBackgroundClick()}>
        bg
      </button>
    </div>
  ),
}))

vi.mock('../hooks/usePaperNetwork', () => ({
  usePaperNetwork: () => ({
    data: {
      nodes: [
        {
          id: 'a', label: 'A', title: 'A', citationCount: 1, authors: '', isRoot: true,
          pageRankScore: 0.5, clusterId: 0, size: 20, color: '#ffffff', year: 2000,
        },
        {
          id: 'b', label: 'B', title: 'B', citationCount: 1, authors: '', isRoot: false,
          pageRankScore: 0.2, clusterId: 1, size: 20, color: '#ffffff', year: 2010,
        },
      ],
      edges: [{ from: 'a', to: 'b', type: 'reference', weight: 1 }],
    },
    isLoading: false,
    error: null,
  }),
}))

import NetworkGraph from './NetworkGraph'
import { useUiStore } from '../store/useUiStore'

beforeEach(() => {
  useUiStore.setState({
    selectedPaper: null,
    selectedNodeId: null,
    graphQuery: '',
    graphView: '2d',
    timelineYear: null,
    timelinePlaying: false,
  })
})

describe('NetworkGraph', () => {
  it('selects a node on a single click', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-click'))
    expect(useUiStore.getState().selectedNodeId).toBe('a')
  })

  it('rebuilds the network on a double click', () => {
    render(<NetworkGraph />)
    const node = screen.getByTestId('node-a-click')
    fireEvent.click(node)
    fireEvent.click(node)
    expect(useUiStore.getState().selectedPaper?.id).toBe('a')
  })

  it('clears selection when the background is clicked', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-click'))
    fireEvent.click(screen.getByTestId('background'))
    expect(useUiStore.getState().selectedNodeId).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test**

Run: `cd academic-paper-explorer && pnpm test src/components/NetworkGraph.test.tsx`
Expected: PASS. If jsdom throws on `ResizeObserver`, add to `academic-paper-explorer/src/test/setup.ts`:

```ts
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as never
}
```

- [ ] **Step 3: Run the full suite**

Run: `cd academic-paper-explorer && pnpm test`
Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add academic-paper-explorer/src/components/NetworkGraph.test.tsx academic-paper-explorer/src/test/setup.ts
git commit -m "test(frontend): network graph click interactions"
```

---

## Task 10: Docs and final verification

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `academic-paper-explorer/README.md` (only if it mentions the old rendering)

- [ ] **Step 1: Update the frontend table in ARCHITECTURE.md**

In the "Frontend" table, replace the rows for `graph/computeLayout.ts`,
`graph/layout.worker.ts`, and `graph/useLayout.ts` with:

```
| `graph/encoding.ts` | Pure color/size encoding by dimension (cluster/year/field, citations/pagerank). |
| `graph/graphFilters.ts` | Pure timeline/year/citations/field/venue filtering + dangling-edge removal. |
| `graph/graphAdapter.ts` | Pure adapter to the force-graph `{nodes, links}` shape. |
| `graph/ForceGraph3DLazy.tsx` | Lazily-imported three.js renderer wrapper. |
| `components/graph/*` | Toolbar, legend, timeline, tooltip, minimap overlays. |
```

Also update the "Known limitations" bullet that says SVG does not scale, to state
that rendering is now WebGL/canvas via `react-force-graph` (2D canvas, lazy 3D
three.js) and that the old custom worker layout was removed.

- [ ] **Step 2: Record bundle size**

```bash
cd academic-paper-explorer && pnpm build 2>&1 | tail -30
```

Note the reported chunk sizes in the commit message body: initial JS size and the
separately emitted 3D chunk.

- [ ] **Step 3: Full verification**

Run: `cd academic-paper-explorer && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all green, no test failures.

- [ ] **Step 4: Runtime smoke test**

```bash
cd /home/mt/Documents/projects/connectedpapers
bun run build:web
(timeout 10 bun run server &) ; sleep 1
curl -s -o /dev/null -w '%{http_code}\n' localhost:8787/
pkill -f 'bun run server' || true
```

Expected: `200`. If Semantic Scholar/OpenAlex are unavailable, record that manual
graph interaction was left for the user to verify locally.

- [ ] **Step 5: Commit**

```bash
git add ARCHITECTURE.md academic-paper-explorer/README.md 2>/dev/null || git add ARCHITECTURE.md
git commit -m "docs: update architecture for force-graph rendering"
```

---

## Self-Review

**Spec coverage:**
- Library choice + lazy 3D → Task 1, Task 6 Step 1, Task 7.
- Component structure + deletions → Tasks 6, 7, 8.
- Data flow → Task 7 (`filterGraph` → `graphAdapter` → render).
- Store additions → Task 5.
- Phase A (2D/3D, tooltip + highlight, click/dblclick, arrows) → Task 7.
- Phase B (color/size switch, legend sync, particles/width) → Tasks 6, 7.
- Phase C (search fly-to, timeline, minimap) → Tasks 6, 7.
- Testing → Tasks 2–5 (unit), Task 9 (component), Task 10 (full verify).
- Docs → Task 10.

**Placeholder scan:** No TBD/TODO. Every code step contains full code.

**Type consistency:** `ColorMode`/`SizeMode` defined in `encoding.ts` (Task 2) and
imported by `graphAdapter.ts` (Task 4) and `useUiStore.ts` (Task 5). `GraphNode`/
`GraphLink`/`GraphData`/`linkEndId` defined in `graphAdapter.ts` (Task 4) and used
by overlays (Task 6) and `NetworkGraph` (Task 7). Store setter names
(`setGraphView`/`setColorMode`/`setSizeMode`/`setTimelineYear`/`setTimelinePlaying`/
`setGraphQuery`) match between Task 5 and their consumers in Tasks 6–7.

**Risk:** `react-force-graph` prop names (`onBackgroundClick`, `onEngineStop`,
`cameraPosition`, `nodeCanvasObject`, `nodePointerAreaPaint`, `linkDirectionalArrow*`,
`linkDirectionalParticles`) are asserted against the installed version at Task 7
Step 2; the plan documents how to degrade if one differs.
