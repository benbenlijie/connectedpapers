# Contributing to CiteDuo

Thanks for taking the time to contribute. This is a small, self-hosted tool, so the
process is deliberately lightweight: open an issue or a focused pull request, make
sure the checks pass, and we will take it from there.

By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).
For security problems, please **do not** open a public issue — see [SECURITY.md](SECURITY.md).

## What the project is

CiteDuo is a local, single-user academic paper search and citation-network
explorer. A Bun single-process backend (`server/`, `bun:sqlite`, database at `data/app.db`)
serves a React 18 / Vite 6 / TypeScript / TailwindCSS frontend
(`academic-paper-explorer/`). Paper metadata comes from Semantic Scholar and OpenAlex.
See [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md) for the full picture.

## Development environment

### Prerequisites

- **Bun** ≥ 1.3 — backend runtime and root scripts (<https://bun.sh>)
- **pnpm** 9 — frontend dependencies and build
- **Git**
- Optional: [opencode](https://opencode.ai) if you work on the AI reading assistant.
  Without it (or without an OpenAI-compatible provider) the AI routes return `503`;
  the rest of the app is unaffected.

Node.js 22 is what CI uses for the frontend, but the frontend is built through pnpm,
so a current Node LTS is sufficient locally.

### First-time setup

```bash
git clone https://github.com/benbenlijie/citeduo.git
cd citeduo
bash scripts/setup.sh
```

`scripts/setup.sh` checks for Bun and pnpm, creates `data/`, copies
`server/.env.example` to `server/.env` when missing, and installs both dependency
trees (`bun install` at the root for the backend, `pnpm install` inside
`academic-paper-explorer/` for the frontend). It never overwrites an existing
`server/.env`.

### Run it

```bash
bun run build:web                # build the frontend into academic-paper-explorer/dist
bun run server                   # serve app + API on http://127.0.0.1:8787
```

For frontend hot reload, run the backend and the Vite dev server in two terminals
(the dev server proxies `/api` to `127.0.0.1:8787`):

```bash
bun run server                   # terminal A
bun run dev:web                  # terminal B
```

To use a different port: `PORT=9000 bun run server`.

## Checks

Run these before opening a pull request. They are the same commands CI runs
(`.github/workflows/ci.yml`), minus the build.

| What | Command |
| --- | --- |
| Backend tests | `bun run test:server` |
| Backend typecheck | `bun run typecheck:server` |
| Frontend tests | `pnpm --dir academic-paper-explorer test` |
| Frontend typecheck | `pnpm --dir academic-paper-explorer typecheck` |
| Frontend lint | `pnpm --dir academic-paper-explorer lint` |
| Frontend build | `bun run build:web` |

Notes:

- `bun run test:server` runs `bun test server/` with the upstream rate-limit interval
  set to `0` so tests do not sleep.
- Backend tests isolate state with an in-memory SQLite database (`openDb(':memory:')`)
  and stub upstream HTTP. New tests should not make live Semantic Scholar / OpenAlex
  calls or depend on `data/app.db`.
- Frontend tests run under Vitest in `academic-paper-explorer/`.

## Commit messages

The repository uses [Conventional Commits](https://www.conventionalcommits.org/)
with a scope, an English, lowercase, imperative subject, and no trailing period.
Look at the history for the real pattern:

```
feat(reader): read papers that have no arXiv HTML build
fix(deploy): find bun on the remote when it is not on PATH
feat(connect): answer how two papers are related, with the reasoning
```

Format:

```
<type>(<scope>): <subject>

<body: why, not just what>

<footer: e.g. Fixes #123>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `chore`, `build`,
`ci`. Scopes seen in this repo include `frontend`, `server`, `ai`, `reader`,
`connect`, `search`, `graph`, `share`, `library`, and `deploy`; use whatever
component your change actually touches.

Keep the subject short and in the imperative mood ("add", not "added" or "adds").
Use the body to explain **why** the change is needed when it is not obvious. If a
change is a breaking change, note it in the footer.

## Branches and pull requests

- Branch from `main`; never commit directly to `main`. Use a descriptive branch
  such as `feat/reader-pdf-fallback`, `fix/server-rate-limit`, or `docs/contributing`.
- Keep each pull request focused on one change. Split unrelated fixes out.
- Fill in `.github/pull_request_template.md`: what changed, why, and how you verified it.
- CI runs on pull requests to `main` and must be green before merge.
- Update the relevant docs (`README.md`, `ARCHITECTURE.md`, `DEPLOYMENT_GUIDE.md`,
  `CHANGELOG.md` under `[Unreleased]`) when your change affects behaviour or setup.
- Never commit `server/.env`, API keys, tokens, or `data/*.db`.

## Reporting bugs

Use the [bug report form](https://github.com/benbenlijie/citeduo/issues/new/choose).
A good report lets someone reproduce the problem without guessing. Please include:

- **What happened** and **what you expected** instead.
- **Reproduction steps** — the smallest sequence that triggers it. For graph or
  reader bugs, the paper id or search query is very helpful.
- **Environment**: OS, `bun --version`, `pnpm --version`, browser, and the commit
  you are on (`git rev-parse --short HEAD`).
- **Whether it reproduces with an empty database** — stop the server, move
  `data/app.db` aside, restart, and try again. This separates first-run/data bugs
  from cache/crawl bugs. The form asks for this explicitly.
- Relevant server logs or browser console output, with secrets redacted.

**Never paste real API keys or tokens into an issue.** That includes
`ACCESS_TOKEN`, `SEMANTIC_SCHOLAR_API_KEY`, `OPENALEX_API_KEY`, `INTERNAL_TOKEN`,
and any `LLM_PROVIDERS` credentials. Replace them with `sk-...` or `<redacted>`.
If you have already exposed a key, rotate it — see [SECURITY.md](SECURITY.md).

## Feature requests

Use the [feature request form](https://github.com/benbenlijie/citeduo/issues/new/choose)
and describe the problem you are trying to solve and the behaviour you would like,
rather than only the implementation. Note that this is an intentionally local-first,
single-user tool, so features that require a multi-user backend or a hosted service
may not fit the project.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
