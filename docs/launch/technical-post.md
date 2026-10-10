# How CiteDuo decides that two papers are related

Repo: https://github.com/benbenlijie/citeduo · Demo: https://watchdeep.net/paper-demo/

I built CiteDuo around a recurring moment: two papers open, a suspicion that they are related, and no good way to ask what the connection is. Citation-graph tools answer a different question — what is around this one paper. With both papers already in hand, a line between two nodes is not an answer. It could be a direct citation, a shared ancestor, a co-citation, a recommender's hunch, or two abstracts whose embeddings sit near each other. Those are different claims and should not be drawn the same way.

`POST /api/connect` takes two paper ids and returns ranked paths, one sentence per hop, and a set of signals. Here is what the code does and where I am still unsure.

## Edges are not interchangeable

`server/pathfind.ts` starts by naming the problem: the relation store mixes kinds with different semantics. `reference` and `citation` are directed citation facts from Semantic Scholar. `coupling` is symmetric shared references. `related` is recommender affinity (S2 recommendations, OpenAlex related works). `semantic` is SPECTER2 k-nearest-neighbour similarity. Treating all five as one unweighted edge produces confident nonsense, so the code encodes a per-type base in `edgeConfidence`: `reference` 1.0, `citation` 0.95, `coupling` 0.8, `related` 0.6, `semantic` 0.45.

The reference/citation split is about provenance, not meaning: both are citing→cited. In `connect.ts:absorb`, a paper's own reference list produces `reference` edges and its citing list produces `citation` edges. A reference-list entry is a direct assertion by the citing paper, so it gets 1.0; a row discovered from the other endpoint's list gets 0.95. That 0.05 is an opinion, not a measurement.

The other types are built in `graph.ts` and `embeddings.ts`. `bibliographicCoupling` computes coupling locally and stores the shared-reference count as the weight, keeping pairs at `config.related.couplingMin` (2) or above. `addRelatedNodes` adds `related` edges with weight roughly the list position (`recommendLimit` and `openalexLimit`, both 10). `semanticNeighborEdges` builds kNN edges at `k = embeddingK` (5) and `minSim = embeddingMinSim` (0.8), using the cosine as weight.

Traversal is direction-agnostic, because being cited still connects you to a paper's lineage, and the header comment notes these graphs get laid out undirected anyway. That is Connected Papers, the one other tool I will name, since the README draws the same comparison. What the code will not lose is direction: a `PathStep` carries the stored `from`/`to`, the node the walk arrives at, and a `forward` flag.

## Ranking: a path is only as strong as its shakiest hop

The five constants are the base, not the score. `hopConfidence(type, weight)` folds each edge's own weight into its type confidence. `semantic` scales by its cosine, floored at 0.2. `coupling` grows like `0.75 + log10(weight + 1) / 2`, capped at 1, so a pair sharing 40 references outranks a pair at the minimum of 2. `related` follows a gentler version of that curve.

`pathScore` combines the per-hop confidences as `((average + weakest) / 2) * 100 / (hops + 1)`. Average alone would let one disreputable hop hide behind several good ones; the weakest-link term is there because a chain is only as trustworthy as its flimsiest step, and the denominator makes an equal-quality shorter path win.

`rankedPaths` collects up to `maxPaths` (3) distinct routes by banning the middle interior node of the path it just found and searching again, up to `limit * 3` attempts. Banning an interior node surfaces structurally different answers rather than trivially shifted ones, which is how a coupling bridge and a citation chain appear in the same reply. The search itself, `bidirectionalPath`, is level-synchronous bidirectional BFS expanding the shallower side first, with `maxSideDepth = ceil(maxHops / 2)` and a `maxVisited` guard of 20,000 nodes.

## From path to paragraph

A ranked path is still a node sequence. `explainHop` turns each hop into a sentence with a switch over the five types — "X 引用了 Y", "X 与 Y 存在共同引用（文献耦合）", "X 与 Y 语义相似（SPECTER2 ≈ 0.87）". `describePath` produces the one-line summary, and both key off `classifyPath`, which assigns one of six kinds: `same_paper`, `direct`, `citation_path`, `coupling`, `co_citation`, `semantic_bridge`.

Classification is shape-based, not tag-based. Two citation-ish hops that arrive at the same node are coupling; two that leave the same node are co-citation. A single stored coupling row is never dressed up as "A cites B", and an all-semantic route is always a bridge. The panel maps each kind to a badge — 直接引用, 文献耦合, 共被引, 语义相似 — so the claim is visible before the prose.

One correction to my own README: it says single-hop answers are labelled by their edge type. True for `reference`, `citation`, and `coupling`, but a lone `related` or `semantic` hop is classified `semantic_bridge`, because a similarity guess should not be presented as a citation. I would fix the README sentence, not the function.

Alternatives are collapsed under "其他 N 条路径", each with its badge and summary. If the best path is a coupling bridge, the runner-up a semantic bridge, and the third a citation chain, you can see the connection is real but the route is not unique — or that everything rests on one kind of evidence. When no path exists, the signals below become the answer rather than a consolation prize.

## Four tiers, cheapest first

`connect.ts` is written as a cost model.

Tier 1 is one batched Semantic Scholar call for both endpoints. The requested field list already embeds each paper's reference and citation lists, enough to spot a direct citation, a coupling, or a co-citation immediately. It is best-effort: on failure it sets `upstreamUnavailable` and falls back to SQLite.

Tier 2 is `loadLocalEdges`, which reads every row in `paper_relations` plus the `citations` table as weight-1 `reference` edges. It costs no network, and for papers you have explored before it is often already the answer.

Tier 3 is the live snowball, only if the first two tiers found nothing. The loop is `while (batches < maxExpansions && Date.now() - started < maxExecutionMs)`; `pickFrontier` picks the next unseen batch, `absorb` takes up to `refLimit` (40) references and `citeLimit` (25) citations per expanded paper, and the search re-runs after each level. It breaks on the first path found, or on a failed batch, keeping what it collected.

Tier 4 is embeddings. `loadVectors` reads cached SPECTER2 vectors and fetches only what is missing, in one best-effort batch. `findSemanticBridge` then scans up to 200 known ids for the middle work maximising `min(sim(A, Z), sim(Z, B))` above `semanticMinSim` (0.75); if no bridge clears that bar but the endpoints' own cosine does, it emits a single semantic hop. The asymmetric bridge is a hedge: a work similar to one endpoint and unrelated to the other is not evidence.

The knobs, all in `server/config.ts`: `CONNECT_MAX_EXPANSIONS` (6), `CONNECT_MAX_MS` (25000), `CONNECT_BATCH_SIZE` (30), `CONNECT_FRONTIER_LIMIT` (60), `CONNECT_REF_LIMIT` (40), `CONNECT_CITE_LIMIT` (25), `CONNECT_MAX_HOPS` (6), `CONNECT_MAX_PATHS` (3), `CONNECT_SEMANTIC_MIN_SIM` (0.75), and `CONNECT_LOCAL_ONLY`. A request's `max_hops` is clamped to 1–8 in `routes/connect.ts`. Tier 1 costs one request; tier 3 can cost six batches and 25 seconds. The default is to spend nothing until the cheap answers are exhausted.

One subtlety I like: `search()` first builds adjacency with coupling edges filtered out, and only re-searches including them if that finds nothing. A stored coupling row is a denormalised summary; traversing it would let a one-hop shortcut hide the shared works the user asked to see.

## The signals around the path

Alongside any path, `findConnection` returns `sharedReferences` and `sharedCiters` (intersections of the endpoints' own lists, capped at 10 each), `semanticSimilarity` (three decimals), `sharedFields`, and `sharedAuthors` (capped at 8). They are cheap, computed from the same tier-1 payload, and only as complete as that one response.

## Local-first is a constraint, not a slogan

The whole thing is one Bun process and one SQLite file (`data/app.db`, WAL, foreign keys on). No account, no cloud. `persistLearned` runs at the end of every connection search — paper stubs, `upsertCitation` for reference edges, `persistRelations` for the full edge list, all best-effort — so a graph built today makes tomorrow's search richer. `stats.source` is `'local'` or `'live'`; the panel says 来自本地缓存 or 含联网扩展, and a failed tier-1 fetch still returns a result behind an amber 上游不可用 banner. `CONNECT_LOCAL_ONLY=1`, or `live: false`, answers instantly from SQLite. Offline is not a mode bolted on; it is the first two tiers.

## What I am not sure about

Upstream rate limits shape the design more than I would like. The S2 limiter spaces calls 1000 ms apart anonymously and 100 ms with a key, and the shared pool answers a large share of requests with 429, so a batch retries three times from a 300 ms base instead of sleeping 8.4 s on an interactive request. A snowball can still hit `CONNECT_MAX_MS` mid-way and return a partial graph; `stats.truncated` flags that. A failed batch breaks the loop rather than failing the request, so with nothing cached a rate limit now surfaces as a 503 that tells you to retry, not as a fake "paper not found".

The answer is only as good as the upstream metadata, and this is the limit I think about most. Every path runs through reference and citation lists truncated to 40 and 25 per expansion, and coupling only counts at 2 or more shared references. If the real connective tissue is a paper whose reference list is empty upstream, no amount of local search recovers it. CiteDuo reasons over a partial public record and should say so louder.

The first version of the tiebreak did not fire, and it took a stopwatch to notice. `orderReferences` puts shared works first and then sorts by `citationCount`; `pickFrontier` sorts by citation count too — but the `FIELDS` string in `server/s2.ts` did not ask for citation counts on the nested references, so both comparators read `undefined` and "most cited first" was inert. The same request hid two more costs: it embedded each paper's full citation list (up to 1000 rows and ~200 KB per paper) for the 25 entries a caller keeps, and the learned edges were persisted as ~4500 individual commits. On a warm local database the whole query took 10-15 seconds. Asking for the citing side separately and capped, writing the learned edges in one transaction, and shortening the retry backoff brought the same query to about a second. The lesson I am keeping: a comparator fed `undefined` fails silently, and only a measurement makes it visible.

The explanation layer is Chinese-only: `explainHop` returns hardcoded Chinese strings and so do the panel labels. There is no i18n layer behind the relation prose. `forward` is computed, serialised, and schema-validated, but the panel renders `hop.text` only.

Single-process has edges. Network builds use a jobs table with `recoverJobs()` on boot, but no worker pool or concurrency control. `/api/connect` is not a job at all: the route comment calls it the longest-waiting endpoint, and the client spins instead of polling. I am not confident that survives a genuinely slow upstream. Cache invalidation is coarse: bumping `graphVersion` invalidates every cached network at once, TTLs are 24 hours for networks and 168 for papers, and relation rows have no TTL, so a local-only answer can be confidently stale. The demo runs a snapshot database with tighter rate limits and no LLM, so its answers reflect that snapshot, not the live upstream.

I ran the backend suite to have one number I could trust: `bun run test:server` reports 214 passing tests and 479 `expect()` calls. I am not quoting a frontend count, because I could not reproduce the README's number in my environment.

## What would change my mind

If Semantic Scholar or OpenAlex shipped a calibrated pairwise relatedness score that held up, most of this becomes a presentation problem. I have not seen one I would trust over the coupling signal.

If a proper study showed embedding bridges are as informative as bibliographic coupling, I would move `semantic` above `related`, and maybe closer to `coupling`. My 0.45 is a prior, not a calibration; labelled pairs with human agreement scores would move it, and I would rather be told I am wrong than keep a number I cannot defend.

If querying a global graph were cheap — a precomputed CSR of the citation corpus plus cached vectors — I would replace the budgeted snowball with a real index and delete the truncation logic. The four-tier structure exists because I do not have that index, not because it is elegant.

For now, `pathfind.ts` is a pure function over `Map<string, Traversal[]>` with no database or network in it, and `connect.ts` is the only place that knows about cost. That separation is the part I would defend hardest, because the ranking rules can be argued about, and tested, without a rate limit in the room.
