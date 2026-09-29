# AI Q&A in the reader

## Goal

Let the reader select an excerpt and ask the AI to explain, summarize, or answer
a question about it. Reuses the configurable provider layer; only backend
(`kind: "openai"`) providers can answer, since the browser translator is
translation-only.

## Backend

- `server/ai.ts` (pure) — `buildAiMessages(action, input, target)` for
  `explain | summarize | ask`. The system prompt fixes the answer language and the
  task; the user message carries optional paper context plus the excerpt and, for
  `ask`, the question. Missing text/question or an unknown action throws.
- `server/routes/ai.ts` — `POST /api/ai`
  `{ provider?, action, text?, question?, context?, target? }` → validates the
  action, picks the requested openai provider or the first one (else
  `LLM_UNAVAILABLE`), builds messages, calls `chat` at temperature 0.2, returns
  `{ data: { answer, provider } }`. Validation and upstream failures map to
  `VALIDATION_FAILED` / `UPSTREAM_FAILED`.

## Frontend

- `src/lib/ai.ts` — `askViaServer(provider, action, input, target)` posts
  `/api/ai`; `askAi(action, input, target, deps?)` filters `/api/llm/status` to
  openai providers, walks them in order, and throws only if all fail. `deps` is
  injectable for tests.
- `src/pages/ReaderPage.tsx` — a collapsible right-hand "AI 助手" panel, disabled
  unless an openai provider exists. An iframe `mouseup` listener captures the
  current selection into state; the panel shows the selection, "解释"/"总结"
  buttons, a question input with a send button, and the answer (loading + error
  states). Requests may run in parallel with translation.

## Testing

- `server/ai.test.ts`: message construction per action, context inclusion,
  missing-input and unknown-action throws.
- `src/lib/ai.test.ts`: browser providers ignored, first openai used, advance on
  failure, no-provider throw, last-error throw.
- `ReaderPage.test.tsx`: AI button disabled with only a browser provider and
  enabled with an openai provider.
