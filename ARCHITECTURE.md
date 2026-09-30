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
    ├── POST /api/translate server/routes/translate.ts │  │     │
    ├── GET  /api/llm/status server/routes/llm.ts ─────┘  │     │
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
| `relations.ts` | Persist/read cross-paper relations (reference/citation/related/coupling). |
| `embeddings.ts` | SPECTER2 vector cache (SQLite) + cosine kNN semantic edges. |
| `routes/neighbors.ts` | `GET /api/neighbors/:id`: stored relations + paper rows. |
| `graph.ts` | BFS crawl batcher (references + citations + recommendations/OpenAlex related), bibliographic coupling, `pagerank` + `connectedComponents`. |
| `identity.ts` | Canonical work ids (DOI > arXiv > provider id) + duplicate merging. |
| `community.ts` | Louvain community detection (pure). |
| `jobs.ts` | In-process job queue, cache lookup, cache write, boot recovery. |
| `llm.ts` | Configurable LLM providers (`LLM_PROVIDERS`), `chat` against OpenAI-compatible endpoints. |
| `ai.ts` | Pure AI prompt construction (`explain`/`summarize`/`ask`). |
| `translate.ts` | Translation prompt construction + tolerant JSON-array parsing. |
| `translation-cache.ts` | Translation cache keyed by `(target, source)`. |
| `routes/llm.ts` | `GET /api/llm/status`: public provider list (no secrets). |
| `routes/translate.ts` | `POST /api/translate`: cache + batch translate through a provider. |
| `routes/ai.ts` | `POST /api/ai`: explain/summarize/ask over an openai provider. |
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
| `graph/exportGraph.ts` | Pure export payload/filename helpers plus thin PNG/JSON download glue. |
| `pages/HomePage.tsx` | Explorer layout: search, list, graph, details, filters. |
| `pages/ReaderPage.tsx` | `/read/:arxivId` full-screen arXiv HTML reader (fetch, sanitize, outline, sandboxed iframe). |
| `lib/article.ts` | Pure arXiv URL builders, HTML sanitizer and outline extraction. |
| `lib/readerBlocks.ts` | Pure block selection + bilingual translation DOM helpers. |
| `lib/translator.ts` | Client provider orchestration: browser built-in + `/api/translate`, with fallback + cache. |
| `lib/ai.ts` | Client provider orchestration for `/api/ai` (openai providers, fallback). |
| `graph/urlState.ts` | Pure encode/decode of the view state to/from a query string. |
| `graph/ForceGraph3DLazy.tsx` | Lazily-imported three.js renderer wrapper (not in the initial bundle). |
| `components/graph/*` | Toolbar (2D/3D, encoding, search), legend, timeline, tooltip, minimap, node context menu. |
| `store/useUiStore.ts` | Zustand store for UI-only state: selection, filters, graph view, encoding, timeline, explicit network params. |
| `store/useNotesStore.ts` | Zustand store for per-paper notes, persisted to `localStorage`. |
| `store/useReadingStore.ts` | Zustand store for reading status/progress, persisted to `localStorage`. |
| `store/useHighlightsStore.ts` | Zustand store for reader highlights, persisted to `localStorage`. |
| `store/useSearchHistoryStore.ts` | Zustand store for recent search queries, persisted to `localStorage`. |
| `lib/notes.ts` | Pure note map helpers: parse/serialize/add/remove/annotated ids. |
| `lib/reading.ts` | Pure reading-status map helpers (parse/serialize/withStatus/withProgress). |
| `lib/highlights.ts` | Pure highlight anchors + `<mark>` apply/remove over the reader DOM. |
| `lib/searchHistory.ts` | Pure recent-query list helpers (parse/add/remove/filter). |
| `lib/networkCache.ts` | Pure + localStorage cache of built networks and node positions. |
| `lib/graphMerge.ts` | Pure union of two graphs (nodes by id, edges by from|to|type). |

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

`graph.ts:pagerank` runs 20 iterations at damping 0.85 and distributes rank to
out-edges **proportionally to their weight** (`weight` defaults to 1; coupling
edges are treated as symmetric and flow both ways). Mass that would leave the
node set — dangling nodes (`damping * rank`) or edges pointing outside the
rendered set (their damped share) — is accumulated in `lost` and redistributed
uniformly, so the rank vector always sums to 1. Node visual size is derived from
the resulting `pageRankScore`, and `connectedComponents` assigns `clusterId`s for
grouping.

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

### 7. Graph export (PNG / JSON)

`graph/exportGraph.ts` separates the testable parts (`sanitizeFilename`,
`exportFilename`, `buildExportPayload`) from two thin DOM helpers
(`downloadText`, `downloadCanvasPng`). The toolbar's export menu offers PNG of
the current view, JSON of the current (filtered) view, and JSON of the full
fetched network; the JSON payload carries a `meta` block (`scope`, `root_title`,
counts, timestamp). PNG is captured from the single `<canvas>` inside the graph
container, so overlays (toolbar, legend, minimap) are intentionally excluded. The
3D renderer is created with `rendererConfig: { preserveDrawingBuffer: true }`;
without it a WebGL `toDataURL` returns a blank image.

### 8. Local paper notes

`lib/notes.ts` holds the pure note-map operations; `store/useNotesStore.ts` wraps
them over `localStorage['connectedpapers.notes.v1']` (lenient parse, guarded
writes). `DetailsPanel` edits the note for
`selectedNodeId || resolveClientId(selectedPaper)` on every keystroke and shows a
saved hint; `NetworkGraph` derives `annotatedIds` from the store and marks those
nodes in the 2D canvas pass. Notes are deliberately local-only: not in the URL,
not exported, and not marked in 3D.

### 9. Dual-paper comparison

`useUiStore` gains a second root slot (`comparePaper`) and its own node selection
(`compareSelectedNodeId`). `NetworkGraph` is parameterized with
`{ paper?, slot?: 'primary' | 'compare' }`: the pane derives its selection id from
the slot and a slot-aware setter that clears the *other* slot's selection, so the
details panel follows whichever pane was clicked last. Filters, encodings, view
mode and timeline stay shared through the store; only the toolbar/legend/timeline
render on the primary pane (the compare pane keeps its own export menu via a
`placement` prop on `GraphToolbar`). Each pane runs its own
`usePaperNetwork(rootPaper)`, so React Query caches the two networks
independently. `PaperList` toggles B with a per-row button, and the URL adds
`paper2`/`node2`; a history entry is pushed when either root changes.

### 10. Configurable LLM providers and translation

`LLM_PROVIDERS` (a JSON array in `server/.env`, order = priority) lists
OpenAI-compatible endpoints and browser-built-in translators. `llm.ts:chat`
POSTs `{baseUrl}/chat/completions` with a Bearer key when present and an
`AbortController` timeout; `routes/translate.ts` serves
`translations`-table cache hits, batches the rest into one call, and parses a
length-checked JSON array (`translate.ts`). Keys stay server-side. Provider
fallback lives on the client: it walks the `/api/llm/status` order, handles
`kind: "browser"` locally, and posts `/api/translate` with an explicit provider
for `kind: "openai"` entries, advancing on failure. The cache key is
`hash(target|source)` so results are reused across providers.

### 11. In-app arXiv HTML reader

`/read/:arxivId` renders the paper's arXiv HTML (ar5iv/LaTeXML) instead of the
PDF: structured paragraphs make translation and AI annotation tractable, and
arxiv.org serves it with `access-control-allow-origin: *`, so no proxy is needed.
`lib/article.ts` sanitizes third-party HTML (drops `script`/`iframe`/`object`/
`embed`/`noscript`, strips `on*` handlers and `javascript:` URLs, injects
`<base href="https://arxiv.org/">`) and extracts an outline. LaTeXML puts the
anchor id on the enclosing `<section>`, not the heading, so `extractOutline`
handles both. The sanitized document is rendered in an
`<iframe sandbox="allow-same-origin">` (no `allow-scripts`), which blocks script
execution while letting the parent read the DOM for outline jumps today and
translation injection later. `normalizeS2Paper` now exposes `arxiv_id`
(`externalIds.ArXiv`); the details panel links to the reader when present, and
the page falls back to arXiv abs/PDF links when no HTML build exists.

### 12. Immersive paragraph translation

`lib/readerBlocks.ts` collects text-bearing blocks from the reader's
`contentDocument` (skipping nested, numeric-only, already-CJK, and already-
translated nodes) and inserts a `data-cn-translation` block after each source
block (inside table cells). `lib/translator.ts` orchestrates providers: it serves
an in-memory `target\ntext` cache, then walks `/api/llm/status` order — `browser`
entries use the built-in `Translator` API locally, `openai` entries post
`/api/translate` — advancing on failure and throwing only when all fail. The
reader runs translations in batches of 15 with a cancel flag, shows
`done/total` progress, re-runs on target change, and disables the toggle when no
provider is configured. A one-time click listener toggles individual
translations.

### 13. AI Q&A in the reader

`server/ai.ts` builds prompts for `explain` / `summarize` / `ask` (answer
language fixed by `target`, optional paper context, excerpt and question), and
`routes/ai.ts` runs them through an openai provider via `chat`. The reader's
collapsible "AI 助手" panel captures the iframe selection on `mouseup` and calls
`lib/ai.ts:askAi`, which walks the openai providers from `/api/llm/status`
(client-side fallback, same pattern as translation) and returns
`{ answer, provider }`. The panel is disabled unless an openai provider exists,
since the browser translator cannot answer questions.

### 14. Reading queue and progress

`lib/reading.ts` is a pure status map (`to_read`/`reading`/`done` + a clamped
progress percent); `store/useReadingStore.ts` persists it to
`localStorage['connectedpapers.reading.v1']`, consistent with notes. Entries are
keyed by paper id; the reader only knows the arXiv id, so the details-panel link
carries `?pid=<paperId>` and the reader keys on `pid ?? arxivId`. `PaperList`
shows a per-row status select + badge and a "仅看阅读清单" filter; `ReaderPage`
marks the paper `reading` on open (unless already `reading`/`done`) and writes a
throttled scroll percentage from an iframe `scroll` listener.

### 15. Reader highlights

A highlight anchors to `{ blockIndex, start, end }` (block order from
`collectBlocks`, character offsets within the block). `lib/highlights.ts` maps a
`Range` to/from an anchor, wraps each selected text segment in
`<mark data-hl-id>` (splitting text nodes, so ranges spanning inline elements
work), and unwraps on delete/clear. Because the marks preserve the block's text,
the stored offsets stay valid across reloads. `store/useHighlightsStore.ts`
persists `localStorage['connectedpapers.highlights.v1']` per reader key;
`ReaderPage` re-applies stored highlights on iframe load and shows a floating bar
for creating (colour + optional note) or editing (recolour/delete) them.

### 16. Search keyword history

`lib/searchHistory.ts` keeps a deduped, capped (20) recent-query list;
`store/useSearchHistoryStore.ts` persists it to
`localStorage['connectedpapers.searchHistory.v1']` with `record`/`remove`/`clear`.
`SearchBar` records on submit and shows a filtered dropdown on focus, where
clicking an item re-runs the search. Dropdown items use `onMouseDown`
preventDefault so the input keeps focus through the click.

### 17. Graph node context menu

Right-clicking a node opens `NodeContextMenu` (fixed-positioned, closes on
outside click / Escape / scroll) with actions on that paper: **以此为根重建网络**
(re-root the pane — primary via `selectRootPaper`, compare via `setComparePaper`;
the primary double-click rebuild reuses `graphAdapter.nodeToPaper`), **按标题搜索**
(`submitQuery` with the node title as a keyword query), **加入对比** (primary
only), and **打开原文** (when the node has a `url`). `NetworkGraph` wires
`onNodeRightClick`/`onBackgroundRightClick` in the shared props and suppresses the
browser menu via `onContextMenu` preventDefault, so it works in 2D and 3D.

### 18. Client-side network cache

Server builds are cached in `paper_networks` (24h), but the browser had no
persistent copy, so a refresh re-requested and re-ran the force layout.
`lib/networkCache.ts` adds a `localStorage` cache keyed like the server
(`${paperId}|d{depth}|n{maxNodes}`) holding the network data plus node `x/y/z`
positions, pruned to 8 entries by `savedAt` with a 7-day freshness TTL.
`usePaperNetwork` seeds React Query's `initialData` from it (fresh copy renders
instantly, no request, no loading flash) and writes results back; `NetworkGraph`
applies cached positions before rendering and saves positions on `onEngineStop`.
The server cache still backs the first build; this layer removes the repeat.

### 19. Multi-source related edges and canonical dedupe

Beyond citation BFS, `buildNetwork` adds: `related` edges from Semantic Scholar
recommendations (root, batched via `getPapersBatch`) and from OpenAlex
`related_works` (best-effort, resolved by DOI), plus `coupling` edges from
bibliographic coupling computed locally over the crawled reference sets
(`bibliographicCoupling`, kept when the shared-reference count reaches
`config.related.couplingMin`). Edge types are now
`reference | citation | related | coupling`, coloured via `EDGE_COLORS` and shown
in the legend. `identity.ts` gives each work a canonical key (DOI > arXiv >
provider id, DOI lowercased, arXiv version-stripped) and `mergeDuplicates`
collapses nodes that resolve to the same work (first id wins), repointing edges,
dropping self-loops and deduping edges by `from|to|type`. Node ids stay S2
paperIds so the `papers`/`citations` schema and routes are unchanged. Both caches
are invalidated by bumping `graphVersion` (server) / `NETWORK_GRAPH_VERSION`
(client).

### 20. Global relation persistence

`paper_relations(from_id, to_id, type, weight, source, updated_at)` (PK
`from,to,type`) stores every edge a build produces — reference/citation/related/
coupling — with a `source` tag (`s2` / `related` / `local`). `buildNetwork`
writes the merged edge list via `relations.ts:persistRelations` (best-effort), so
edges survive across sessions and future graphs can reuse them.
`GET /api/neighbors/:id` returns the stored relations touching an id plus the
`papers` rows for the involved ids; this is the read side that lazy expansion
(sub-project 4) consumes instead of re-crawling.

### 21. Lazy node expansion

Instead of crawling everything up front, right-clicking a node offers
**展开该节点**: `NetworkGraph` calls `api.networkWithPolling(nodeId, 1, 50)` and
merges the result into a local `extra` graph via `lib/graphMerge.ts`
(`mergeNetworkData` unions nodes by id and edges by `from|to|type`, keeping the
max weight). `extra` resets when the root/params change; filtering and encoding
run over `mergeNetworkData(networkData, extra)`, so expanded neighbours appear
immediately and the server-side cache persists the relations for next time. A
`展开中…` label reflects the in-flight request.

### 22. Relevance-prioritized expansion

The BFS no longer expands candidates in insertion order. As each level is
scanned, candidates are scored (`graph.ts:scoreCandidate`: `3 × linkCount` +
`log10(citations+1)` + a year-proximity bonus to the root) and the root's S2
recommendation ids form a priority tier. `rankCandidates` sorts priority ids
first, then by score, and only the top `s2BatchSize` are fetched, so the node
budget fills with the most relevant neighbours available at selection time. The
recommendation ids are fetched once per build (`safeRecommendationIds`) and
reused by `addRelatedNodes`. `graphVersion` / `NETWORK_GRAPH_VERSION` were bumped
to 4 to invalidate caches built with the old ordering.

### 23. Semantic neighbours (SPECTER2) + arXiv OpenAlex fallback

`paper_embeddings(id, model, vector, updated_at)` caches S2 SPECTER2 vectors
(`s2.ts:getEmbeddingsBatch`, single attempt — the endpoint is heavily
rate-limited). `buildNetwork` calls `addSemanticEdges` after merging: it reads
cached vectors for the node set, fetches a small batch of the missing ones
(best-effort, failures ignored), then `embeddings.ts:semanticNeighborEdges`
computes each node's top-k cosine neighbours above `embeddingMinSim` and adds
`semantic` edges (weight = similarity). The cache grows across builds, so
semantic coverage improves over time without hammering the API. Separately,
OpenAlex relatedness now falls back to a title search
(`getRelatedWorksForPaper`) because arXiv DOIs (`10.48550/arxiv.*`) 404 in
OpenAlex. Edge types are `reference | citation | related | coupling | semantic`
(coloured in `EDGE_COLORS`); `graphVersion`/`NETWORK_GRAPH_VERSION` bumped to 5.

### 24. Community detection (Louvain)

`community.ts:louvain` runs Louvain modularity local-moving (single level, good
for ≤300 nodes) over the weighted, undirected edge set and returns normalized
community ids. `buildNetwork` uses it for `clusterId` (replacing the plain
connected-component id, whose function remains exported), so cluster colouring
now reflects real communities. When the graph is coloured by cluster,
`NetworkGraph` fades edges that cross communities so they read as inter-cluster
links. `graphVersion`/`NETWORK_GRAPH_VERSION` bumped to 6.

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
  library's own simulation. The 3D bundle (~349 kB gzip) is code-split and only
  fetched on first 3D switch; the initial bundle carries the 2D renderer.
  `vite.config.ts` splits vendor chunks (`vendor-react`, `vendor-query`,
  `vendor-router`, `vendor-ui`, `force-graph`, `three`) and
  `React.lazy`-loads `ReaderPage`, so the initial `index` chunk is ~127 kB
  (was ~513 kB). `chunkSizeWarningLimit` is raised to 1400 because the one large
  chunk is the intentionally lazy `three`.
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
