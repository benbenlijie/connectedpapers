# Graph node context menu

## Goal

Right-click a node in the graph to act on that paper without leaving the graph:
re-root the network on it, search by its title, add it to the comparison, or open
the source.

## Design

- `graph/graphAdapter.ts:nodeToPaper(node)` (pure) reconstructs a minimal `Paper`
  from a `GraphNode`; the primary-pane double-click rebuild reuses it.
- `components/graph/NodeContextMenu.tsx` — a `fixed`-positioned `role="menu"` with
  `{ label, onSelect }` items. Closes on outside `mousedown`, `Escape`, or scroll.
- `NetworkGraph`:
  - `onNodeRightClick(node, event)` opens the menu at the pointer; the container
    `onContextMenu` calls `preventDefault` so the browser menu never shows.
  - `onBackgroundRightClick` closes it.
  - Items: **以此为根重建网络** (`rerootFromNode` — primary re-roots via
    `selectRootPaper`, compare pane sets `comparePaper`), **按标题搜索**
    (`submitQuery({ query: title, query_type: 'keyword' })`), **加入对比**
    (primary only, hidden when already the compare paper), **打开原文** (only when
    the node has a `url`).
  - Works in both 2D and 3D (shared `commonProps`).

## Testing

- `graphAdapter.test.ts`: `nodeToPaper` field mapping + label fallback.
- `NetworkGraph.test.tsx`: right-click opens the menu; "以此为根重建网络" re-roots;
  "按标题搜索" sets the submitted query.
