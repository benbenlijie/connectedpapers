# ConnectedPapers — Graph Node Legibility 设计

> Status: approved 2026-09-28
> Scope: frontend only (`academic-paper-explorer/`), graph rendering
> Extends: `2026-09-28-connectedpapers-force-graph-rendering-design.md`

## Problem

After adopting `react-force-graph`, three legibility defects remain:

1. **Severe node occlusion.** No collision force is active, so nodes overlap.
2. **Labels unreadable.** All labels are drawn every frame directly over nodes and
   edges with no background.
3. **Colors lack contrast** against the `#111827` canvas.

## Goals

- Nodes never visually overlap at rest.
- Labels are readable and only shown when they carry signal.
- Colors are high-contrast and distinguishable on the dark canvas.

## Non-goals

- No data, store, or backend changes.
- No layout algorithm replacement (keep force-directed clusters).

## Design

### 1. Occlusion

- Re-add `d3-force` and `@types/d3-force` as direct dependencies.
- In 2D, inject `forceCollide` with `radius(node) = node.size + 6` and
  `strength(1)` via the graph ref after mount and whenever graph data changes.
- Strengthen repulsion (`forceManyBody().strength(-260)`) and set link distance
  from node sizes (`distance = (a.size + b.size) * 4`).
- In 3D, lower `nodeRelSize` and strengthen charge; do not add a third physics
  dependency.
- Reduce node radii: `MIN_RADIUS = 5`, `MAX_RADIUS = 18` (was 6 / 30).
- After the simulation stops, call `zoomToFit(600, 60)` once per graph-data
  change so the whole graph fits; never reset on later stops or user zoom.

### 2. Labels (LOD + background)

- New pure module `src/graph/labelLod.ts`:
  `pickVisibleLabels(nodes, { activeId, neighborIds, globalScale, limit })`
  returns a `Set<string>`.
  - Always: root, selected, hovered, active neighbours.
  - When `globalScale >= ZOOM_LABEL_THRESHOLD` (1.1): add the `limit` largest
    remaining nodes by `size`.
- Draw each visible label with a rounded semi-transparent pill background behind
  the text, constant on-screen font size (`12 / globalScale`).
- Greedy de-overlap: track drawn label rectangles; skip a non-priority label
  whose rectangle intersects an already-drawn one.
- Nodes not in the visible set draw no text.

### 3. Colors

- New high-contrast cluster palette (10 saturated, hue-separated colors).
- Node fill = color; dark stroke (`rgba(9,14,20,0.9)`) for separation; subtle
  outer glow for the root.
- Root border orange `#ff6b35`; selected gold `#ffd700`; hovered brightened.
- Year gradient and field palette brightened to match.

## Testing

- Unit: `labelLod.test.ts` — always-visible priority nodes, threshold gating,
  limit, empty active state.
- Browser: 2D graph renders with non-overlapping nodes and readable labels;
  `typecheck && lint && test && build` green.

## Risks

- `forceCollide` injection must use the 2D force instance from `d3-force`; a
  mismatch would silently no-op, so verify node separation in the browser.
- Aggressive collision can push clusters apart; `zoomToFit` mitigates, and
  parameters are intentionally tunable after visual review.
