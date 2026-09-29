# Configurable LLM provider layer + translation API

## Goal

Give the app a translation (and, later, AI) capability backed by a configurable,
fallback-capable set of LLM providers. The default priority targets
`mtcode/deepseek-flash`; a deployment without it can list other candidates and the
app degrades gracefully. Provider keys never reach the browser.

## Configuration

`LLM_PROVIDERS` in `server/.env`: a JSON array, **array order = priority**.

```env
LLM_PROVIDERS=[
  {"name":"mtcode","kind":"openai","baseUrl":"https://.../v1","apiKey":"sk-...","model":"mtcode/deepseek-flash"},
  {"name":"browser","kind":"browser"},
  {"name":"ollama","kind":"openai","baseUrl":"http://127.0.0.1:11434/v1","model":"qwen2.5"}
]
```

- `kind: "openai"` — any OpenAI-compatible Chat Completions endpoint (mtcode,
  DeepSeek, OpenAI, Ollama). Requires `baseUrl` + `model`; `apiKey` optional.
- `kind: "browser"` — the browser's built-in Translator API, executed on the
  client; no key, no server call. Included in the same priority list.
- Invalid entries (missing name/kind/baseUrl/model) are dropped; names are
  de-duplicated (first wins).

Unset/empty `LLM_PROVIDERS` means "no server provider": `GET /api/llm/status`
returns an empty list and translation requests fail with `LLM_UNAVAILABLE`.

## Server modules

- `llm.ts` — `parseProviders(raw)` (pure), `loadProviders()`,
  `toPublicProvider()` (strips secrets), and `chat(provider, messages, opts)`
  which POSTs `{baseUrl}/chat/completions` with `Authorization: Bearer <key>`
  when a key is present, an `AbortController` timeout, and structured
  `ApiError`s (`LLM_UNAVAILABLE`, `UPSTREAM_FAILED`).
- `translate.ts` — `buildTranslateMessages(target, texts, source?)` (system
  prompt asks for a JSON string array of equal length/order), and
  `parseTranslationArray(content, expected)` (tolerates code fences, rejects
  length/type mismatches).
- `translation-cache.ts` — `translationHash(target, source)` (SHA-256, first 32
  hex), `getCachedTranslations(hashes, db?)`, `cacheTranslations(rows, db?)`.
  The key is per `(target, source)` so the same text is reused across providers;
  the db argument defaults to the singleton, which makes it testable in memory.

Schema adds `translations(hash pk, target_lang, source_text, translated_text,
provider, created_at)`.

## Routes

- `GET /api/llm/status` → `{ data: { providers: [{name, kind, model?}] } }`.
- `POST /api/translate` `{ provider?, texts[], target?, source? }` →
  `{ data: { translations[], provider, cached } }`:
  1. validate `texts` (non-empty, ≤200 segments / ≤20000 chars),
  2. pick the requested openai provider or the first one (else
     `LLM_UNAVAILABLE`),
  3. serve cache hits, batch the misses into one `chat` call,
  4. `parseTranslationArray`, write cache, return.

Fallback across providers is driven by the **client**: it walks the
`/api/llm/status` order, uses the browser translator for `browser` entries, and
calls `/api/translate` with an explicit `provider` for `openai` entries,
continuing on failure.

## Testing

- `llm.test.ts`: provider parsing (valid/invalid/dedupe/non-array), public shape,
  `chat` request URL/headers/body, missing-key omission, non-ok rejection.
- `translate.test.ts`: message construction, array parsing (plain/fenced),
  length and type rejection.
- `translation-cache.test.ts`: hash stability/sensitivity, cache round-trip and
  upsert against an in-memory db.
