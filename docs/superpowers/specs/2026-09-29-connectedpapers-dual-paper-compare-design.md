# Dual-paper comparison (side-by-side)

## Goal

Compare two papers at once by showing their citation networks side by side, each
independently explorable, sharing the same filters and encodings.

## Interactions

- A paper in the search list gets a "对比" button that sets it as the second root
  (B); pressing it again on the same paper clears it.
- Non-compare mode: a single graph (the primary root A).
- Compare mode: two panes, A on the left, B on the right. The compare pane shows
  the B title and a ✕ to exit.
- Filters, encoding modes, 2D/3D view and timeline are shared (one toolbar on the
  primary pane). Node selection/highlight is per pane.
- Clicking a node in either pane updates the details panel — most recent click
  wins. Clicking in A clears B's node selection and vice versa.

## State (`useUiStore`)

- `comparePaper: Paper | null` — the B root; `setComparePaper(p)` also clears
  `compareSelectedNodeId`.
- `compareSelectedNodeId: string | null` — the B pane highlight.
- Existing `selectedPaper` / `selectedNodeId` remain the A slot.

## `NetworkGraph` parameterization

- Props `{ paper?: Paper | null; slot?: 'primary' | 'compare' }`, default
  `slot='primary'` and `paper = store.selectedPaper`.
- The pane reads its own selection id by slot and uses a slot-aware setter that
  clears the other slot's node selection.
- Each pane calls `usePaperNetwork(rootPaper, ...)`; React Query caches per
  `paperId`, so the two networks are independent.
- Shared state still comes from the store (filters, encodings, view, timeline,
  graph query). The toolbar/legend/timeline render only on the primary pane; the
  compare pane renders the graph, its own hover tooltip, minimap and export menu.
- Double-click rebuild (re-root the graph) is primary-only; the compare pane
  supports hover + single-click selection.

## Layout (`HomePage`)

- No B: `<NetworkGraph />`.
- With B: two flex panes, each `h-full`, left primary + right
  `<NetworkGraph paper={comparePaper} slot="compare" />`; a header strip on the
  compare pane shows the title and an exit button.

## URL (`graph/urlState.ts`)

- New params `paper2` (B root id) and `node2` (B selected node), omitted when
  empty. `paper2` is only emitted when `paper` is present.
- `useUrlSync` hydrates `comparePaper` (stub) and `compareSelectedNodeId`, and
  pushes a history entry when either `paper` or `paper2` changes.

## Testing

- `urlState.test.ts`: `paper2`/`node2` round-trip and default omission.
- `useUiStore.test.ts`: `setComparePaper` sets B and clears `compareSelectedNodeId`.
- `NetworkGraph.test.tsx`: compare slot selects via `compareSelectedNodeId` and
  clears the primary selection.
- `PaperList.test.tsx` (new): the compare button sets/clears B.
- `DetailsPanel.test.tsx`: details follow `compareSelectedNodeId` over
  `selectedNodeId`.
- `useUrlSync.test.tsx`: hydrates and writes `paper2`/`node2`.
