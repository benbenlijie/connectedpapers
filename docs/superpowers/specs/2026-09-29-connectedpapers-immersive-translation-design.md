# Immersive translation in the arXiv HTML reader

## Goal

Read an arXiv paper with paragraph-level bilingual output: each source block gets
a translated block directly beneath it, toggled globally and collapsible per
block. Translation uses the configurable provider layer and degrades across
providers.

## Interaction

- Header gets a "翻译" toggle and a target-language select (中文 / English /
  日本語, default 中文).
- Enabling: collect translatable blocks from the iframe document, translate them
  in batches, and insert a translated block after each source block, showing
  progress (`done/total`). Disabling removes every translation.
- Clicking an inserted translation collapses/expands it.
- Changing the target while translated re-runs the translation.
- If `/api/llm/status` reports no providers, the toggle is disabled with a hint.

## `src/lib/readerBlocks.ts` (pure, Document-level)

- `BLOCK_SELECTOR = 'p, li, blockquote, figcaption, h2, h3, h4, td'`.
- `collectBlocks(doc)` — text-bearing blocks; skips blocks already holding a
  translation, blocks with <2 chars or no Latin/Cyrillic letter (skips numbers
  and already-CJK text), and blocks nested inside an already-selected one.
- `markBlock(el, id)` (sets `data-cn-src`), `insertTranslation(doc, block, id,
  text)` (sets `data-cn-translation` + `data-cn-for`; inserts after the block, or
  inside `<td>`/`<th>`), `removeTranslations(doc)`, `setTranslationsVisible`,
  `ensureTranslationStyle(doc)` (idempotent `.cn-translation` style, `data-cn-style`).

## `src/lib/translator.ts`

- `fetchProviders()` — `GET /api/llm/status`.
- `hasBrowserTranslator(scope=globalThis)` / `browserTranslate(texts, target)` —
  the browser built-in `Translator` API (cached translator per target).
- `translateViaServer(texts, target, provider)` — `POST /api/translate`.
- `translate(texts, target, deps?)` — serve cached segments (`cacheKey =
  target\ntext`), then walk providers in order: `browser` uses the built-in
  translator (skipped if unavailable), `openai` posts to the server; the first
  success wins, the last error is thrown only if all fail. `deps` is injectable
  for tests. `chunk(items, size)` batches.
- `clearTranslationCache()` for tests.

## `src/pages/ReaderPage.tsx`

Loads providers on mount, owns the translate/target/progress/error state, and on
toggle collects blocks from `iframe.contentDocument`, marks them, and runs
batched translations with a cancel flag (cleared on unmount). A one-time
`contentDocument` click listener toggles a translation's display.

## Testing

- `readerBlocks.test.ts`: block selection (nested/number/translation skips),
  mark/insert (incl. table cell), remove + visibility, style idempotency.
- `translator.test.ts`: browser-first, server fallback, provider advance, all-fail
  throw, no-provider throw, cache reuse/mixed, `chunk`, `hasBrowserTranslator`.
- `ReaderPage.test.tsx`: fetch routing (article vs `/api/llm/status`), toggle
  disabled with no providers / enabled with one.
