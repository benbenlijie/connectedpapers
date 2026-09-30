# AI assistant as an opencode agent with on-demand paper retrieval

## Goal

Replace the single-shot AI Q&A (excerpt + question → one LLM call) with a
multi-turn agent that can fetch the paper's full text **on demand** before
answering, so answers are grounded in the actual content instead of the model's
memory. The agent runs inside a locally-managed `opencode serve` instance and
retrieves content through custom tools backed by this server.

## Decisions

- **Lifecycle:** the Bun server spawns and manages `opencode serve` (same host,
  starts/stops with the app); the frontend only talks to our `/api/ai/*`, never
  to opencode directly.
- **Retrieval tools:** two custom tools, `paper_search` (find relevant
  paragraphs) and `paper_section` (read a whole section) — retrieve-then-read is
  the harness pattern; no whole-paper dump.
- **Interaction:** multi-turn chat panel per paper (replaces the single answer
  box).
- **Model:** reuse the first `openai` entry of `LLM_PROVIDERS` (mtcode /
  deepseek-flash), injected into opencode's config at spawn time.
- **Session state:** one persistent opencode session per paper; SQLite stores the
  `arxivId → sessionID` mapping; opencode persists the messages.
- **Streaming:** stream assistant tokens and surface tool activity ("正在检索
  …/读取第 3 节") via an SSE proxy over opencode's event stream.
- **Tool data source:** tools call back into this server's retrieval API, which
  fetches/normalizes/caches paper content — single source of truth.

## Architecture

### opencode manager (`server/opencode.ts`)

- On boot, spawn `opencode serve --hostname 127.0.0.1 --port <random>` with cwd
  `data/opencode-runtime/` (gitignored). Generate into that dir:
  - `opencode.json` — provider block for the first openai `LLM_PROVIDERS` entry
    (`@ai-sdk/openai-compatible`, baseURL/apiKey/model) and one agent
    `paper-tutor` (model, system prompt, `steps`, permissions).
  - `.opencode/tools/paper.ts` — the `paper_search` / `paper_section` tools.
- Health check `GET /global/health`; restart with backoff on exit; kill on
  SIGINT/SIGTERM. Expose `isHealthy()`.
- Config is regenerated when `LLM_PROVIDERS` changes (or on boot only).

### Paper content service (`server/paper-content.ts`)

- Fetch `https://arxiv.org/html/{id}`, extract title/sections/paragraphs with
  Bun's built-in `HTMLRewriter` (no new dependency).
- Persist to SQLite: `paper_content(arxiv_id, title, fetched_at)` and
  `paper_sections(arxiv_id, idx, heading, text)`, with a TTL re-fetch.
- Fall back to the existing abstract (`server/arxiv.ts`) when the HTML is
  unavailable.

### Retrieval API (`server/routes/paper.ts`)

- `GET /api/paper/:id/search?q=` → ranked paragraphs
  `{ sectionIdx, heading, text, score }`.
- `GET /api/paper/:id/section/:idx` → full section text.
- Guarded by a per-boot `X-Internal-Token` (also injected into the spawned
  opencode tool env); localhost only.

### AI API (`server/routes/ai.ts`, rewritten)

- `POST /api/ai/session { arxivId }` → ensure mapping, create opencode session
  if missing, return `{ sessionId }`.
- `POST /api/ai/chat { sessionId, message, excerpt? }` → forward to
  `POST /session/:id/prompt_async` with agent `paper-tutor`, model, and message
  parts.
- `GET /api/ai/stream?sessionId=` → subscribe to opencode `/event`, filter to the
  session, normalize to `{ type: 'delta'|'tool'|'done'|'error', ... }` and relay
  as SSE.
- History: `GET /api/ai/history?sessionId=` proxies `GET /session/:id/message`.
- Stop: `POST /api/ai/abort { sessionId }` proxies `POST /session/:id/abort`.

### Frontend (`academic-paper-explorer`)

- `src/lib/aiAgent.ts` — client for `/api/ai/*` plus an SSE reader; pure
  event-normalization helpers are unit-testable.
- `src/pages/ReaderPage.tsx` — the "AI 助手" panel becomes a chat: message list,
  input, streaming assistant bubble, tool-activity chips, error/retry, stop
  button. Bootstraps a session per paper; reloads history on mount. Target
  language selector retained and passed to the prompt.

## Data flow

1. Open reader → `POST /api/ai/session` → `sessionId` (created/reused).
2. Send message → `POST /api/ai/chat`.
3. Server → `prompt_async(agent=paper-tutor, parts=[user text + optional excerpt])`.
4. Agent calls `paper_search`/`paper_section` → tool calls our retrieval API
   with the internal token → gets grounded text → continues.
5. Model answers → opencode emits events → `/api/ai/stream` normalizes and
   forwards → panel renders deltas + tool chips → `done` finalizes.
6. Reload → `GET /api/ai/history` → re-render transcript.

## Security

- opencode runs in an isolated dir; `paper-tutor` sets `permission` to `deny` for
  `read`, `edit`, `glob`, `grep`, `list`, `bash`, `task`, `webfetch`, `websearch`,
  `lsp`, `skill`, `external_directory`. Only the custom tools remain.
- Provider key lives only in the runtime config (dir 0700, files 0600, gitignored)
  — never persisted in our DB nor sent to the client.
- Retrieval API requires `X-Internal-Token` and localhost binding.
- No shell/file tools ⇒ no RCE surface beyond the retrieval tool.
- `steps` caps agent iterations to bound cost.
- System prompt declares the paper text **untrusted data**; any instructions
  inside it must be ignored (prompt-injection defense).

## Error handling

- opencode unhealthy / spawn failed → `/api/ai/*` returns `503 AI_UNAVAILABLE`;
  UI shows a clear message; translation is unaffected.
- No arXiv HTML → degrade to abstract + metadata; tool returns a notice; the
  answer states the limitation.
- Stream drop → panel reconnects and/or reloads history; SSE closes cleanly.
- Unknown/finished session → recreate transparently.
- Long runs → activity UI + user-triggered abort.

## Testing

- Server unit: HTML→sections extraction (fixtures), content cache + TTL,
  search ranking, retrieval API auth, session mapping, SSE normalization as a
  pure function (opencode event → client event), manager spawn/health with a
  mocked process/fetch.
- Frontend unit: chat store reducer (append delta, tool activity, error, done),
  SSE reader with a mocked stream, panel bootstrap.
- Integration (optional, skipped when opencode absent): one prompt through a stub
  provider.
- Existing `server/ai.test.ts` / `src/lib/ai.test.ts` are replaced by the new
  modules' tests.

## Migration and dependencies

- Remove the old flow (`/api/ai`, `server/ai.ts:buildAiMessages`, `askAi`).
- Update `README.md`, `ARCHITECTURE.md`, `DEPLOYMENT_GUIDE.md`: new runtime
  dependency on the `opencode` binary, generated runtime dir, and env vars.
- New env: `OPENCODE_ENABLED`, `OPENCODE_BIN`, `OPENCODE_PORT`,
  `AI_MAX_STEPS`, `PAPER_CONTENT_TTL_HOURS`.
- No new npm dependency (raw `fetch` for the opencode HTTP API; Bun
  `HTMLRewriter` for parsing).

## Risks to validate before implementation (spike)

1. Exact `opencode.json` shape to inject a custom OpenAI-compatible provider
   (baseURL + apiKey + model).
2. Whether custom tools can be constrained via `permission` wildcards; if not,
   rely on the isolated dir + exposing only our tools.
3. SSE event names/shape for text deltas and tool parts (subscribe and inspect).
4. opencode idle memory / spawn latency and single-shared-instance concurrency.
