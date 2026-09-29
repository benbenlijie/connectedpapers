# Paper notes / annotations (local)

## Goal

Let a user attach a free-text note to a paper and see which papers are annotated
directly on the graph. Notes are local to the browser; they are not shared or
synced.

## Scope

- One free-text note per paper.
- Edited in the details panel; annotated nodes get a marker in the 2D graph.
- Stored in `localStorage`; keyed by paper id.

Out of scope: tags/colors, a notes list or "annotated only" filter, 3D markers,
including notes in JSON export, and deep-link/URL encoding of notes.

## Design

### `src/lib/notes.ts` (pure, tested)

- `Notes = Record<string, string>` — paper id → note text.
- `parseNotes(raw)` — lenient JSON parse; non-object / array / non-string values
  are dropped.
- `serializeNotes(notes)` — `JSON.stringify`.
- `hasNote(notes, id)` — false for missing, null, or blank.
- `withNote(notes, id, text)` — immutable add/replace; blank text deletes the key.
- `annotatedIds(notes)` — `Set` of ids with non-blank text.

### `src/store/useNotesStore.ts` (zustand)

- Initial state loads from `localStorage['connectedpapers.notes.v1']` via
  `parseNotes` (guarded against unavailable storage).
- `setNote(id, text)` and `removeNote(id)` apply `withNote`, persist with
  `serializeNotes`, then set state. A blank `setNote` removes the entry.

### UI

- `DetailsPanel` renders a "我的笔记" textarea keyed by
  `selectedNodeId || resolveClientId(selectedPaper)`, writes every change to the
  store (auto-save), and shows a "已保存" hint when the note is non-blank. The
  section is hidden when no paper is selected.
- `NetworkGraph` subscribes to the notes store, derives `annotatedIds`, and draws
  a small amber marker at each annotated node's top-right in the 2D canvas
  `paintNode` pass (respects the dim/highlight alpha).

## Testing

- `notes.test.ts`: `parseNotes` (null/invalid/array/non-string), `serializeNotes`
  round-trip, `hasNote` blanks, `withNote` immutability + blank delete,
  `annotatedIds`.
- `useNotesStore.test.ts`: set/persist, blank removal, explicit removal, initial
  load from `localStorage` (fresh module import).
- `DetailsPanel.test.tsx`: existing note is shown, edits persist, "已保存" hint
  toggles.
