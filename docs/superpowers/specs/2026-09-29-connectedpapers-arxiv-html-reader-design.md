# In-app arXiv HTML reader

## Goal

Read a paper inside the app without leaving for an external PDF, using the
arXiv HTML build (ar5iv/LaTeXML) so later features (translation, AI annotation)
can operate on structured text.

## Why HTML, not PDF

- arxiv.org serves HTML with `access-control-allow-origin: *` → the browser can
  `fetch` it directly; no backend proxy or CORS workaround.
- Paragraph-level DOM makes bilingual translation and text-selection AI easy,
  versus PDF text-layer geometry.
- Not every paper has an HTML build; fall back to the abs/PDF links.

## Data plumbing

`normalizeS2Paper` exposes `arxiv_id` from `externalIds.ArXiv`. The `papers`
table already has an `arxiv_id` column and `upsertPaper` already writes it, so no
migration is needed. `Paper`/`PaperDetails.paper` in the frontend gain an optional
`arxiv_id`, and `paperSchema` parses it.

## `src/lib/article.ts` (pure, tested)

- `arxivHtmlUrl(id)`, `arxivAbsUrl(id)`, `arxivPdfUrl(id)`.
- `sanitizeArticleHtml(html)` — parse with `DOMParser`, remove
  `script`/`iframe`/`object`/`embed`/`noscript`, strip `on*` attributes and
  `javascript:` `href`/`src`, and inject `<base href="https://arxiv.org/">` so the
  page's root-relative asset paths resolve.
- `extractOutline(html)` — `{ id, text, level }[]`. Handles both heading ids and
  the LaTeXML shape where the id is on the enclosing `<section>`.

## `src/pages/ReaderPage.tsx`

- Route `/read/:arxivId` (registered in `App.tsx`).
- Fetches the HTML, sanitizes it, extracts the outline, and renders the document
  in `<iframe sandbox="allow-same-origin" srcdoc=...>`. The sandbox omits
  `allow-scripts`, so third-party scripts cannot run, while `allow-same-origin`
  lets the parent reach `contentDocument` for outline jumps (and future
  translation injection).
- Header: back, `arXiv:<id>`, and links to abs/PDF. Left sidebar: outline buttons
  that `scrollIntoView` the target section.
- States: loading, error; on error (no HTML build / network) show a panel with
  "在 arXiv 打开" and "下载/查看 PDF" links.

## Entry point

`DetailsPanel` shows a "在应用内阅读（arXiv HTML）" link to `/read/<arxivId>` when
the selected paper has an `arxiv_id`.

## Testing

- `article.test.ts`: URL builders; sanitizer injects base, drops scripts/iframes/
  handlers/`javascript:`, keeps stylesheet + text; outline for heading-id and
  LaTeXML-section shapes.
- `ReaderPage.test.tsx`: mocked fetch renders the sanitized `srcdoc` and outline;
  a failed fetch shows the abs fallback.
- `DetailsPanel.test.tsx`: the reader link appears with the right href.
- `normalize.test.ts` (server): `arxiv_id` mapped / null.
