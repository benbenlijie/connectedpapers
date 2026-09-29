# Reading queue and progress (local)

## Goal

Track where each paper stands in the reading workflow (待读 / 在读 / 已读) and how
far the reader has scrolled, kept locally in the browser.

## Scope

- One status per paper, plus a coarse progress percentage.
- Status control and badge in the paper list; a "仅看阅读清单" filter.
- The reader marks a paper as 在读 on open and records scroll progress.

Out of scope: server sync, cross-device, per-paper reading time.

## Storage

`localStorage['connectedpapers.reading.v1']` — `{ [paperId]: { status, progress?,
updatedAt? } }`, consistent with notes.

## Key

Reading entries are keyed by paper id. The reader only knows the arXiv id, so the
details panel links to `/read/:arxivId?pid=<paperId>`; the reader uses
`pid ?? arxivId` as its key. For S2 papers `paper.id === semantic_scholar_id`, so
the list and reader agree.

## `src/lib/reading.ts` (pure)

- `ReadingStatus = 'to_read' | 'reading' | 'done'`; `ReadingEntry`; `ReadingMap`.
- `READING_STATUSES` (value + Chinese label); `statusLabel(status)`.
- `parseReading(raw)` — lenient; drops unknown statuses, clamps `progress` to
  0–100, drops non-numeric progress.
- `serializeReading(map)`.
- `withStatus(map, id, status | null, now?)` — immutable; `null` deletes; sets
  `updatedAt`.
- `withProgress(map, id, progress, now?)` — clamps; creates a `reading` entry when
  missing, otherwise keeps the existing status.

## `src/store/useReadingStore.ts`

Zustand over `localStorage` (`READING_STORAGE_KEY`), with `setStatus` and
`setProgress`; guarded load/persist.

## UI

- `PaperList` — per-row status `<select>` (未标记/待读/在读/已读) and a coloured
  badge (with `%` when progress exists); a "仅看阅读清单" checkbox filters to
  papers with any entry. Both stop click propagation so they do not select the row.
- `ReaderPage` — a header status `<select>` plus progress `%`; on ready it marks
  the paper `reading` unless already `reading`/`done`; an iframe `scroll` listener
  (throttled to 500ms) writes scroll percentage.

## Testing

- `reading.test.ts`: parse leniency/clamping, status set/clear, progress create vs
  preserve, labels.
- `useReadingStore.test.ts`: set/clear/persist + restore on fresh import.
- `PaperList.test.tsx`: status select writes, reading-list filter.
- `ReaderPage.test.tsx`: opening marks the paper as reading.
- `DetailsPanel.test.tsx`: reader link carries `?pid=`.
