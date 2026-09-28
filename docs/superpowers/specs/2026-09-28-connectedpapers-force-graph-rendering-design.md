# ConnectedPapers — Force-Graph Rendering 设计 (Phase A/B/C)

> Status: approved 2026-09-28
> Scope: frontend only (`academic-paper-explorer/`)
> Supersedes the rendering layer delivered by Phase 5 (d3-force worker + hand-written Canvas 2D).

## 1. Goal

Replace the hand-written Canvas 2D renderer and the custom worker-based d3-force
layout with an interactive graph renderer built on `react-force-graph`, so the
citation network is easier to read and interact with. Primary mode is a 2D graph;
a 3D mode is available via a toggle.

Non-goals:

- No backend (`server/`) changes.
- No new API requests; the data source stays `usePaperNetwork(selectedPaper)`.
- No Supabase, no auth.
- No global graph persistence or new analytics.

## 2. Background

Current rendering (`src/components/NetworkGraph.tsx`, 395 lines):

- Hand-written Canvas 2D drawing loop (edges, arrowheads, nodes, labels).
- Force layout computed in a WebWorker via `src/graph/computeLayout.ts` +
  `layout.worker.ts` + `useLayout.ts` (synchronous d3-force ticks).
- Custom pan (drag) / zoom (wheel) / click-to-select.
- Adjacency highlight dimming, node counters, legend, dark three-column layout.

Limits: labels and hit-testing are manual; interactions (hover, focus, minimap,
timeline) are not implemented; scaling past a few hundred nodes is untested.

## 3. Library decision

Use `react-force-graph` packages:

- `react-force-graph-2d@^1.29` — canvas 2D renderer.
- `react-force-graph-3d@^1.29` — three.js renderer (WebGL).

Both share one data API (`{ nodes, links }`) and ship hover / click / right-click /
zoom / pan / node-drag behavior. React peer dependency is `*`, compatible with
React 18.

The 3D package is loaded with `React.lazy` so three.js (~150 KB gzip) does not
enter the initial bundle; it is fetched only the first time the user switches to
3D.

Direct dependency on `d3-force` / `@types/d3-force` is removed; the layout is
owned by the library (`force-graph` depends on d3-force internally).

## 4. Component structure

`NetworkGraph.tsx` remains the orchestrator imported by `HomePage` (import path
unchanged). Pure logic moves into small, independently testable modules.

| File | Responsibility |
| --- | --- |
| `src/graph/graphAdapter.ts` | Pure: `NetworkNode[]` + `NetworkEdge[]` + encoding options → `{ nodes, links }` force-graph shape. |
| `src/graph/encoding.ts` | Pure: `colorMode` (`cluster`/`year`/`field`) and `sizeMode` (`citations`/`pagerank`) → `color` / `size`. |
| `src/graph/graphFilters.ts` | Pure: apply timeline / year range / min citations / fields / venues to nodes and drop dangling edges. |
| `src/graph/ForceGraph3DLazy.tsx` | `React.lazy` wrapper around `react-force-graph-3d`. |
| `src/components/graph/GraphToolbar.tsx` | 2D/3D toggle, color dimension, size mapping, in-graph search input. |
| `src/components/graph/GraphTooltip.tsx` | Hover overlay (title, year, citations, authors). |
| `src/components/graph/GraphLegend.tsx` | Legend that follows the active color dimension. |
| `src/components/graph/GraphTimeline.tsx` | Year slider + play/pause. |
| `src/components/graph/GraphMinimap.tsx` | Small 2D thumbnail with viewport rectangle. |

Deleted:

- `src/graph/computeLayout.ts`
- `src/graph/computeLayout.test.ts`
- `src/graph/layout.worker.ts`
- `src/graph/useLayout.ts`

## 5. Data flow

```
usePaperNetwork(selectedPaper)            // unchanged data source
  -> graphFilters(networkData, filters)   // timeline / year / citations / fields / venues
  -> graphAdapter(filtered, encoding)     // { nodes, links }
  -> ForceGraph2D | ForceGraph3DLazy
```

Selection flow:

- Single click node → `setSelectedNodeId(id)`. `DetailsPanel` already fetches
  details from `selectedNodeId`, so the right panel updates immediately.
- Double click node → build a minimal `Paper` from the node
  (`{ id, title, authors, publication_year, citation_count, source }`) and call
  `setSelectedPaper(...)`. `usePaperNetwork` then re-fetches with the node as the
  new root and the existing loading copy is shown (10–30 s).

## 6. UI store additions

All additions are UI-only, matching the existing `useUiStore` contract:

| Field | Type | Purpose |
| --- | --- | --- |
| `graphView` | `'2d' \| '3d'` | Active renderer mode. |
| `colorMode` | `'cluster' \| 'year' \| 'field'` | Node color dimension. |
| `sizeMode` | `'citations' \| 'pagerank'` | Node size mapping. |
| `timelineYear` | `number \| null` | Upper bound year; `null` = off. |
| `timelinePlaying` | `boolean` | Timeline playback state. |
| `graphQuery` | `string` | In-graph search term / focus target. |

The data source contract (`const { data: networkData, isLoading, error } =
usePaperNetwork(selectedPaper)`) is preserved.

## 7. Interaction scope, phased

### Phase A — core swap + baseline interactions

1. 2D/3D rendering, toggle, camera (zoom / pan / orbit).
2. Hover tooltip + neighbor highlight with dimming of the rest.
3. Single-click select, double-click rebuild; legends, node counters, dark
   three-column layout, loading / error / empty-network branches preserved.
4. Directed arrowheads and reference / citation edge coloring.

### Phase B — visual encoding

5. Color dimension toggle (cluster / year / field) with legend sync.
6. Node size mapping toggle (citations / PageRank).
7. 3D directional particles (`linkDirectionalParticles`) / 2D edge width by
   weight.

### Phase C — navigation

8. In-graph search + camera fly-to on the matched node.
9. Timeline filtering + playback (advances `timelineYear`, filtering live).
10. Minimap thumbnail with current viewport indicator. The minimap reflects the
    2D layout and is shown in 2D mode only; it is hidden in 3D mode.

## 8. Behavior and boundaries

- Loading / error / no-selection / empty-network states keep their current copy
  and layout.
- Filtering drops edges whose endpoints were filtered out (existing behavior).
- 3D is lazy: first switch shows a `Suspense` fallback; three.js is not in the
  initial bundle.
- `useUiStore` stays UI-only (no server state in Zustand).
- `HomePage` three-column structure and the data source call are unchanged.

## 9. Testing

- Unit (vitest, pure functions): `graphAdapter`, `encoding`, `graphFilters` —
  including dangling-edge removal, color/size mapping, and timeline bounds.
- Component: mock `react-force-graph-2d` / `react-force-graph-3d`, assert click
  calls `setSelectedNodeId` and double click calls `setSelectedPaper`. If mocking
  is disproportionately costly, keep pure-function coverage plus
  typecheck/lint/build green.
- `computeLayout.test.ts` is deleted with its implementation.
- Verification command: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
  must pass.

## 10. Risks

- Destructive removal of the worker layout and its tests (approved).
- Bundle growth from three.js; mitigated by lazy loading. Record build output
  size before/after.
- Library force simulation runs on the main thread; at 50–100 nodes it is
  negligible. If graph size later grows into the hundreds, tune `warmupTicks` /
  `cooldownTicks`.
- First-load latency for 3D on slow disks; acceptable for a local single-user
  tool.
