# Multi-source related edges + canonical dedupe

## Goal

Broaden "related works" beyond direct citations and stop showing the same paper
twice under different ids.

## Parts

1. **Canonical identity + dedupe** — collapse nodes that are the same work
   (same DOI/arXiv) into one, repointing edges. Priority `DOI → arXiv → S2
   paperId`; DOI lowercased and prefix-stripped, arXiv with version stripped.
2. **Related edges** — add non-citation edges:
   - `related` from Semantic Scholar `/recommendations/v1` (root first; extend to
     high-PageRank nodes later),
   - `related` from OpenAlex `related_works` (best-effort, resolved via DOI),
   - `coupling` from locally computed bibliographic coupling (two nodes sharing
     references; weight = shared count, kept when `>= couplingMin`).
3. **Edge typing/weights** — `GraphEdge.type ∈ reference | citation | related |
   coupling`; weights meaningful (coupling = shared refs, related = rank decay).
4. **Frontend** — colour/label links by type and update the legend.

## Canonical dedupe design

`server/identity.ts` (pure):

- `normalizeDoi`, `normalizeArxiv`, `canonicalKey({ doi, arxivId, paperId })`,
  `canonicalKeyFromS2(s2paper)`.
- `mergeDuplicates(nodes, edges, canonicalOf)` — keep the first node per canonical
  key, build `alias` id→kept id, repoint edges, drop self-loops, dedupe edges by
  `from|to|type` (max weight).

`buildNetwork` keeps node ids as S2 paperIds (so the `papers`/`citations` schema
and details/network routes are unchanged) but merges duplicates after the crawl
and before PageRank, so the rendered graph has no duplicate works.

## Related-edge design

- S2 recommendations: fetch for the root (`getRecommendations`), map each
  recommended paper to a node (batched `getPapersBatch`), add `root → rec` edges
  type `related` with weight decaying by rank. Budget-capped by config.
- OpenAlex related: resolve the root's DOI → OpenAlex work → `related_works`
  (W ids) → batch fetch those works' DOIs/titles → add nodes+edges; failures are
  swallowed (best-effort).
- Bibliographic coupling: within the fetched set, group by reference id and emit
  `coupling` edges between papers sharing `>= couplingMin` references.

Config: `config.related = { recommendLimit, relatedNodeBudget, couplingMin,
openalexLimit }`.

## Frontend

`NetworkGraph.linkColor` and `GraphLegend` map each edge type to a colour
(reference=blue, citation=green, related=amber, coupling=purple).

## Testing

- `identity.test.ts`: DOI/arXiv normalization, key priority, `mergeDuplicates`
  (merge, repoint, self-loop drop, edge dedupe).
- `graph.test.ts`: build integration adds related/coupling edges and merges
  duplicates (with mocked S2/OpenAlex clients).
- `coupling` pure unit test.
- Frontend: `graphAdapter`/legend colour mapping test.
