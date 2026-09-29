# Reader highlights and annotations (local)

## Goal

Highlight excerpts in the arXiv HTML reader, optionally with a note, and keep
them across reloads. Local-only, like notes.

## Scope

- Three colours (yellow/green/pink); an optional note on a highlight.
- Click a highlight to recolour or delete it.
- Stored per paper in `localStorage`.

Out of scope: cross-device sync, exporting, linking highlights into the graph.

## Anchoring

A highlight stores `{ blockIndex, start, end, text, note?, color, createdAt }`.
`blockIndex` is the position of the block in `collectBlocks(doc)`; `start`/`end`
are character offsets within that block's text. Highlight `<mark>`s preserve the
block's text, so the offsets stay valid across reloads and re-renders.

## `src/lib/highlights.ts`

- Types `HighlightColor`, `HighlightAnchor`, `Highlight`, `HighlightMap`;
  `HIGHLIGHT_COLORS` (+ `colorCss`).
- `parseHighlights(raw)` lenient; `serializeHighlights`; `withHighlight` /
  `removeHighlight` (immutable).
- `rangeToAnchor(range, blocks)` — offsets relative to the containing block, or
  `null` when the range crosses blocks.
- `anchorToRange(doc, block, start, end)` — rebuild a `Range` by walking text
  nodes.
- `applyHighlight(doc, range, id, color)` — split text nodes and wrap each
  segment in `<mark data-hl-id>` (handles ranges spanning inline elements).
- `removeHighlightNodes(doc, id)` / `clearHighlights(doc)` — unwrap.

## `src/store/useHighlightsStore.ts`

Zustand over `localStorage['connectedpapers.highlights.v1']` with
`addHighlight(key, hl)` / `deleteHighlight(key, id)`; guarded load/persist.

## `src/pages/ReaderPage.tsx`

On iframe load it collects blocks, clears and re-applies the stored highlights
for the current key, and wires:
- `mouseup` → compute the anchor and show a floating bar with colour swatches, a
  note input and 批注;
- mark click → a bar to recolour/delete the active highlight.

Reader key is `pid ?? arxivId` (same as reading status).

## Testing

- `highlights.test.ts`: anchor round-trip, cross-block null, wrapping
  same-node and cross-inline selections without changing block text,
  remove/clear, parse/serialize/with/remove, colour mapping.
- `useHighlightsStore.test.ts`: add/remove/persist + restore on fresh import.
