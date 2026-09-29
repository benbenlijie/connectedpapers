# Graph export (PNG / JSON)

## Goal

Let a user save the citation graph for use outside the app: a PNG image of the
current view, JSON of the current filtered view, or JSON of the full fetched
network.

## Scope

- **PNG** — the current view only (what is drawn on the canvas).
- **JSON (visible)** — the nodes/edges after the active timeline and filters.
- **JSON (full)** — all nodes/edges of the fetched network, before filtering.

Both JSON variants are offered because the visible subgraph is what the user
sees, while the full network is what was crawled; they are not always the same.

## Design

### `src/graph/exportGraph.ts`

Pure, tested:

- `sanitizeFilename(input)` — replaces illegal characters and whitespace runs
  with `-`, collapses/trims dashes, caps at 80 chars, falls back to
  `connectedpapers`.
- `exportFilename(rootTitle, ext, now?)` — `<slug>-<YYYYMMDD>.<ext>`.
- `buildExportPayload(nodes, edges, opts)` — returns
  `{ meta, nodes, edges }` with `meta = { generator, scope, root_title,
  generated_at, node_count, edge_count }`; `scope` is `'visible' | 'full'`.

Thin DOM glue (not unit-tested beyond the object-URL/anchor path):

- `downloadText(filename, text, mime)` — Blob → object URL → anchor click.
- `downloadCanvasPng(canvas, filename)` — `canvas.toDataURL('image/png')` →
  anchor click.

### UI

`GraphToolbar` gains an "导出" menu (local `useState`) with three items and three
new optional props: `onExportPng`, `onExportJsonVisible`, `onExportJsonFull`. The
menu closes after each action. `NetworkGraph` owns the graph and the DOM, so it
implements the handlers and passes them down:

- PNG: `containerElRef.current.querySelector('canvas')`.
- JSON: `filteredNodes`/`filteredEdges` (visible) or `networkData.nodes`/`edges`
  (full), wrapped by `buildExportPayload` and pretty-printed.
- Filename root is the selected paper's title (falls back to `connectedpapers`).

PNG captures only the canvas, so the toolbar, legend, tooltip and minimap are
intentionally excluded.

### 3D capture

The 3D renderer is created with `rendererConfig: { preserveDrawingBuffer: true }`;
without it a WebGL `toDataURL` returns a blank image. The setting is passed
through the lazy `ForceGraph3DLazy` wrapper to `react-force-graph-3d`.

## Testing

- `exportGraph.test.ts`: `sanitizeFilename` (illegal chars, fallback, length
  cap), `exportFilename` (slug + date), `buildExportPayload` (scope, counts,
  null root title), `downloadText` (object URL created/revoked, anchor clicked).
- `GraphToolbar.test.tsx`: the export menu invokes each handler.
