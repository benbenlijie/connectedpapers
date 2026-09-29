# Search keyword history

## Goal

Remember recent search queries in the home search bar and offer them as a
dropdown when the input is focused.

## Design

- `lib/searchHistory.ts` (pure): `SEARCH_HISTORY_LIMIT = 20`,
  `parseHistory` (lenient, trimmed, deduped, capped), `serializeHistory`,
  `addToHistory` (trim, move-to-front, cap), `removeFromHistory`,
  `filterHistory` (case-insensitive substring, head when empty).
- `store/useSearchHistoryStore.ts`: zustand over
  `localStorage['connectedpapers.searchHistory.v1']` with `record` / `remove` /
  `clear`; guarded load/persist.
- `SearchBar`: records the query on submit (via `runSearch`), shows a dropdown on
  focus (`filterHistory(entries, searchQuery)`), clicking an item runs that
  search, per-item delete and a 清空 action. Items use `onMouseDown`
  preventDefault so the input keeps focus through the click.

## Testing

- `searchHistory.test.ts`: parse/serialize, add dedupe/cap/blank, remove, filter.
- `useSearchHistoryStore.test.ts`: record/remove/clear/persist + restore.
- `SearchBar.test.tsx`: submit records + dropdown; item click runs the search;
  delete and clear.
