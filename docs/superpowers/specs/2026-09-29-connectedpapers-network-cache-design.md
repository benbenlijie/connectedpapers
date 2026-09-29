# Client-side network cache (data + layout)

## Goal

Reopening a paper should not rebuild (or re-lay-out) its citation network. The
server already caches builds for 24h in `paper_networks`, but the browser had no
persistent copy, so a refresh still issued a request and the force layout ran
again. This adds a browser cache keyed the same way as the server, storing both
the network data and the node coordinates.

## Design

### `src/lib/networkCache.ts`

- `networkCacheKey(paperId, depth, maxNodes)` → `${id}|d{depth}|n{maxNodes}`.
- `CachedNetwork = { savedAt, data: NetworkData, positions? }`;
  `parseNetworkCache` (lenient), `serializeNetworkCache`.
- `putNetworkCache(cache, key, entry, limit=8)` — inserts and prunes to the
  newest `limit` entries by `savedAt`.
- `isFresh(entry, now, ttl=7d)`.
- `collectPositions(nodes)` / `applyPositions(nodes, positions)` — capture and
  restore `x/y/z`; empty coordinates are omitted.
- localStorage glue (`NETWORK_CACHE_STORAGE_KEY =
  'connectedpapers.networkCache.v1'`): `readCachedNetwork` (returns a fresh clone,
  drops stale/corrupt), `writeCachedNetwork`, `readNetworkPositions`,
  `writeNetworkPositions`, `clearNetworkCache`.

### `src/hooks/usePaperNetwork.ts`

- Extracted `resolveNetworkParams(paper, depth?, maxNodes?)` (adaptive when
  unpinned) and `networkCacheKeyForPaper(paper, depth?, maxNodes?)`.
- `useQuery` uses `initialData: () => readCachedNetwork(key)` so a fresh local
  copy renders instantly with no request and no loading flash; `queryFn` writes
  the result back via `writeCachedNetwork`. `staleTime: Infinity`, and the 7-day
  TTL means it refreshes only after expiry.

### `src/components/NetworkGraph.tsx`

- Computes `cacheKey` from the pane's root + graph params.
- Applies cached positions inside the `graphData` memo (before the renderer sees
  the nodes) so restored layouts do not jump.
- On `onEngineStop` (throttled to 1.5s) writes the current node positions back.

## Testing

- `networkCache.test.ts`: key stability, lenient parse, put/prune, freshness,
  position collect/apply, localStorage round-trip and corrupt/expired handling.
- `usePaperNetwork.test.tsx`: serves a fresh cache without calling the API;
  fetches and caches on a miss.
