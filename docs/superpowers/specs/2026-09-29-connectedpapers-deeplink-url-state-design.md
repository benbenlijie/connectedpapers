# Deep-link URL state for the paper network view

## Goal

Make the explorer view shareable and refresh-safe: the currently selected root
paper, its graph filters, encodings, view mode, timeline position, and selected
node are encoded in the URL so that reloading or sharing the address reproduces
the same view.

## Scope

In scope (full view state):

- `paper` — canonical root id (`resolveClientId(selectedPaper)`)
- `d` / `mn` — the actual `depth` / `maxNodes` used to build the network
- `node` — `selectedNodeId`
- `view` — `3d` when in 3D mode
- `color` / `size` — encoding modes
- `tl` — `timelineYear`
- `y0` / `y1` — `yearRange`
- `cit` — `minCitations`
- `f` / `v` — `selectedFields` / `selectedVenues` (repeated params)

Out of scope (transient, not encoded): `timelinePlaying`, `graphQuery`,
`highlightedNodes`, and the submitted search query (the left list is not
restored; only the graph view is).

## URL scheme

Query string on `/`, parsed/serialized with React Router `useSearchParams`.
Defaults are omitted to keep links short:

| Param | Meaning | Omitted when |
| --- | --- | --- |
| `paper` | canonical root id | nothing selected |
| `d` / `mn` | depth / maxNodes | no paper |
| `node` | selected node id | `null` |
| `view` | `3d` | `2d` |
| `color` | color mode | `cluster` |
| `size` | size mode | `citations` |
| `tl` | timeline year | `null` |
| `y0`/`y1` | year range | equals default `[1990, currentYear]` |
| `cit` | min citations | `0` |
| `f`/`v` | fields / venues | empty |

## Components

### `src/graph/urlState.ts` (pure, testable)

- `UrlState` interface mirroring the encoded fields.
- `defaultUrlState()` — defaults identical to `useUiStore`.
- `serializeUrlState(state): string` — deterministic query string, defaults
  omitted.
- `parseUrlState(search): UrlState` — lenient parse; clamped and defaulted:
  `depth` 1–3, `maxNodes` 1–300, invalid/NaN values fall back to defaults.
- `paperStubFromId(id): Paper` — minimal `Paper` carrying only `id` (so
  `resolveClientId` returns it) and `source: 'semantic_scholar'`.

### `src/store/useUiStore.ts`

- Add `graphDepth: number | null`, `graphMaxNodes: number | null` and
  `setGraphParams(depth, maxNodes)`.
- Add `selectRootPaper(paper)` used by list clicks and double-click rebuild:
  sets `selectedPaper` and clears `graphDepth`/`graphMaxNodes` so the adaptive
  (`usePaperNetwork`) defaults apply to a freshly chosen paper.
- Existing `setSelectedPaper` stays for URL hydration (does not clear params).

### `src/hooks/useUrlSync.ts`

- On mount: parse the URL once and hydrate the store (stub paper, graph params,
  filters, encodings, view, timeline, node).
- Subscribe to the relevant store fields; write the URL on change.
  - Root paper change → `navigate(..., { replace: false })` (history entry).
  - All other changes → `navigate(..., { replace: true })`.
- Feedback-loop guard: `lastWrittenRef` holds the last serialized string we
  wrote; the read effect skips hydration when the URL equals that value.
  `hydratedRef` prevents an initial default-state write from clobbering the URL.
- Browser back/forward is handled by React Router updating `useSearchParams`,
  which triggers re-hydration.

### Wiring

- `HomePage` calls `useUrlSync()`.
- `HomePage` and `NetworkGraph` pass `graphDepth`/`graphMaxNodes` into
  `usePaperNetwork(paper, depth, maxNodes)`; when null the hook keeps its
  adaptive defaults.
- `PaperList` and `NetworkGraph`'s `rebuildFromNode` call `selectRootPaper`.
- `DetailsPanel` is unchanged: the stub only carries an id, and its existing
  `usePaperDetails` call fills in the full record.

## Edge cases

- No `paper` param → nothing hydrated; the normal empty state shows.
- Invalid `d`/`mn`/`y0`/`y1`/`cit` → clamped or defaulted, never throws.
- Unresolvable id or network build failure → existing error UI in
  `NetworkGraph` / `DetailsPanel`; no new handling.
- URL length grows with many selected fields/venues; acceptable for a local
  single-user tool.

## Testing

- `urlState.test.ts`: serialize omits defaults; round-trip; clamping of
  `d`/`mn`; repeated `f`/`v`; invalid input falls back to defaults;
  `paperStubFromId` shape.
- `useUiStore.test.ts`: `selectRootPaper` clears graph params; `setGraphParams`
  sets them.
- `useUrlSync.test.tsx`: under `MemoryRouter`, mount with a query string hydrates
  the store; a store change writes the expected query string.
