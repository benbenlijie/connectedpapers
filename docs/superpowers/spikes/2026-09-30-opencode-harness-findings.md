# Spike findings: opencode as the AI agent harness

Date: 2026-09-30
opencode version: 1.18.33 (Linux)
Scratch evidence: `/tmp/opencode-spike/` (not committed). Secrets redacted.

Validates the four risks from
`docs/superpowers/specs/2026-09-30-connectedpapers-ai-agent-harness-design.md`
and the API-shape assumptions in Tasks 5–8 of the implementation plan.

## 1. Custom OpenAI-compatible provider injection

This project-level `opencode.json` successfully routed a session to the mtcode
endpoint:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "mtcode": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "mtcode",
      "options": { "baseURL": "https://<host>/v1", "apiKey": "<redacted>" },
      "models": { "deepseek-flash": { "name": "deepseek-flash" } }
    }
  }
}
```

- `POST /session/:id/message` with
  `{"model":{"providerID":"mtcode","modelID":"deepseek-flash"},"parts":[...]}`
  produced an assistant message with `providerID: "mtcode"`,
  `modelID: "deepseek-flash"`. **Passing `model` in the message body works.**
- Omitting `model` from the body did **not** honor the project config: the
  session fell back to the user's global default provider
  (`zai-coding-plan/glm-5.3-flash`) and a global agent. **`model` must be passed
  in the body** (or the global default leaks in). Our routes always pass it.

## 2. Permissions and custom tools

- An agent configured with `permission: { read: "deny", bash: "deny", webfetch:
  "deny", ... }` ran normally; built-in tools were not used.
- A custom tool still ran under those deny permissions. `message.part.updated`
  carried `part.type === "tool"` with `part.tool === "echo_echo"`.
- **Tool name is `<filename>_<exportname>`** for named exports (file `echo.ts`,
  `export const echo` → `echo_echo`). To get exactly `paper_search` /
  `paper_section`, each tool must be a **default export in its own file**
  (`paper_search.ts`, `paper_section.ts`).

## 3. SSE event schema (this is the important correction)

`GET /event` is an SSE stream (`data: {json}\n\n`). Observed types and shapes:

Streaming assistant text is a **delta**, not a cumulative snapshot:

```
{"type":"message.part.delta","properties":{
  "sessionID":"ses_...","messageID":"msg_...","partID":"prt_...",
  "field":"text","delta":"The"}}
```

Tool lifecycle comes through `message.part.updated`:

```
{"type":"message.part.updated","properties":{
  "sessionID":"ses_...",
  "part":{"id":"prt_...","messageID":"msg_...","sessionID":"ses_...",
    "type":"tool","tool":"echo_echo","callID":"call_...",
    "state":{"status":"pending","input":{},"raw":""}}}}
```

`state.status` progresses `pending` → `running` → `completed`; `state.input`
holds the (eventually populated) tool arguments.

Completion and status:

```
{"type":"session.idle","properties":{"sessionID":"ses_..."}}
{"type":"session.status","properties":{"sessionID":"ses_...","status":{"type":"busy"}}}
```

Other observed (ignorable for us): `server.connected`, `server.heartbeat`,
`message.updated`, `session.created`, `session.updated`, `session.diff`,
`reasoning`, `plugin.added`, `catalog.updated`.

Consequences for the plan:
- Text must be handled from `message.part.delta` (`properties.delta`,
  `field === "text"`) and **appended**, not replaced with a snapshot.
- Tool activity from `message.part.updated` where `part.type === "tool"`.

## 4. Global-config leakage (new risk, not in the original spec)

`opencode serve` reads the user's global `~/.config/opencode` (plugins, agents,
models). In the spike the global agent `Sisyphus - ultraworker` and the global
model appeared unless overridden. For a deterministic deploy the spawned server
must be isolated: point `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME`,
`XDG_STATE_HOME` (and cwd) at the generated runtime dir so only our config and
tool are visible.

## 5. Spawn cost

- `opencode serve` became healthy (`GET /global/health` → `{"healthy":true}`)
  in **~0.8s** on this machine.
- Resident memory settled around **300–370 MB** for one idle server. Acceptable
  for a single shared instance, but it is not free; keep exactly one.

## Plan impact summary

- Task 5: emit two tool files with default exports (`paper_search.ts`,
  `paper_section.ts`) instead of one `paper.ts` with named exports.
- Task 6: write both tool files; isolate the spawned process from the global
  config via `XDG_*` env pointing into the runtime dir.
- Task 7: normalize `message.part.delta` (append semantics); keep
  `message.part.updated` for tool parts.
- Task 9: the chat reducer appends text deltas instead of replacing the message.
- Task 8 already passes `model` in the prompt body (confirmed required).
