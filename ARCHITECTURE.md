# Architecture

## Purpose & constraints

A local, single-user tool for exploring academic citation networks. Given a paper
(DOI, arXiv id, OpenAlex work id, or Semantic Scholar id), it fetches metadata,
crawls references/citations breadth-first, and renders an interactive graph.

Hard constraints that shape every decision below:

- **Single user, local only.** No authentication, no multi-tenancy, no user table.
- **Bound to loopback.** `server/main.ts` serves on `127.0.0.1:8787` by default
  (`server/env.ts`: `HOST` / `PORT`, default `127.0.0.1` / `8787`).
- **One process, one SQLite file.** `server/db.ts` opens `data/app.db` via
  `bun:sqlite`, sets `journal_mode=WAL` and `foreign_keys=ON`, applies
  `server/schema.sql` on boot.
- **Upstream is best-effort.** Semantic Scholar and OpenAlex are rate-limited;
  failures degrade (retry, partial results) rather than aborting the app.

## Architecture diagram

```
 Browser (React SPA)
   │  fetch /api/*
   ▼
 Bun.serve  ── server/main.ts ────────────────────────────────┐
   │  routes                                                  │
   ├── POST /api/search   server/routes/search.ts             │
   ├── POST /api/details  server/routes/details.ts            │
   ├── POST /api/network  server/routes/network.ts ──┐        │
   ├── GET  /api/jobs/:id server/routes/jobs.ts ─────┼──┐     │
   └── GET  *             static academic-paper-explorer/dist │
                           (SPA fallback to index.html)       │
                                                              │
   kernel: ids · retry · s2 · openalex · resolve · normalize   │
           papers · graph · jobs · db-queries · config · errors│
                           │                                  │
                           ▼                                  │
                    SQLite  data/app.db  ◄───────────────────┘
              (papers, authors, paper_authors, citations,
               paper_networks, jobs, search_queries)

 Frontend state split:
   React Query  → server state (search results, details, network)
   Zustand      → UI state only (selection, highlight, filters)
```

`server/main.ts` is the only transport layer: it parses the URL, dispatches the
four `/api/*` routes, falls back to static files for everything else (rejecting
`..` paths), and funnels thrown `ApiError`s through `handleError`.

## Directory responsibilities

### Server (`server/`)

| Path | Responsibility |
| --- | --- |
| `main.ts` | `Bun.serve` bootstrap, routing table, static hosting, SPA fallback. |
| `routes/search.ts` | Keyword search fan-out (S2 + OpenAlex in parallel), single-paper lookup, dedupe/sort, search logging. |
| `routes/details.ts` | Paper metadata + recommendations + citation contexts; upserts the paper. |
| `routes/network.ts` | Validates and clamps `depth` (1–3) / `max_nodes` (1–300), delegates to the job queue. |
| `routes/jobs.ts` | Returns job status and, when done, the cached result. |
| `ids.ts` | `resolvePaperId`: classifies raw input (doi/arxiv/openalex/s2) into an S2 path. |
| `resolve.ts` | `toS2Input`: converts an OpenAlex-only id into a DOI/arXiv path S2 understands. |
| `retry.ts` | `withRetry` with exponential backoff; retries 429/403/5xx/timeout/TypeError. |
| `s2.ts` | Semantic Scholar client: `getPaper`, `getPapersBatch`, `getRecommendations`, `getCitationContexts`. |
| `openalex.ts` | OpenAlex client: search, DOI lookup, `getWorkByOpenAlexId`, abstract reconstruction. |
| `normalize.ts` | Shared S2 paper shape so search and details responses agree. |
| `papers.ts` | `upsertPaper`, `upsertCitation`, `ensurePaperStub` (FK ordering). |
| `graph.ts` | BFS crawl batcher + `pagerank` + `connectedComponents`. |
| `jobs.ts` | In-process job queue, cache lookup, cache write, boot recovery. |
| `db-queries.ts` | `queryHash`, `getCachedNetwork`, `cacheNetwork`, `logSearch`. |
| `db.ts` | SQLite handle + schema application. |
| `config.ts` | Typed config (crawl limits, cache TTL/version, upstream bases, server). |
| `errors.ts` | `ApiError`, `json`, `handleError`, `readJson`. |

### Frontend (`academic-paper-explorer/src/`)

| Path | Responsibility |
| --- | --- |
| `services/api.ts` | Fetch wrapper, zod parsing, `networkWithPolling`. |
| `services/schemas.ts` | Zod schemas for search/network/job/details responses. |
| `hooks/useSearchPapers.ts` | React Query wrapper for `POST /api/search`. |
| `hooks/usePaperDetails.ts` | React Query wrapper for `POST /api/details`. |
| `hooks/usePaperNetwork.ts` | React Query wrapper for the network job; picks adaptive depth/maxNodes. |
| `hooks/useUrlSync.ts` | Two-way sync between the UI store and the address bar (deep links). |
| `graph/encoding.ts` | Pure color/size encoding by dimension (cluster/year/field, citations/pagerank). |
| `graph/graphFilters.ts` | Pure timeline/year/citations/field/venue filtering + dangling-edge removal. |
| `graph/graphAdapter.ts` | Pure adapter to the force-graph `{nodes, links}` shape. |
| `graph/urlState.ts` | Pure encode/decode of the view state to/from a query string. |
| `graph/ForceGraph3DLazy.tsx` | Lazily-imported three.js renderer wrapper (not in the initial bundle). |
| `components/graph/*` | Toolbar (2D/3D, encoding, search), legend, timeline, tooltip, minimap. |
| `store/useUiStore.ts` | Zustand store for UI-only state: selection, filters, graph view, encoding, timeline, explicit network params. |

## Key design decisions

### 1. Async job + polling for network builds

Building a citation network can take tens of seconds (BFS across batches with
delays, capped by `config.crawl.maxExecutionMs`, default 45s). A blocking HTTP
request would be fragile, so `POST /api/network` returns either a cached graph
(`{ data, cached: true, status: 'done' }`) or `202 { job_id, status: 'pending' }`.
The client (`services/api.ts:networkWithPolling`) then polls `GET /api/jobs/:id`
every 1.5s up to a 180s deadline. Jobs live in the `jobs` table; `runJob` in
`jobs.ts` advances `pending → running → done|failed` and writes progress. On boot,
`recoverJobs()` resets interrupted `running` jobs to `pending` and resumes them,
so a crash mid-crawl does not strand work.

### 2. Cache key `queryHash(s2Path, depth, maxNodes, graphVersion)`

`db-queries.ts:queryHash` hashes `${rootId}_${depth}_${maxNodes}_v${graphVersion}`
with SHA-256 (first 32 hex chars). The hash is computed once at enqueue time from
the **resolved S2 path** (via `resolvePaperId`), stored in the job payload as
`query_hash`, and reused verbatim by `runJob` when writing the cache
(`jobs.ts:66` comment: "reuse the hash computed at enqueue; do not recompute from
`root.paperId`"). This guarantees the read key and write key are identical even if
the upstream canonical id changes shape. `graphVersion` (bump in `config.ts`)
invalidates every cached network when the graph algorithm changes. Cached rows in
`paper_networks` carry `expires_at` honored by `getCachedNetwork`.

### 3. Foreign-key ordering via `ensurePaperStub`

`citations.citing_paper_id` / `cited_paper_id` and `paper_authors.paper_id`
reference `papers(id)`. During a crawl, an edge may point at a paper not yet
fetched. `papers.ts:ensurePaperStub` inserts a minimal `(id, title=id)` row before
`upsertCitation`, so FK enforcement never fails; the full row is filled in later by
`upsertPaper` when the batch fetch returns.

### 4. PageRank dangling-mass conservation

`graph.ts:pagerank` runs 20 iterations at damping 0.85. When a node has no outgoing
links it is "dangling"; its rank is accumulated and redistributed uniformly as
`(damping * dangling) / n`, so the rank vector always sums to 1. The same handling
applies to edges pointing at nodes outside the rendered set. Node visual size is
derived from the resulting `pageRankScore`, and `connectedComponents` assigns
`clusterId`s for grouping.

### 5. OpenAlex → DOI resolution

OpenAlex-only ids (`W\d+`) are not valid Semantic Scholar lookup keys.
`resolve.ts:toS2Input` detects `kind === 'openalex'`, calls
`openalex.ts:getWorkByOpenAlexId`, and rewrites to `DOI:<doi>` (or `ARXIV:<id>`),
raising `PAPER_FETCH_FAILED` if the work has no DOI/arXiv id. All other id kinds
pass through `resolvePaperId(...).s2Path` unchanged.

### 6. Deep-link URL state

`graph/urlState.ts` is a pure codec: `serializeUrlState` writes the view state to
a query string with defaults omitted, and `parseUrlState` reads it back leniently
(clamping `depth` to 1–3 and `maxNodes` to 1–300, ignoring invalid values).
`hooks/useUrlSync.ts` runs two effects: URL → store on mount and on popstate, and
store → URL via a `useUiStore.subscribe` listener. A `lastWritten` ref holds the
last query string the hook wrote, so the read effect skips re-hydrating its own
navigation (breaking the feedback loop), and a `hydrated` ref prevents the first
default-state write from clobbering an incoming link. Root-paper changes push a
history entry while filter/encoding changes replace, so the browser back button
steps between papers but not between slider frames.

The URL carries the resolved root id plus the explicit `depth`/`maxNodes`, so the
same link rebuilds the same cached network regardless of `usePaperNetwork`'s
adaptive defaults. On load the hook installs a minimal `paperStubFromId(id)` so
`DetailsPanel`'s existing `usePaperDetails` call fills in the full record.
`selectRootPaper` (used by list clicks and double-click rebuild) clears the
explicit network params so a freshly chosen paper gets adaptive defaults again.

## Data model

Schema in `server/schema.sql`; all tables `if not exists`, timestamps default to
`datetime('now')`.

- **`papers`** — primary entity. Primary key is `id` (set to the S2 paperId for
  S2-sourced rows); `doi`, `semantic_scholar_id`, `openalex_id` are unique.
  Stores metadata, denormalized
  `authors_text`, `fields_of_study` (JSON), `raw` S2 payload, and `fetched_at`.
  Indexed by doi / s2 / openalex / publication_year.
- **`authors`** — author identity (integer PK), optional `semantic_scholar_id`,
  h-index / counts, affiliations (JSON).
- **`paper_authors`** — join table (paper_id, author_id) with `author_position`;
  composite PK, cascade on delete.
- **`citations`** — directed edge (`citing_paper_id` → `cited_paper_id`),
  composite PK, `is_influential`, `contexts`, cascade on delete; indexed both ways.
- **`paper_networks`** — materialized graph cache keyed by `query_hash`, storing
  the serialized `network_data` plus `depth`, `max_nodes`, `graph_version`,
  node/edge counts, `generated_at`, `expires_at`.
- **`jobs`** — async work queue: `id` (uuid), `kind`, `payload` (JSON, includes
  `query_hash`), `status`, `attempts`, `progress` (JSON), `result_hash`, `error`.
- **`search_queries`** — append-only search log: query text/type, result count,
  execution time.

## Known limitations & future work

- **No global citation graph persistence.** Citations are only stored for edges
  encountered while crawling a specific root; there is no repository-wide graph to
  query offline. A future version could persist all fetched edges and run global
  analytics.
- **Rendering is WebGL/canvas, not SVG.** The graph is drawn by `react-force-graph`
  (`ForceGraph2D` canvas for the default view, `ForceGraph3D` three.js loaded lazily
  for the 3D toggle), which stays interactive well past the configured caps
  (`maxNodes` default 200, route cap 300). The previous hand-written Canvas 2D
  renderer and custom WebWorker d3-force layout were removed in favor of the
  library's own simulation. The 3D bundle (~348 kB gzip) is code-split and only
  fetched on first 3D switch; the initial bundle carries the 2D renderer.
- **No authentication.** Acceptable while loopback-only; if the server is ever
  exposed beyond `127.0.0.1`, add auth and request limits.
- **Single-process job queue.** Jobs are in-process and persisted only as rows; a
  `running` job is resumed at boot but there is no concurrency control or worker
  pool.
- **Upstream rate limits.** Semantic Scholar throttling can truncate a crawl
  (partial graph) or fail a job; retries and batch delays mitigate but do not
  eliminate this.
- **Cache invalidation is coarse.** `graphVersion` invalidates all networks at
  once; per-parameter TTL tuning is not exposed to the client.
