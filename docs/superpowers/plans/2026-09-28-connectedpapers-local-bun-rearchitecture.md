# ConnectedPapers 本地 Bun 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删掉 Supabase，改成"本机一个 Bun 进程 + 一个 SQLite 文件"的本地应用——后端自持 key、自建索引、落库建图；前端同源 `fetch('/api/*')`。

**Architecture:** Bun 单进程承载 HTTP API（`Bun.serve`）与持久化（`bun:sqlite`），并复用现有 Deno 函数里的爬取/建图逻辑；无外部服务、无 CORS、无云依赖。前端 Vite 开发态用 proxy 指向本地 API，正式态由同一 Bun 进程托管 `dist/`。长时建图改为"进程内 job + 轮询"，不再阻塞请求。

**Tech Stack:** Bun 1.3（`Bun.serve`、`bun:sqlite`、`bun test`、`Bun.env`）、TypeScript、React 18 + Vite 6、TanStack Query 5、Zustand 5、zod、d3-force（WebWorker）、vitest。

**运行环境（已探测）:** Bun 1.3.6 ✅、Node 22 ✅、pnpm 9.15 ✅、Ubuntu 22.04 x86_64。无 Deno / Postgres / sqlite3 CLI —— 均不需要。

---

## 范围说明（Scope Check）

本计划覆盖 6 个子系统。`Phase 0–4` 为可直接执行的详细任务；`Phase 5–6` 给出精确文件、代码与验收，执行前各自可拆为独立计划。

| Phase | 子系统 | 产出 |
|---|---|---|
| 0 | 测试/安全网 | vitest + `bun test`，重构有回归 |
| 1 | 服务骨架 + 数据层 | `Bun.serve` + `bun:sqlite` + schema.sql |
| 2 | 搬迁共享内核 | `server/{ids,retry,s2,openalex,arxiv,config,db}` |
| 3 | API 路由 + 进程内 job | `/api/search` `/api/details` `/api/network` `/api/jobs/:id` |
| 4 | 前端改 fetch | services + proxy，删 Supabase 依赖 |
| 5 | 渲染 | 节点 Map + d3-force worker |
| 6 | 收尾 | 启动脚本、只监听本机、清理 `supabase/`、文档 |

---

## 目标架构

```
┌───────────────── Browser ─────────────────┐
│ Vite SPA                                  │
│  services/api.ts → fetch('/api/*')        │
│  React Query (server state) + Zustand(UI) │
│  NetworkGraph + layout.worker             │
└──────────────────┬────────────────────────┘
                   │ 同源 (无 CORS / 无 key 暴露)
┌──────────────────▼──────── 本机 Bun 进程 ────────────────┐
│ server/main.ts  Bun.serve (127.0.0.1:8787)                │
│  ├ /api/search   /api/details                             │
│  ├ /api/network  → 读缓存 | 建 job → 202 {job_id}          │
│  ├ /api/jobs/:id → 轮询                                    │
│  └ /*            → 托管 dist/ (本地正式态)                 │
│ server/jobs.ts   进程内 fire-and-forget + 启动恢复          │
│ server/graph.ts  BFS(batch) + pagerank + components        │
│ server/s2.ts     Semantic Scholar (batch)                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
            data/app.db  (bun:sqlite 单文件)
            papers authors paper_authors citations
            paper_networks(缓存) jobs(队列) search_queries
```

### 目标目录结构

```
server/
  main.ts        # Bun.serve 路由 + 静态托管 + 启动恢复
  env.ts config.ts
  db.ts schema.sql
  errors.ts
  ids.ts retry.ts
  s2.ts openalex.ts arxiv.ts
  graph.ts jobs.ts
  ids.test.ts retry.test.ts graph.test.ts
data/
  app.db         # 运行时生成, gitignore
academic-paper-explorer/
  src/config/env.ts
  src/services/api.ts services/schemas.ts
  src/hooks/useSearchPapers.ts usePaperDetails.ts usePaperNetwork.ts
  src/graph/computeLayout.ts graph/layout.worker.ts
  src/store/useUiStore.ts
```

---

## Phase 0 — 测试安全网（可执行）

### Task 0.1: 分支与忽略

**Files:**
- Modify: `.gitignore`

- [ ] Step 1: 切分支

```bash
git switch -c refactor/local-bun
```
Expected: 当前分支为 `refactor/local-bun`。

- [ ] Step 2: 追加忽略项

Modify `.gitignore` 末尾追加：

```
# 本地后端运行时数据
data/
*.db
*.db-journal
server/.env
supabase/.temp/
```

- [ ] Step 3: Commit

```bash
git add .gitignore docs/
git commit -m "chore: local-bun refactor branch and ignores"
```

### Task 0.2: `bun test` 基础设施

**Files:**
- Create: `server/smoke.test.ts`
- Create: `package.json` (根，已有则改)

- [ ] Step 1: 写失败测试

Create `server/smoke.test.ts`:

```ts
import { test, expect } from 'bun:test'

test('smoke', () => {
  expect(1 + 1).toBe(2)
})
```

- [ ] Step 2: 运行

Run: `bun test server/`
Expected: 1 pass。

- [ ] Step 3: 根 package.json 加脚本

Modify `package.json`（根）为：

```json
{
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "server": "bun run server/main.ts",
    "test:server": "bun test server/",
    "dev:web": "pnpm --dir academic-paper-explorer dev",
    "build:web": "pnpm --dir academic-paper-explorer build"
  }
}
```

- [ ] Step 4: Commit

```bash
git add package.json server/smoke.test.ts
git commit -m "test: add bun test scaffolding for local server"
```

### Task 0.3: 前端 vitest

**Files:**
- Modify: `academic-paper-explorer/package.json`
- Create: `academic-paper-explorer/vitest.config.ts`
- Create: `academic-paper-explorer/src/test/setup.ts`
- Test: `academic-paper-explorer/src/lib/utils.test.ts`

- [ ] Step 1: 安装

```bash
cd academic-paper-explorer
pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] Step 2: 写失败测试

Create `academic-paper-explorer/src/lib/utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('joins truthy classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })
})
```

- [ ] Step 3: 配置

Create `academic-paper-explorer/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] },
})
```

Create `academic-paper-explorer/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] Step 4: 脚本

Modify `academic-paper-explorer/package.json` scripts：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  }
}
```

- [ ] Step 5: 运行

Run: `pnpm test`
Expected: 1 passed。

- [ ] Step 6: Commit

```bash
git add academic-paper-explorer/package.json academic-paper-explorer/pnpm-lock.yaml academic-paper-explorer/vitest.config.ts academic-paper-explorer/src/test academic-paper-explorer/src/lib/utils.test.ts
git commit -m "test: add vitest for frontend"
```

---

## Phase 1 — Bun 服务骨架 + SQLite（可执行）

### Task 1.1: SQLite schema

**Files:**
- Create: `server/schema.sql`
- Create: `server/db.ts`
- Test: `server/db.test.ts`

- [ ] Step 1: 写 schema（SQLite 方言：无 `timestamptz/array/jsonb`，用 TEXT/JSON 字符串）

Create `server/schema.sql`:

```sql
create table if not exists papers (
  id                  text primary key,
  doi                 text unique,
  arxiv_id            text,
  semantic_scholar_id text unique,
  openalex_id         text unique,
  title               text not null,
  abstract            text,
  publication_year    integer,
  publication_date    text,
  citation_count      integer not null default 0,
  reference_count     integer not null default 0,
  authors_text        text not null default '',
  venue               text,
  journal             text,
  url                 text,
  pdf_url             text,
  fields_of_study     text not null default '[]',
  is_open_access      integer not null default 0,
  source              text,
  raw                 text,
  fetched_at          text not null default (datetime('now')),
  created_at          text not null default (datetime('now')),
  updated_at          text not null default (datetime('now'))
);
create index if not exists papers_doi_idx   on papers(doi);
create index if not exists papers_s2_idx    on papers(semantic_scholar_id);
create index if not exists papers_oalex_idx on papers(openalex_id);
create index if not exists papers_year_idx  on papers(publication_year);

create table if not exists authors (
  id                  integer primary key autoincrement,
  name                text not null,
  semantic_scholar_id text unique,
  h_index             integer not null default 0,
  paper_count         integer not null default 0,
  citation_count      integer not null default 0,
  affiliations        text not null default '[]',
  homepage            text,
  created_at          text not null default (datetime('now')),
  updated_at          text not null default (datetime('now'))
);

create table if not exists paper_authors (
  paper_id        text not null references papers(id) on delete cascade,
  author_id       integer not null references authors(id) on delete cascade,
  author_position integer not null default 0,
  primary key (paper_id, author_id)
);
create index if not exists paper_authors_author_idx on paper_authors(author_id);

create table if not exists citations (
  citing_paper_id text not null references papers(id) on delete cascade,
  cited_paper_id  text not null references papers(id) on delete cascade,
  is_influential  integer not null default 0,
  contexts        text not null default '[]',
  created_at      text not null default (datetime('now')),
  primary key (citing_paper_id, cited_paper_id)
);
create index if not exists citations_cited_idx  on citations(cited_paper_id);
create index if not exists citations_citing_idx on citations(citing_paper_id);

create table if not exists paper_networks (
  query_hash    text primary key,
  root_paper_id text not null,
  depth         integer not null default 1,
  max_nodes     integer not null default 100,
  graph_version integer not null default 1,
  network_data  text not null,
  node_count    integer not null default 0,
  edge_count    integer not null default 0,
  generated_at  text not null default (datetime('now')),
  expires_at    text not null
);
create index if not exists paper_networks_expires_idx on paper_networks(expires_at);
create index if not exists paper_networks_root_idx    on paper_networks(root_paper_id);

create table if not exists jobs (
  id          text primary key,
  kind        text not null,
  payload     text not null,
  status      text not null default 'pending',
  attempts    integer not null default 0,
  progress    text not null default '{}',
  result_hash text,
  error       text,
  created_at  text not null default (datetime('now')),
  updated_at  text not null default (datetime('now'))
);
create index if not exists jobs_status_idx on jobs(status, created_at);

create table if not exists search_queries (
  id                integer primary key autoincrement,
  query_text        text,
  query_type        text,
  results_count     integer not null default 0,
  execution_time_ms integer not null default 0,
  created_at        text not null default (datetime('now'))
);
```

- [ ] Step 2: 写失败测试

Create `server/db.test.ts`:

```ts
import { test, expect, beforeEach } from 'bun:test'
import { openDb } from './db'

let db: ReturnType<typeof openDb>
beforeEach(() => { db = openDb(':memory:') })

test('schema creates papers table', () => {
  const row = db.query("select name from sqlite_master where type='table' and name='papers'").get()
  expect(row).not.toBeNull()
})

test('papers insert/select roundtrip', () => {
  db.run("insert into papers (id,title,citation_count) values (?,?,?)", ['p1', 'T', 5])
  const got = db.query('select title, citation_count from papers where id=?').get('p1') as any
  expect(got.title).toBe('T')
  expect(got.citation_count).toBe(5)
})
```

- [ ] Step 3: 运行失败

Run: `bun test server/db.test.ts`
Expected: FAIL（`openDb` 不存在）。

- [ ] Step 4: 实现 db.ts

Create `server/db.ts`:

```ts
import { Database } from 'bun:sqlite'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SCHEMA = readFileSync(join(import.meta.dir, 'schema.sql'), 'utf8')

export function openDb(path = process.env.DB_PATH ?? join(import.meta.dir, '../data/app.db')): Database {
  if (path !== ':memory:') {
    mkdirSync(join(import.meta.dir, '../data'), { recursive: true })
  }
  const db = new Database(path)
  db.exec('pragma journal_mode = WAL;')
  db.exec('pragma foreign_keys = ON;')
  db.exec(SCHEMA)
  return db
}

export const db = openDb()
```

- [ ] Step 5: 运行通过

Run: `bun test server/db.test.ts`
Expected: PASS。

- [ ] Step 6: Commit

```bash
git add server/schema.sql server/db.ts server/db.test.ts
git commit -m "feat(server): sqlite schema and db bootstrap"
```

### Task 1.2: config + errors

**Files:**
- Create: `server/env.ts`
- Create: `server/config.ts`
- Create: `server/errors.ts`
- Test: `server/errors.test.ts`

- [ ] Step 1: 写失败测试

Create `server/errors.test.ts`:

```ts
import { test, expect } from 'bun:test'
import { ApiError, json, handleError } from './errors'

test('json envelope', async () => {
  const r = json({ error: { code: 'X', message: 'y' } }, 400)
  expect(r.status).toBe(400)
  expect((await r.json()).error.code).toBe('X')
})

test('handleError maps ApiError', async () => {
  const r = handleError(new ApiError('MISSING_PAPER_ID', '论文ID不能为空'))
  expect(r.status).toBe(400)
  expect((await r.json()).error.code).toBe('MISSING_PAPER_ID')
})

test('handleError maps unknown to 500', async () => {
  const r = handleError(new Error('boom'))
  expect(r.status).toBe(500)
  expect((await r.json()).error.code).toBe('INTERNAL_SERVER_ERROR')
})
```

- [ ] Step 2: 运行失败

Run: `bun test server/errors.test.ts`
Expected: FAIL。

- [ ] Step 3: 实现 errors.ts

Create `server/errors.ts`:

```ts
export type ErrorCode =
  | 'INVALID_JSON' | 'MISSING_PAPER_ID' | 'PAPER_NOT_FOUND' | 'PAPER_FETCH_FAILED'
  | 'NETWORK_BUILD_FAILED' | 'INTERNAL_SERVER_ERROR' | 'RATE_LIMITED'
  | 'UPSTREAM_FAILED' | 'VALIDATION_FAILED' | 'JOB_NOT_FOUND'

export class ApiError extends Error {
  constructor(public code: ErrorCode, message: string, public status = 400) {
    super(message)
    this.name = 'ApiError'
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function handleError(err: unknown): Response {
  if (err instanceof ApiError) return json({ error: { code: err.code, message: err.message } }, err.status)
  const message = err instanceof Error ? err.message : String(err)
  console.error('[api]', err)
  return json({ error: { code: 'INTERNAL_SERVER_ERROR', message } }, 500)
}

export async function readJson<T = any>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new ApiError('INVALID_JSON', '请求体格式错误，必须是有效的 JSON')
  }
}
```

- [ ] Step 4: 实现 env.ts + config.ts

Create `server/env.ts`:

```ts
function opt(name: string): string | undefined {
  const v = Bun.env[name]
  return v && v.trim() ? v.trim() : undefined
}

export const env = {
  semanticScholarApiKey: opt('SEMANTIC_SCHOLAR_API_KEY'),
  contactEmail: opt('CONTACT_EMAIL') ?? 'researcher@example.com',
  port: Number(opt('PORT') ?? 8787),
  hostname: opt('HOST') ?? '127.0.0.1',
}
```

Create `server/config.ts`:

```ts
import { env } from './env'

const num = (v: string | undefined, d: number) => (v ? Number(v) : d)

export const config = {
  crawl: {
    maxExecutionMs: num(Bun.env.CRAWL_MAX_MS, 45000),
    s2BatchSize: num(Bun.env.S2_BATCH_SIZE, 100),
    perBatchDelayMs: num(Bun.env.S2_BATCH_DELAY_MS, 1000),
    maxNodes: num(Bun.env.CRAWL_MAX_NODES, 200),
    defaultDepth: num(Bun.env.CRAWL_DEPTH, 2),
    refLimit: [12, 8, 5, 3] as const,
    citeLimit: [10, 5, 2, 0] as const,
  },
  cache: {
    networkTtlHours: num(Bun.env.NETWORK_TTL_HOURS, 24),
    paperTtlHours: num(Bun.env.PAPER_TTL_HOURS, 168),
    graphVersion: 1,
  },
  s2: {
    base: 'https://api.semanticscholar.org/graph/v1',
    apiKey: env.semanticScholarApiKey,
    contactEmail: env.contactEmail,
  },
  openalex: { base: 'https://api.openalex.org' },
  arxiv: { base: 'http://export.arxiv.org/api' },
  server: { port: env.port, hostname: env.hostname },
} as const
```

- [ ] Step 5: 环境变量样例

Create `server/.env.example`:

```
SEMANTIC_SCHOLAR_API_KEY=
CONTACT_EMAIL=you@example.com
PORT=8787
```

- [ ] Step 6: 运行通过

Run: `bun test server/errors.test.ts`
Expected: PASS。

- [ ] Step 7: Commit

```bash
git add server/env.ts server/config.ts server/errors.ts server/errors.test.ts server/.env.example
git commit -m "feat(server): local config, env and error envelope"
```

### Task 1.3: 路由骨架 + 静态托管

**Files:**
- Create: `server/main.ts`

- [ ] Step 1: 实现入口（路由表先留占位，Phase 3 填充）

Create `server/main.ts`:

```ts
import { config } from './config'
import { json, handleError, ApiError } from './errors'
import { recoverJobs } from './jobs'
import { searchRoute } from './routes/search'
import { detailsRoute } from './routes/details'
import { networkRoute } from './routes/network'
import { jobRoute } from './routes/jobs'

const WEB_DIST = new URL('../academic-paper-explorer/dist', import.meta.url).pathname

async function serveStatic(pathname: string): Promise<Response> {
  const safe = pathname === '/' ? '/index.html' : pathname
  if (safe.includes('..')) return json({ error: { code: 'VALIDATION_FAILED', message: 'bad path' } }, 400)
  let file = Bun.file(WEB_DIST + safe)
  if (!(await file.exists())) file = Bun.file(WEB_DIST + '/index.html') // SPA fallback
  if (!(await file.exists())) return json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'frontend not built (run pnpm build:web)' } }, 404)
  return new Response(file)
}

recoverJobs()

const server = Bun.serve({
  port: config.server.port,
  hostname: config.server.hostname,
  async fetch(req) {
    const url = new URL(req.url)
    const p = url.pathname
    try {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
      if (p === '/api/search' && req.method === 'POST') return await searchRoute(req)
      if (p === '/api/details' && req.method === 'POST') return await detailsRoute(req)
      if (p === '/api/network' && req.method === 'POST') return await networkRoute(req)
      if (p.startsWith('/api/jobs/') && req.method === 'GET') return await jobRoute(req, p.split('/').pop()!)
      if (p.startsWith('/api/')) throw new ApiError('VALIDATION_FAILED', `未知接口: ${p}`, 404)
      return await serveStatic(p)
    } catch (e) {
      return handleError(e)
    }
  },
})

console.log(`ConnectedPapers local server → http://${server.hostname}:${server.port}`)
```

- [ ] Step 2: 先建空路由（Phase 3 填实现），保证可编译

Create `server/routes/search.ts`, `server/routes/details.ts`, `server/routes/network.ts`, `server/routes/jobs.ts` 各含：

```ts
import { json, ApiError } from '../errors'

export function searchRoute(_req: Request): Response {
  throw new ApiError('INTERNAL_SERVER_ERROR', 'not implemented yet', 501)
}
```

（其余三个同理，替换函数名/文件名。）

Create `server/jobs.ts` 暂含：

```ts
export function recoverJobs(): void {
  // Phase 3 实现
}
```

- [ ] Step 3: 启动验证

Run: `bun run server/main.ts`
Expected: 打印 `ConnectedPapers local server → http://127.0.0.1:8787`。`curl -s -XPOST localhost:8787/api/search` 返回 501 JSON。Ctrl-C 退出。

- [ ] Step 4: Commit

```bash
git add server/main.ts server/routes server/jobs.ts
git commit -m "feat(server): bun.serve skeleton with routes and static hosting"
```

---

## Phase 2 — 搬迁共享内核（可执行）

**目的:** 把现有 `supabase/functions/_shared/`（或重写前的两函数）里的 ID 解析、重试、S2/OpenAlex/arXiv 访问抽到 `server/`，去掉 Deno 依赖，改为 `fetch` + `Bun.env`。

### Task 2.1: ids

**Files:**
- Create: `server/ids.ts`
- Test: `server/ids.test.ts`

- [ ] Step 1: 写失败测试（覆盖 DOI / arXiv / arXiv-DOI / OpenAlex / S2）

Create `server/ids.test.ts`:

```ts
import { test, expect } from 'bun:test'
import { resolvePaperId } from './ids'

test('doi', () => {
  const r = resolvePaperId('10.1038/nature12373')
  expect(r.kind).toBe('doi')
  expect(r.s2Path).toBe('DOI:10.1038/nature12373')
})
test('arxiv bare', () => expect(resolvePaperId('1706.03762').s2Path).toBe('ARXIV:1706.03762'))
test('arxiv versioned', () => expect(resolvePaperId('1706.03762v5').s2Path).toBe('ARXIV:1706.03762v5'))
test('arxiv doi', () => expect(resolvePaperId('10.48550/arXiv.1706.03762').s2Path).toBe('ARXIV:1706.03762'))
test('openalex', () => {
  const r = resolvePaperId('W2741809807')
  expect(r.kind).toBe('openalex')
  expect(r.openalexWorkId).toBe('W2741809807')
})
test('s2 passthrough', () => expect(resolvePaperId('649def34f8be52c8b66281af98ae884c09aef38b').s2Path).toBe('649def34f8be52c8b66281af98ae884c09aef38b'))
```

- [ ] Step 2: 运行失败

Run: `bun test server/ids.test.ts`
Expected: FAIL。

- [ ] Step 3: 实现 ids.ts

Create `server/ids.ts`:

```ts
export type IdKind = 'doi' | 'arxiv' | 'openalex' | 's2' | 'unknown'

export interface ResolvedId {
  raw: string
  kind: IdKind
  s2Path: string
  doi?: string
  arxivId?: string
  openalexWorkId?: string
}

const ARXIV = /\d{4}\.\d{4,5}(?:v\d+)?/

export function resolvePaperId(input: string): ResolvedId {
  const raw = String(input).trim()

  const doiArxiv = raw.match(/10\.48550\/arxiv\.(\d{4}\.\d{4,5}(?:v\d+)?)/i)
  if (doiArxiv) return { raw, kind: 'arxiv', arxivId: doiArxiv[1], s2Path: `ARXIV:${doiArxiv[1]}` }

  if (raw.includes('doi.org') && /arxiv/i.test(raw)) {
    const m = raw.match(new RegExp(`arxiv[./](${ARXIV.source})`, 'i'))
    if (m) return { raw, kind: 'arxiv', arxivId: m[1], s2Path: `ARXIV:${m[1]}` }
  }
  if (/^10\./.test(raw) || /^https?:\/\/(dx\.)?doi\.org\//.test(raw)) {
    const doi = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    return { raw, kind: 'doi', doi, s2Path: `DOI:${doi}` }
  }
  if (new RegExp(`^${ARXIV.source}$`).test(raw)) return { raw, kind: 'arxiv', arxivId: raw, s2Path: `ARXIV:${raw}` }

  const oalex = raw.match(/(W\d{5,})/)
  if (oalex) return { raw, kind: 'openalex', openalexWorkId: oalex[1], s2Path: oalex[1] }

  return { raw, kind: 's2', s2Path: raw }
}
```

- [ ] Step 4: 运行通过

Run: `bun test server/ids.test.ts`
Expected: PASS（6 pass）。

- [ ] Step 5: Commit

```bash
git add server/ids.ts server/ids.test.ts
git commit -m "feat(server): paper id resolver"
```

### Task 2.2: retry + S2 batch client

**Files:**
- Create: `server/retry.ts`
- Create: `server/s2.ts`
- Test: `server/retry.test.ts`

- [ ] Step 1: 写失败测试

Create `server/retry.test.ts`:

```ts
import { test, expect } from 'bun:test'
import { withRetry } from './retry'

test('retries then succeeds', async () => {
  let n = 0
  const out = await withRetry(async () => {
    n++
    if (n < 3) throw Object.assign(new Error('429'), { status: 429 })
    return 'ok'
  }, { retries: 3, baseDelayMs: 1 })
  expect(out).toBe('ok')
  expect(n).toBe(3)
})

test('gives up after retries', async () => {
  let n = 0
  await withRetry(async () => { n++; throw Object.assign(new Error('503'), { status: 503 }) },
    { retries: 2, baseDelayMs: 1 }).catch(() => {})
  expect(n).toBe(3)
})
```

- [ ] Step 2: 运行失败

Run: `bun test server/retry.test.ts`
Expected: FAIL。

- [ ] Step 3: 实现 retry.ts

Create `server/retry.ts`:

```ts
interface RetryOpts {
  retries: number
  baseDelayMs: number
  retryOn?: (err: unknown) => boolean
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOpts): Promise<T> {
  const { retries, baseDelayMs, retryOn = defaultRetryOn } = opts
  let last: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (attempt === retries || !retryOn(e)) throw e
      await sleep(Math.max(baseDelayMs, baseDelayMs * 2 ** attempt))
    }
  }
  throw last
}

function defaultRetryOn(e: unknown): boolean {
  const s = (e as { status?: number })?.status
  return s === 429 || s === 403 || (typeof s === 'number' && s >= 500)
}
```

- [ ] Step 4: 实现 s2.ts（批量端点）

Create `server/s2.ts`:

```ts
import { config } from './config'
import { withRetry } from './retry'

const FIELDS =
  'paperId,title,abstract,year,citationCount,authors,venue,url,openAccessPdf,fieldsOfStudy,' +
  'references.paperId,references.title,references.year,citations.paperId,citations.title,citations.year'

export interface S2Paper {
  paperId: string
  title?: string
  abstract?: string
  year?: number
  citationCount?: number
  authors?: Array<{ authorId?: string; name: string; url?: string; affiliations?: string[] }>
  venue?: string
  url?: string
  openAccessPdf?: { url?: string }
  fieldsOfStudy?: string[]
  references?: Array<{ paperId: string; title?: string; year?: number; citationCount?: number }>
  citations?: Array<{ paperId: string; title?: string; year?: number; citationCount?: number }>
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': `Academic-Paper-Explorer/1.0 (mailto:${config.s2.contactEmail})`,
  }
  if (config.s2.apiKey) h['x-api-key'] = config.s2.apiKey
  return h
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw Object.assign(new Error(`S2 ${res.status} ${res.statusText}`), { status: res.status })
  return res.json()
}

export function getPaper(s2Path: string): Promise<S2Paper> {
  return withRetry(() => getJson(`${config.s2.base}/paper/${encodeURIComponent(s2Path)}?fields=${FIELDS}`),
    { retries: 3, baseDelayMs: 1200 })
}

/** 一次最多 500 个 id，返回与入参同序的数组（缺失为 null）。 */
export function getPapersBatch(s2Paths: string[]): Promise<(S2Paper | null)[]> {
  return withRetry(async () => {
    const res = await fetch(`${config.s2.base}/paper/batch?fields=${FIELDS}`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: s2Paths }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw Object.assign(new Error(`S2 batch ${res.status}`), { status: res.status })
    return res.json()
  }, { retries: 3, baseDelayMs: 1200 })
}

export function getRecommendations(s2Path: string): Promise<any> {
  const base = config.s2.base.replace('/graph/v1', '/recommendations/v1')
  return getJson(`${base}/papers/forpaper/${encodeURIComponent(s2Path)}?fields=paperId,title,year,citationCount,authors,venue&limit=10`)
}

export function getCitationContexts(s2Path: string): Promise<any> {
  return getJson(`${config.s2.base}/paper/${encodeURIComponent(s2Path)}/citations?fields=contexts,citingPaper.paperId,citingPaper.title,citingPaper.year,isInfluential&limit=20`)
}
```

- [ ] Step 5: 运行通过

Run: `bun test server/retry.test.ts`
Expected: PASS。

- [ ] Step 6: Commit

```bash
git add server/retry.ts server/s2.ts server/retry.test.ts
git commit -m "feat(server): retry helper and batched semantic scholar client"
```

### Task 2.3: OpenAlex + arXiv + 论文 upsert

**Files:**
- Create: `server/openalex.ts`
- Create: `server/arxiv.ts`
- Create: `server/papers.ts`

- [ ] Step 1: 实现 openalex.ts

Create `server/openalex.ts`:

```ts
import { config } from './config'

const ua = () => `Academic-Paper-Explorer/1.0 (mailto:${config.s2.contactEmail})`

export async function searchOpenAlex(query: string): Promise<any[]> {
  const url = `${config.openalex.base}/works?search=${encodeURIComponent(query)}&per_page=20&select=id,title,abstract_inverted_index,publication_year,cited_by_count,authorships,primary_location,publication_date,concepts,open_access,doi`
  const res = await fetch(url, { headers: { 'User-Agent': ua() } })
  if (!res.ok) return []
  return (await res.json()).results ?? []
}

export async function getByDoi(doi: string): Promise<any | null> {
  const res = await fetch(`${config.openalex.base}/works/doi:${doi}?select=id,title,abstract_inverted_index,publication_year,cited_by_count,authorships,primary_location,concepts,open_access`, { headers: { 'User-Agent': ua() } })
  if (!res.ok) return null
  return res.json()
}

export function reconstructAbstract(inv: Record<string, number[]> | null | undefined): string | null {
  if (!inv || typeof inv !== 'object') return null
  const words: string[] = []
  for (const [w, positions] of Object.entries(inv)) for (const p of positions) words[p] = w
  return words.filter(Boolean).join(' ')
}
```

- [ ] Step 2: 实现 arxiv.ts

Create `server/arxiv.ts`:

```ts
import { config } from './config'

export async function getArxiv(arxivId: string): Promise<{ title: string; abstract: string; year: number; authors: string[]; url: string; pdfUrl: string }> {
  const base = arxivId.replace(/v\d+$/, '')
  const res = await fetch(`${config.arxiv.base}/query?id_list=${base}`, { headers: { 'User-Agent': 'Academic-Paper-Explorer/1.0' } })
  if (!res.ok) throw new Error(`arXiv ${res.status}`)
  const xml = await res.text()
  const title = xml.match(/<entry>[\s\S]*?<title>([\s\S]+?)<\/title>/)?.[1]?.trim()
  if (!title) throw new Error('无法从 arXiv 解析条目')
  const abstract = (xml.match(/<summary>([\s\S]+?)<\/summary>/)?.[1] ?? '').replace(/\s+/g, ' ').trim()
  const published = xml.match(/<published>(.+?)<\/published>/)?.[1]
  const authors = [...xml.matchAll(/<author>\s*<name>(.+?)<\/name>/g)].map((m) => m[1].trim())
  return {
    title,
    abstract,
    year: published ? new Date(published).getFullYear() : new Date().getFullYear(),
    authors,
    url: `https://arxiv.org/abs/${base}`,
    pdfUrl: `https://arxiv.org/pdf/${base}.pdf`,
  }
}
```

- [ ] Step 3: 实现 papers.ts（落库 upsert）

Create `server/papers.ts`:

```ts
import { db } from './db'
import type { S2Paper } from './s2'

export function upsertPaper(p: Partial<S2Paper> & { paperId: string }): void {
  const fields = JSON.stringify(p.fieldsOfStudy ?? [])
  db.run(
    `insert into papers (id, semantic_scholar_id, title, abstract, publication_year, citation_count,
       reference_count, authors_text, venue, url, pdf_url, fields_of_study, source, raw, fetched_at, updated_at)
     values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
     on conflict(id) do update set
       title=excluded.title, abstract=excluded.abstract, publication_year=excluded.publication_year,
       citation_count=excluded.citation_count, reference_count=excluded.reference_count,
       authors_text=excluded.authors_text, venue=excluded.venue, url=excluded.url, pdf_url=excluded.pdf_url,
       fields_of_study=excluded.fields_of_study, raw=excluded.raw, fetched_at=datetime('now'), updated_at=datetime('now')`,
    [
      p.paperId, p.paperId, p.title ?? '', p.abstract ?? null, p.year ?? null, p.citationCount ?? 0,
      p.references?.length ?? 0, (p.authors ?? []).map((a) => a.name).join(', '), p.venue ?? null,
      p.url ?? null, p.openAccessPdf?.url ?? null, fields, 'semantic_scholar', JSON.stringify(p),
    ],
  )
}

export function upsertCitation(citing: string, cited: string): void {
  db.run('insert or ignore into citations (citing_paper_id, cited_paper_id) values (?,?)', [citing, cited])
}
```

- [ ] Step 4: 类型检查

Run: `bun build server/main.ts --target=bun --outdir /tmp/cp-build-check >/dev/null && echo OK`
Expected: OK。

- [ ] Step 5: Commit

```bash
git add server/openalex.ts server/arxiv.ts server/papers.ts
git commit -m "feat(server): openalex/arxiv clients and paper persistence"
```

### Task 2.4: graph（BFS batch + PageRank + 连通分量）

**Files:**
- Create: `server/graph.ts`
- Test: `server/graph.test.ts`

- [ ] Step 1: 写失败测试

Create `server/graph.test.ts`:

```ts
import { test, expect } from 'bun:test'
import { connectedComponents, pagerank } from './graph'

test('connected components assigns ids', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const edges = [{ from: 'a', to: 'b' }]
  const comps = connectedComponents(nodes as any, edges as any)
  expect(comps.get('a')).toBe(comps.get('b'))
  expect(comps.get('c')).not.toBe(comps.get('a'))
})

test('pagerank sums to ~1 and favors linked node', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const edges = [{ from: 'a', to: 'c' }, { from: 'b', to: 'c' }]
  const pr = pagerank(nodes as any, edges as any)
  const sum = [...pr.values()].reduce((s, v) => s + v, 0)
  expect(Math.abs(sum - 1)).toBeLessThan(1e-6)
  expect(pr.get('c')!).toBeGreaterThan(pr.get('a')!)
})
```

- [ ] Step 2: 运行失败

Run: `bun test server/graph.test.ts`
Expected: FAIL。

- [ ] Step 3: 实现 graph.ts（含修复原 `ID;` 导致的社区检测崩溃——用 `connectedComponents` 取代）

Create `server/graph.ts`:

```ts
import { getPapersBatch, type S2Paper } from './s2'
import { config } from './config'
import { upsertPaper, upsertCitation } from './papers'

export interface GraphNode {
  id: string; label: string; title: string; abstract?: string; year?: number
  citationCount: number; authors: string; venue?: string; url?: string; pdfUrl?: string
  fieldsOfStudy: string[]; isRoot: boolean; depth: number
  pageRankScore: number; clusterId: number; size: number; color: string
}
export interface GraphEdge { from: string; to: string; type: 'reference' | 'citation'; weight: number }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }

export function connectedComponents(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    adj.get(e.from)?.push(e.to)
    adj.get(e.to)?.push(e.from)
  }
  const comp = new Map<string, number>()
  let id = 0
  for (const n of nodes) {
    if (comp.has(n.id)) continue
    const stack = [n.id]
    while (stack.length) {
      const cur = stack.pop()!
      if (comp.has(cur)) continue
      comp.set(cur, id)
      for (const nb of adj.get(cur) ?? []) if (!comp.has(nb)) stack.push(nb)
    }
    id++
  }
  return comp
}

export function pagerank(nodes: GraphNode[], edges: GraphEdge[], damping = 0.85, iterations = 20): Map<string, number> {
  const n = nodes.length
  const pr = new Map<string, number>()
  const out = new Map<string, string[]>()
  for (const node of nodes) { pr.set(node.id, 1 / n); out.set(node.id, []) }
  for (const e of edges) out.get(e.from)?.push(e.to)

  for (let i = 0; i < iterations; i++) {
    const next = new Map<string, number>()
    for (const node of nodes) next.set(node.id, (1 - damping) / n)
    for (const node of nodes) {
      const links = out.get(node.id)!
      if (!links.length) continue
      const share = (damping * (pr.get(node.id) ?? 0)) / links.length
      for (const t of links) next.set(t, (next.get(t) ?? 0) + share)
    }
    for (const [k, v] of next) pr.set(k, v)
  }
  return pr
}

const DEPTH_COLORS = ['#ff6b35', '#059669', '#7c3aed', '#dc2626', '#6b7280']
const colorFor = (d: number) => DEPTH_COLORS[Math.min(d, DEPTH_COLORS.length - 1)]

function toNode(p: S2Paper, isRoot: boolean, depth: number): GraphNode {
  return {
    id: p.paperId, label: p.title ?? '未知标题', title: p.title ?? '', abstract: p.abstract,
    year: p.year, citationCount: p.citationCount ?? 0,
    authors: (p.authors ?? []).map((a) => a.name).join(', '),
    venue: p.venue, url: p.url, pdfUrl: p.openAccessPdf?.url,
    fieldsOfStudy: p.fieldsOfStudy ?? [], isRoot, depth,
    pageRankScore: 0, clusterId: 0,
    size: Math.max(15, Math.log10((p.citationCount ?? 0) + 1) * 12), color: colorFor(depth),
  }
}

export interface BuildOpts {
  depth: number
  maxNodes: number
  onProgress?: (done: number, total: number) => void
}

export async function buildNetwork(root: S2Paper, opts: BuildOpts): Promise<Graph> {
  const { depth, maxNodes, onProgress } = opts
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  const seen = new Set<string>([root.paperId])
  nodes.set(root.paperId, toNode(root, true, 0))
  upsertPaper(root)

  let frontier = [root]
  let level = 0
  const started = Date.now()

  while (frontier.length && nodes.size < maxNodes && level < depth) {
    if (Date.now() - started > config.crawl.maxExecutionMs) break
    const refIds: string[] = []
    const citeIds: string[] = []
    const refLimit = config.crawl.refLimit[Math.min(level, 3)]
    const citeLimit = config.crawl.citeLimit[Math.min(level, 3)]

    for (const paper of frontier) {
      for (const r of (paper.references ?? []).slice(0, refLimit)) {
        if (!edges.some((e) => e.from === paper.paperId && e.to === r.paperId)) {
          edges.push({ from: paper.paperId, to: r.paperId, type: 'reference', weight: 1 })
          upsertCitation(paper.paperId, r.paperId)
        }
        if (!seen.has(r.paperId) && refIds.length + citeIds.length < maxNodes) refIds.push(r.paperId)
      }
      if (citeLimit > 0) {
        for (const c of (paper.citations ?? []).slice(0, citeLimit)) {
          if (!edges.some((e) => e.from === c.paperId && e.to === paper.paperId)) {
            edges.push({ from: c.paperId, to: paper.paperId, type: 'citation', weight: 1 })
            upsertCitation(c.paperId, paper.paperId)
          }
          if (!seen.has(c.paperId) && refIds.length + citeIds.length < maxNodes) citeIds.push(c.paperId)
        }
      }
    }

    const wanted = [...new Set([...refIds, ...citeIds])].filter((id) => !seen.has(id)).slice(0, config.crawl.s2BatchSize)
    if (!wanted.length) break

    const fetched = await getPapersBatch(wanted)
    const nextFrontier: S2Paper[] = []
    fetched.forEach((p, i) => {
      if (!p || nodes.size >= maxNodes) return
      seen.add(wanted[i])
      nodes.set(p.paperId, toNode(p, false, level + 1))
      upsertPaper(p)
      nextFrontier.push(p)
    })
    onProgress?.(nodes.size, maxNodes)
    frontier = nextFrontier
    level++
    if (frontier.length && Date.now() - started < config.crawl.maxExecutionMs) {
      await new Promise((r) => setTimeout(r, config.crawl.perBatchDelayMs))
    }
  }

  const nodeList = [...nodes.values()]
  const pr = pagerank(nodeList, edges)
  const comps = connectedComponents(nodeList, edges)
  for (const node of nodeList) {
    node.pageRankScore = pr.get(node.id) ?? 0
    node.clusterId = comps.get(node.id) ?? 0
    node.size = Math.max(15, node.pageRankScore * 1000)
  }
  return { nodes: nodeList, edges }
}
```

- [ ] Step 4: 运行通过

Run: `bun test server/graph.test.ts`
Expected: PASS（2 pass）。

- [ ] Step 5: Commit

```bash
git add server/graph.ts server/graph.test.ts
git commit -m "feat(server): batched BFS graph builder with pagerank and components"
```

---

## Phase 3 — API 路由 + 进程内 job（可执行）

### Task 3.1: 缓存 + 队列工具

**Files:**
- Create: `server/db-queries.ts`
- Create: `server/jobs.ts`

- [ ] Step 1: 实现 db-queries.ts（修好旧缓存列类型）

Create `server/db-queries.ts`:

```ts
import { db } from './db'
import { createHash } from 'node:crypto'
import { config } from './config'

export function queryHash(rootId: string, depth: number, maxNodes: number): string {
  return createHash('sha256').update(`${rootId}_${depth}_${maxNodes}_v${config.cache.graphVersion}`).digest('hex').slice(0, 32)
}

export function getCachedNetwork(hash: string): any | null {
  const row = db.query(
    "select network_data from paper_networks where query_hash=? and expires_at > datetime('now')",
  ).get(hash) as { network_data: string } | null
  return row ? JSON.parse(row.network_data) : null
}

export function cacheNetwork(hash: string, rootId: string, depth: number, maxNodes: number, graph: unknown): void {
  db.run(
    `insert into paper_networks (query_hash, root_paper_id, depth, max_nodes, graph_version, network_data,
       node_count, edge_count, generated_at, expires_at)
     values (?,?,?,?,?,?,?,?,datetime('now'), datetime('now', ?))
     on conflict(query_hash) do update set network_data=excluded.network_data, node_count=excluded.node_count,
       edge_count=excluded.edge_count, generated_at=datetime('now'), expires_at=excluded.expires_at`,
    [hash, rootId, depth, maxNodes, config.cache.graphVersion, JSON.stringify(graph),
     (graph as any).nodes.length, (graph as any).edges.length, `+${config.cache.networkTtlHours} hours`],
  )
}

export function logSearch(query_text: string, query_type: string, results_count: number, execution_time_ms: number): void {
  db.run('insert into search_queries (query_text, query_type, results_count, execution_time_ms) values (?,?,?,?)',
    [query_text, query_type, results_count, execution_time_ms])
}
```

- [ ] Step 2: 实现 jobs.ts（进程内 fire-and-forget + 启动恢复）

Create `server/jobs.ts`:

```ts
import { randomUUID } from 'node:crypto'
import { db } from './db'
import { ApiError } from './errors'
import { buildNetwork } from './graph'
import { getPaper } from './s2'
import { resolvePaperId } from './ids'
import { cacheNetwork, queryHash, getCachedNetwork } from './db-queries'
import { config } from './config'

export interface Job { id: string; kind: string; status: string; progress: any; result_hash: string | null; error: string | null }

export function createJob(kind: string, payload: unknown): string {
  const id = randomUUID()
  db.run("insert into jobs (id, kind, payload, status) values (?,?,?,'pending')", [id, kind, JSON.stringify(payload)])
  return id
}

export function getJob(id: string): Job | null {
  return db.query('select id, kind, status, progress, result_hash, error from jobs where id=?').get(id) as Job | null
}

function setJob(id: string, patch: { status?: string; progress?: unknown; result_hash?: string; error?: string }): void {
  const cur = db.query('select status, progress, attempts from jobs where id=?').get(id) as any
  if (!cur) return
  db.run("update jobs set status=?, progress=?, result_hash=?, error=?, attempts=?, updated_at=datetime('now') where id=?",
    [patch.status ?? cur.status, JSON.stringify(patch.progress ?? JSON.parse(cur.progress)),
     patch.result_hash ?? null, patch.error ?? null, cur.attempts + 1, id])
}

/** 启动时把中断的 running 任务复位，并重新拾起 pending。 */
export function recoverJobs(): void {
  db.run("update jobs set status='pending' where status='running'")
  const pending = db.query("select id from jobs where status='pending'").all() as { id: string }[]
  for (const { id } of pending) void runJob(id)
}

async function runJob(id: string): Promise<void> {
  const job = db.query('select payload from jobs where id=?').get(id) as { payload: string } | null
  if (!job) return
  const payload = JSON.parse(job.payload) as { paper_id: string; depth: number; max_nodes: number; query_hash: string }
  setJob(id, { status: 'running', progress: { phase: 'fetch-root', nodes: 0 } })
  try {
    const resolved = resolvePaperId(payload.paper_id)
    const root = await getPaper(resolved.s2Path)
    const graph = await buildNetwork(root, {
      depth: payload.depth,
      maxNodes: payload.max_nodes,
      onProgress: (done, total) => setJob(id, { status: 'running', progress: { phase: 'crawl', nodes: done, total } }),
    })
    // 复用入队时算好的 query_hash，保证读写同键（勿用 root.paperId 重算）
    cacheNetwork(payload.query_hash, root.paperId, payload.depth, payload.max_nodes, graph)
    setJob(id, { status: 'done', progress: { phase: 'done', nodes: graph.nodes.length }, result_hash: payload.query_hash })
  } catch (e) {
    setJob(id, { status: 'failed', error: e instanceof Error ? e.message : String(e) })
  }
}

export function getJobResult(id: string): unknown | null {
  const job = getJob(id)
  if (!job) throw new ApiError('JOB_NOT_FOUND', '任务不存在', 404)
  if (job.status !== 'done' || !job.result_hash) return null
  return getCachedNetwork(job.result_hash)
}

export function enqueueNetwork(payload: { paper_id: string; depth: number; max_nodes: number }): { job_id?: string; cached?: unknown } {
  const depth = payload.depth ?? config.crawl.defaultDepth
  const maxNodes = payload.max_nodes ?? config.crawl.maxNodes
  const resolved = resolvePaperId(payload.paper_id)
  const hash = queryHash(resolved.s2Path, depth, maxNodes)
  const cached = getCachedNetwork(hash)
  if (cached) return { cached }
  const id = createJob('network', { paper_id: payload.paper_id, depth, max_nodes: maxNodes, query_hash: hash })
  void runJob(id)
  return { job_id: id }
}
```

- [ ] Step 3: 类型检查

Run: `bun build server/main.ts --target=bun --outdir /tmp/cp-check >/dev/null && echo OK`
Expected: OK。

- [ ] Step 4: Commit

```bash
git add server/db-queries.ts server/jobs.ts
git commit -m "feat(server): network cache and in-process job queue"
```

### Task 3.2: 四条路由

**Files:**
- Modify: `server/routes/search.ts`
- Modify: `server/routes/details.ts`
- Modify: `server/routes/network.ts`
- Modify: `server/routes/jobs.ts`

- [ ] Step 1: search 路由（S2 关键词 + OpenAlex，合并去重；DOI/arXiv/s2 走直查）

Create/overwrite `server/routes/search.ts`:

```ts
import { readJson, ApiError } from '../errors'
import { json } from '../errors'
import { searchOpenAlex } from '../openalex'
import { getPaper } from '../s2'
import { resolvePaperId } from '../ids'
import { logSearch } from '../db-queries'

interface Body { query: string; query_type?: 'keyword' | 'doi' | 'arxiv' | 's2_id' }

export async function searchRoute(req: Request): Promise<Response> {
  const started = Date.now()
  const { query, query_type = 'keyword' } = await readJson<Body>(req)
  if (!query?.trim()) throw new ApiError('VALIDATION_FAILED', '查询内容不能为空')

  let papers: any[] = []
  if (query_type === 'keyword') {
    const [s2, oa] = await Promise.allSettled([
      fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=20&fields=paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf`, {
        headers: process.env.SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY! } : {},
      }).then((r) => (r.ok ? r.json() : { data: [] })).then((j) => j.data ?? []),
      searchOpenAlex(query),
    ])
    const s2 = s2.status === 'fulfilled' ? s2.value : []
    const oa = oa.status === 'fulfilled' ? oa.value : []
    papers = [...s2.map(normalizeS2), ...oa.map(normalizeOa)]
  } else {
    const resolved = resolvePaperId(query)
    const p = await getPaper(resolved.s2Path)
    papers = [normalizeS2(p)]
  }

  const deduped = dedupe(papers)
  logSearch(query, query_type, deduped.length, Date.now() - started)
  return json({ data: { papers: deduped.slice(0, 50), total_count: deduped.length, query_type } })
}

function normalizeS2(p: any) {
  return {
    source: 'semantic_scholar', semantic_scholar_id: p.paperId, title: p.title, abstract: p.abstract,
    publication_year: p.year, citation_count: p.citationCount ?? 0,
    authors: (p.authors ?? []).map((a: any) => a.name).join(', '), venue: p.venue,
    fields_of_study: p.fieldsOfStudy ?? [], url: p.url, pdf_url: p.openAccessPdf?.url,
  }
}
function normalizeOa(w: any) {
  return {
    source: 'openalex', openalex_id: w.id, title: w.title, abstract: null,
    publication_year: w.publication_year, citation_count: w.cited_by_count ?? 0,
    authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean).join(', '),
    venue: w.primary_location?.source?.display_name, fields_of_study: (w.concepts ?? []).map((c: any) => c.display_name),
    doi: (w.doi ?? '').replace(/^https?:\/\/doi\.org\//, ''),
  }
}
function dedupe(papers: any[]) {
  const map = new Map<string, any>()
  for (const p of papers) {
    const key = p.doi || p.semantic_scholar_id || p.openalex_id || p.title
    if (key && !map.has(key)) map.set(key, p)
  }
  return [...map.values()].sort((a, b) => (b.citation_count ?? 0) - (a.citation_count ?? 0))
}
```

> 注意：`normalizeOa` 中 `doi` 已剥掉 `https://doi.org/` 前缀，修复原跨源去重失效问题。

- [ ] Step 2: details 路由

Create/overwrite `server/routes/details.ts`:

```ts
import { readJson, json, ApiError } from '../errors'
import { resolvePaperId } from '../ids'
import { getPaper, getRecommendations, getCitationContexts } from '../s2'
import { upsertPaper } from '../papers'

export async function detailsRoute(req: Request): Promise<Response> {
  const { paper_id } = await readJson<{ paper_id?: string }>(req)
  if (!paper_id) throw new ApiError('MISSING_PAPER_ID', '论文ID不能为空')
  const resolved = resolvePaperId(paper_id)

  let paper
  try {
    paper = await getPaper(resolved.s2Path)
  } catch (e) {
    const status = (e as { status?: number })?.status
    if (status === 404) throw new ApiError('PAPER_NOT_FOUND', '论文未找到', 404)
    throw new ApiError('PAPER_FETCH_FAILED', `无法获取论文: ${(e as Error).message}`, 502)
  }
  upsertPaper(paper)

  const [recommendations, citationContexts] = await Promise.all([
    getRecommendations(paper.paperId).then((r: any) => r.recommendedPapers ?? []).catch(() => []),
    getCitationContexts(paper.paperId).then((r: any) => r.data ?? []).catch(() => []),
  ])

  return json({ data: { paper, recommendations, citation_contexts: citationContexts, metrics: { h_index: 0, impact_factor: 0, altmetric_score: 0 } } })
}
```

- [ ] Step 3: network 路由

Create/overwrite `server/routes/network.ts`:

```ts
import { readJson, json, ApiError } from '../errors'
import { enqueueNetwork } from '../jobs'

export async function networkRoute(req: Request): Promise<Response> {
  const body = await readJson<{ paper_id?: string; depth?: number; max_nodes?: number }>(req)
  if (!body.paper_id) throw new ApiError('MISSING_PAPER_ID', '论文ID不能为空')
  const depth = Math.min(Math.max(body.depth ?? 2, 1), 3)
  const max_nodes = Math.min(Math.max(body.max_nodes ?? 100, 1), 300)
  const { cached, job_id } = enqueueNetwork({ paper_id: body.paper_id, depth, max_nodes })
  if (cached) return json({ data: cached, cached: true, status: 'done' })
  return json({ job_id, status: 'pending' }, 202)
}
```

- [ ] Step 4: jobs 路由

Create/overwrite `server/routes/jobs.ts`:

```ts
import { json, ApiError } from '../errors'
import { getJob, getJobResult } from '../jobs'

export function jobRoute(_req: Request, id: string): Response {
  const job = getJob(id)
  if (!job) throw new ApiError('JOB_NOT_FOUND', '任务不存在', 404)
  if (job.status === 'done') return json({ status: 'done', progress: job.progress, data: getJobResult(id) })
  return json({ status: job.status, progress: job.progress, error: job.error })
}
```

- [ ] Step 5: 冒烟测试（真网络，需可访问 S2）

```bash
bun run server/main.ts &   # 后台起服务
sleep 1
curl -s -XPOST localhost:8787/api/search -H 'content-type: application/json' \
  -d '{"query":"attention mechanism","query_type":"keyword"}' | head -c 300; echo
curl -s -XPOST localhost:8787/api/network -H 'content-type: application/json' \
  -d '{"paper_id":"10.48550/arXiv.1706.03762","depth":1,"max_nodes":20}'; echo
```
Expected: 搜索返回 `data.papers` 非空；network 返回 `job_id`。随后
`curl -s localhost:8787/api/jobs/<job_id>` 先 `running` 后 `done` 且带 `data.nodes`。
Kill 后台进程。

- [ ] Step 6: Commit

```bash
git add server/routes
git commit -m "feat(server): search/details/network/jobs routes with async graph jobs"
```

### Task 3.3: 启动脚本 + 本地端到端

- [ ] Step 1: 建 `server/.env`（从 example 复制，填 S2 key 可选）

```bash
cp server/.env.example server/.env
```

- [ ] Step 2: 两个终端跑通

```bash
# 终端 A
bun run server            # 或 bun run server/main.ts
# 终端 B：确认 API 存活（无 /api/health 路由，用真实接口探测）
curl -s -o /dev/null -w '%{http_code}\n' -XPOST localhost:8787/api/search \
  -H 'content-type: application/json' -d '{"query":"test"}'
curl -s -o /dev/null -w '%{http_code}\n' localhost:8787/api/jobs/does-not-exist
```
Expected: 第一行 `200`（或上游失败时 `502`，但服务在跑）；第二行 `404`。二者都证明服务器已监听。

- [ ] Step 3: Commit（`.env` 已被忽略，确认不提交）

```bash
git status
git add server/ package.json
git commit -m "chore(server): local run scripts"
```

---

## Phase 4 — 前端改为本地 fetch（可执行）

## Phase 4 — 前端改为本地 fetch + 分层重构（可执行）

按目标结构重构：域类型下沉 → API service(+zod) → hooks 拆分 → store 更名 UI-only → 组件接线 → 删 Supabase。

### Task 4.1: 域类型下沉到 `src/types/domain.ts`

**Files:**
- Create: `academic-paper-explorer/src/types/domain.ts`
- Modify: `academic-paper-explorer/src/hooks/useApiQueries.ts`、`src/store/useAppStore.ts`、`src/components/{PaperList,DetailsPanel,FilterPanel,SearchBar,NetworkGraph}.tsx`、`src/pages/HomePage.tsx`

- [ ] Step 1: 建域类型（从 `lib/supabase.ts` 原样搬出，去掉 supabase client 导入）

Create `academic-paper-explorer/src/types/domain.ts`:

```ts
export type Paper = {
  id: string
  semantic_scholar_id?: string
  openalex_id?: string
  title: string
  abstract?: string
  publication_year?: number
  year?: number
  citation_count: number
  authors: string
  venue?: string
  journal?: string
  url?: string
  pdf_url?: string
  doi?: string
  fields_of_study?: string[]
  page_rank_score?: number
  cluster_id?: number
  source: 'semantic_scholar' | 'openalex' | 'crossref'
}

export type NetworkNode = {
  id: string
  label: string
  title: string
  abstract?: string
  year?: number
  citationCount: number
  authors: string
  venue?: string
  url?: string
  pdfUrl?: string
  fieldsOfStudy?: string[]
  isRoot: boolean
  pageRankScore: number
  clusterId: number
  size: number
  color: string
}

export type NetworkEdge = { from: string; to: string; type: 'reference' | 'citation'; weight: number }
export type NetworkData = { nodes: NetworkNode[]; edges: NetworkEdge[] }
export type SearchQuery = { query: string; query_type: 'keyword' | 'doi' | 'arxiv' | 's2_id' }

export type PaperDetails = {
  paper: {
    id: string
    title: string
    abstract?: string
    year?: number
    publication_year?: number
    citation_count: number
    authors: Array<{ id?: string; name: string; url?: string; affiliations?: string[] }> | string
    venue?: string
    journal?: string
    url?: string
    pdf_url?: string
    doi?: string
    fields_of_study?: string[]
    references?: Array<{ paperId: string; title: string; year?: number; citationCount?: number }>
    citations?: Array<{ paperId: string; title: string; year?: number; citationCount?: number }>
  }
  recommendations: Array<{ paperId: string; title: string; year?: number; citationCount?: number; authors?: Array<{ name: string }>; venue?: string }>
  citation_contexts: Array<{ contexts?: string[]; citingPaper: { paperId: string; title: string; year?: number }; isInfluential: boolean }>
  metrics: { h_index: number; impact_factor: string; altmetric_score: number }
}
```

- [ ] Step 2: 全量替换导入

把 `from '../lib/supabase'` / `from './lib/supabase'` 的类型导入一律改为 `from '../types/domain'` / `'../../types/domain'`。用 `rg "lib/supabase" academic-paper-explorer/src` 列出全部调用点后逐个改。

- [ ] Step 3: 验证

Run: `cd academic-paper-explorer && pnpm typecheck`
Expected: 仅剩 `lib/supabase.ts` 内 `supabase` client 未被引用而产生的报错（下一步删除文件后消失）；域类型无报错。

- [ ] Step 4: Commit（暂留 lib/supabase.ts，Task 4.5 删）

```bash
git add academic-paper-explorer/src/types/domain.ts academic-paper-explorer/src
git commit -m "refactor(frontend): extract domain types out of supabase client"
```

### Task 4.2: API service + zod 边界

**Files:**
- Create: `academic-paper-explorer/src/services/api.ts`
- Create: `academic-paper-explorer/src/services/schemas.ts`
- Test: `academic-paper-explorer/src/services/schemas.test.ts`

- [ ] Step 1: 安装 zod（已在依赖，确认）

Run: `cd academic-paper-explorer && pnpm list zod`
Expected: 已存在 `zod@^3`。

- [ ] Step 2: 写失败测试

Create `academic-paper-explorer/src/services/schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { searchResponseSchema, networkDataSchema } from './schemas'

describe('schemas', () => {
  it('accepts a valid search response', () => {
    const r = searchResponseSchema.parse({ data: { papers: [{ title: 'T' }], total_count: 1 } })
    expect(r.data.total_count).toBe(1)
  })
  it('rejects a search response without total_count', () => {
    expect(() => searchResponseSchema.parse({ data: { papers: [] } })).toThrow()
  })
  it('accepts empty network', () => {
    expect(networkDataSchema.parse({ nodes: [], edges: [] }).nodes).toEqual([])
  })
})
```

- [ ] Step 3: 运行失败

Run: `cd academic-paper-explorer && pnpm test src/services/schemas.test.ts`
Expected: FAIL（模块不存在）。

- [ ] Step 4: 实现 schemas.ts

Create `academic-paper-explorer/src/services/schemas.ts`:

```ts
import { z } from 'zod'

export const paperSchema = z.object({
  id: z.string().optional(),
  semantic_scholar_id: z.string().optional(),
  openalex_id: z.string().optional(),
  title: z.string(),
  abstract: z.string().nullish(),
  publication_year: z.number().nullish(),
  citation_count: z.number().default(0),
  authors: z.string().default(''),
  venue: z.string().nullish(),
  journal: z.string().nullish(),
  url: z.string().nullish(),
  pdf_url: z.string().nullish(),
  doi: z.string().nullish(),
  fields_of_study: z.array(z.string()).optional(),
  source: z.string(),
}).passthrough()

export const searchResponseSchema = z.object({
  data: z.object({ papers: z.array(paperSchema), total_count: z.number() }),
})

export const networkDataSchema = z.object({
  nodes: z.array(z.object({ id: z.string() }).passthrough()),
  edges: z.array(z.object({ from: z.string(), to: z.string() }).passthrough()),
})

export const jobStatusSchema = z.object({
  status: z.enum(['pending', 'running', 'done', 'failed']),
  progress: z.any().optional(),
  data: networkDataSchema.optional(),
  error: z.string().nullish(),
})

export const detailsResponseSchema = z.object({ data: z.object({ paper: z.any() }).passthrough() })
```

- [ ] Step 5: 运行通过

Run: `cd academic-paper-explorer && pnpm test src/services/schemas.test.ts`
Expected: 3 passed。

- [ ] Step 6: 实现 api.ts

Create `academic-paper-explorer/src/services/api.ts`:

```ts
import {
  searchResponseSchema, networkDataSchema, jobStatusSchema, detailsResponseSchema,
} from './schemas'
import type { NetworkData, Paper, PaperDetails } from '../types/domain'

const API = '/api'

export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

const MESSAGES: Record<string, string> = {
  PAPER_NOT_FOUND: '找不到指定的论文，请检查论文ID',
  PAPER_FETCH_FAILED: '无法从数据源获取论文，可能受速率限制，请稍后重试',
  MISSING_PAPER_ID: '论文ID缺失，请选择有效的论文',
  RATE_LIMITED: 'API请求过于频繁，请稍后重试',
  NETWORK_BUILD_FAILED: '网络构建失败，请重试',
  JOB_NOT_FOUND: '任务不存在或已过期',
}

async function request(path: string, body?: unknown): Promise<any> {
  const res = await fetch(API + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const code = data?.error?.code ?? 'INTERNAL_SERVER_ERROR'
    throw new ApiError(code, MESSAGES[code] ?? data?.error?.message ?? '请求失败')
  }
  return data
}

/**
 * 入队建图并轮询至完成。放在单个 queryFn 内，让 React Query 以 paperId 为键共享缓存，
 * 多个组件调用不会重复触发。
 */
async function networkWithPolling(paperId: string, depth: number, maxNodes: number): Promise<NetworkData> {
  const res = await request('/network', { paper_id: paperId, depth, max_nodes: maxNodes })
  if (res.data) return networkDataSchema.parse(res.data)
  const jobId: string = res.job_id
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500))
    const job = jobStatusSchema.parse(await request(`/jobs/${jobId}`))
    if (job.status === 'done' && job.data) return job.data
    if (job.status === 'failed') throw new Error(job.error ?? '网络构建失败')
  }
  throw new Error('网络构建超时')
}

export const api = {
  async search(query: string, query_type: string): Promise<{ papers: Paper[]; total_count: number }> {
    return searchResponseSchema.parse(await request('/search', { query, query_type })).data as any
  },
  async details(paperId: string): Promise<PaperDetails> {
    return detailsResponseSchema.parse(await request('/details', { paper_id: paperId })).data as any
  },
  networkWithPolling,
}
```

- [ ] Step 7: 类型检查

Run: `cd academic-paper-explorer && pnpm typecheck`
Expected: 无新错误。

- [ ] Step 8: Commit

```bash
git add academic-paper-explorer/src/services
git commit -m "feat(frontend): local api service with zod response validation"
```

### Task 4.3: hooks 拆分

**Files:**
- Create: `academic-paper-explorer/src/hooks/useSearchPapers.ts`
- Create: `academic-paper-explorer/src/hooks/usePaperDetails.ts`
- Create: `academic-paper-explorer/src/hooks/usePaperNetwork.ts`
- Delete: `academic-paper-explorer/src/hooks/useApiQueries.ts`

- [ ] Step 1: useSearchPapers.ts

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export function useSearchPapers(params: { query: string; query_type: string } | null) {
  return useQuery({
    queryKey: ['search', params],
    enabled: !!params,
    queryFn: () => api.search(params!.query, params!.query_type),
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] Step 2: usePaperDetails.ts

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export function usePaperDetails(paperId: string | null) {
  return useQuery({
    queryKey: ['paper-details', paperId],
    enabled: !!paperId,
    queryFn: () => api.details(paperId!),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}
```

- [ ] Step 3: usePaperNetwork.ts（单 query + 内部轮询，缓存按 paperId 共享）

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import type { Paper } from '../types/domain'

export function resolveClientId(p: Paper | null): string | null {
  if (!p) return null
  return p.semantic_scholar_id || p.doi || p.openalex_id || p.id || null
}

export function usePaperNetwork(paper: Paper | null, depth = 2, maxNodes = 100) {
  const paperId = resolveClientId(paper)
  return useQuery({
    queryKey: ['network', paperId, depth, maxNodes],
    enabled: !!paperId,
    queryFn: () => api.networkWithPolling(paperId!, depth, maxNodes),
    staleTime: Infinity,
    retry: 1,
  })
}
```

- [ ] Step 4: 删除旧 hook 并验证

```bash
git rm academic-paper-explorer/src/hooks/useApiQueries.ts
cd academic-paper-explorer && pnpm typecheck
```
Expected: 组件处引用 `useApiQueries` 的报错（Task 4.4 修复）。

- [ ] Step 5: Commit

```bash
git add academic-paper-explorer/src/hooks
git commit -m "refactor(frontend): split api hooks; self-contained network polling hook"
```

### Task 4.4: store 更名 `useUiStore`（UI-only）+ 组件接线

**Files:**
- Create: `academic-paper-explorer/src/store/useUiStore.ts`
- Delete: `academic-paper-explorer/src/store/useAppStore.ts`
- Modify: 全部组件与页面

- [ ] Step 1: 建 `useUiStore.ts`（只留 UI 状态；server 数据归 React Query）

```ts
import { create } from 'zustand'
import type { Paper } from '../types/domain'

interface UiState {
  selectedPaper: Paper | null
  selectedNodeId: string | null
  highlightedNodes: string[]
  submittedQuery: { query: string; query_type: string } | null
  filters: {
    yearRange: [number, number]
    minCitations: number
    selectedFields: string[]
    selectedVenues: string[]
  }
  setSelectedPaper: (p: Paper | null) => void
  setSelectedNodeId: (id: string | null) => void
  setHighlightedNodes: (ids: string[]) => void
  submitQuery: (q: { query: string; query_type: string }) => void
  updateFilters: (f: Partial<UiState['filters']>) => void
  resetFilters: () => void
}

const defaultFilters = {
  yearRange: [1990, new Date().getFullYear()] as [number, number],
  minCitations: 0,
  selectedFields: [] as string[],
  selectedVenues: [] as string[],
}

export const useUiStore = create<UiState>((set) => ({
  selectedPaper: null,
  selectedNodeId: null,
  highlightedNodes: [],
  submittedQuery: null,
  filters: defaultFilters,
  setSelectedPaper: (p) => set({ selectedPaper: p }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHighlightedNodes: (ids) => set({ highlightedNodes: ids }),
  submitQuery: (q) => set({ submittedQuery: q }),
  updateFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: defaultFilters }),
}))
```

- [ ] Step 2: `SearchBar` — 用 UI store 的 `submitQuery`，不再调 mutation

`SearchBar` 的 `handleSearch` 改为：`submitQuery({ query: searchQuery, query_type: searchType })`；移除 `isSearching`/`searchMutation` 逻辑，改用 `const searching = !!submittedQuery && ...`（可由 `useSearchPapers(submittedQuery).isFetching` 提供——见下）。本地 `searchQuery`/`searchType` 可保留为组件内 `useState`，或继续用 UI store（二选一，保持单一来源）。

- [ ] Step 3: `PaperList` — 从 hook 取结果；选择只设置 `selectedPaper`

```ts
const { data, isFetching } = useSearchPapers(submittedQuery)
const results = data?.papers ?? []
// handlePaperSelect: 仅 setSelectedPaper(paper)；建图由 usePaperNetwork 自动触发
```

- [ ] Step 4: `NetworkGraph` — 用 `usePaperNetwork(selectedPaper)`，删 store 的 networkData/isLoadingNetwork

```ts
const { selectedPaper } = useUiStore()
const { data: networkData, isLoading, error } = usePaperNetwork(selectedPaper)
// 其余绘制逻辑不变；空/加载/错误分支改用 isLoading / error
```

- [ ] Step 5: `HomePage` footer 节点数 — 同样调 `usePaperNetwork(selectedPaper)`（React Query 缓存去重，不会重复请求），或把节点数显示下移到 `NetworkGraph`。

- [ ] Step 6: `DetailsPanel` — 用 `usePaperDetails(selectedNodeId || resolveClientId(selectedPaper))`。

- [ ] Step 7: `FilterPanel` — 导入改 `useUiStore`。

- [ ] Step 8: 删除旧 store

```bash
git rm academic-paper-explorer/src/store/useAppStore.ts
```

- [ ] Step 9: 验证

Run: `cd academic-paper-explorer && pnpm typecheck && pnpm lint && pnpm test`
Expected: 全绿，无 `lib/supabase` / `useAppStore` / `useApiQueries` 残留引用（`rg` 确认）。

- [ ] Step 10: Commit

```bash
git add academic-paper-explorer/src
git commit -m "refactor(frontend): UI-only store and rewire components to api hooks"
```

### Task 4.5: Vite 代理、删依赖、端到端

**Files:**
- Modify: `academic-paper-explorer/vite.config.ts`
- Delete: `academic-paper-explorer/src/lib/supabase.ts`
- Modify: `academic-paper-explorer/package.json`

- [ ] Step 1: Vite 代理

Modify `academic-paper-explorer/vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
})
```

- [ ] Step 2: 删除 supabase client 与依赖

```bash
git rm academic-paper-explorer/src/lib/supabase.ts
cd academic-paper-explorer && pnpm remove @supabase/supabase-js
rg -i supabase academic-paper-explorer/src && echo "FOUND (需清理)" || echo "clean"
```
Expected: `clean`。

- [ ] Step 3: 验证

Run: `cd academic-paper-explorer && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: 全绿。

- [ ] Step 4: 端到端

```bash
# 终端 A
bun run server
# 终端 B
pnpm --dir academic-paper-explorer dev
```
打开 `http://localhost:5173`：搜索 → 选论文 → 显示"构建中" → 出图 → 点节点看详情 → 再点同一论文应命中缓存秒出（验证缓存键修复）。

- [ ] Step 5: Commit

```bash
git add academic-paper-explorer/vite.config.ts academic-paper-explorer/package.json academic-paper-explorer/pnpm-lock.yaml
git commit -m "refactor(frontend): vite api proxy; drop supabase dependency"
```

---

## Phase 5 — 渲染（独立计划，给出代码与验收）

**Files:**
- Create: `academic-paper-explorer/src/graph/computeLayout.ts`
- Create: `academic-paper-explorer/src/graph/layout.worker.ts`
- Modify: `academic-paper-explorer/src/components/NetworkGraph.tsx`
- Modify: `academic-paper-explorer/package.json`（加 `d3-force`，删 `vis-network`）

- [ ] 安装：`pnpm add d3-force && pnpm add -D @types/d3-force && pnpm remove vis-network`
- [ ] `computeLayout.ts`：纯函数，输入 `nodes/edges`，用 `d3-force`（`forceSimulation/forceLink/forceManyBody/forceCenter`）同步跑 `tick(300)`，返回 `{id,x,y}[]`。
- [ ] `layout.worker.ts`：`onmessage` 收 `{nodes,edges}` → `computeLayout` → `postMessage(positions)`。
- [ ] `NetworkGraph.tsx`：
  - 建 `const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])`；绘制边用 `byId.get(edge.from)`，消除 `nodes.find` 的 O(E·V)。
  - 布局改由 worker 计算；`useEffect` 依赖去掉 `dimensions`（仅在 `networkData` 变化时重算布局，尺寸变化只重绘）。
  - 使用 `highlightedNodes`（选节点时淡化非邻接）。
  - 标签按 `zoom` 分级显隐（已有雏形，改为邻接优先）。

**验收：**
- `rg "nodes.find" academic-paper-explorer/src/components/NetworkGraph.tsx` 在绘制路径为 0。
- 300 节点图拖拽/缩放无明显卡顿（Chrome Performance 记录主线程无长任务 >50ms）。
- 布局计算不阻塞主线程（worker 独立线程）。

---

## Phase 6 — 收尾（独立计划）

- **清理 Supabase**：`git rm -r supabase/`；删除根 `deploy_url.txt` 里的云端地址（或标注废弃）；README/DEPLOYMENT_GUIDE/QUICK_START 改写为本地运行：
  ```bash
  bun install
  bash scripts/setup.sh   # 复制 .env、建 data/
  bun run build:web
  bun run server          # 打开 http://127.0.0.1:8787
  ```
- **脚本**：新增 `scripts/setup.sh`（创建 `data/`、复制 `server/.env.example`）。
- **只监听本机**：确认 `config.server.hostname='127.0.0.1'`（已默认）；在 README 明示勿绑 `0.0.0.0`。
- **可选 CI**（GitHub Actions）：`bun test server/` + 前端 `lint/typecheck/test/build`。
- **文档**：新增 `ARCHITECTURE.md`，描述本地 Bun 架构与本计划图。

**验收：** 全新克隆后仅需 `bun install && pnpm --dir academic-paper-explorer install`，按上述命令即可本地跑通；`rg -i supabase` 仅剩历史文档说明。

---

## Self-Review

**Spec coverage:** 前一轮 7 项架构问题全部落实——A 数据落库→Phase 1/2.3/3；B 异步爬取→Phase 3；C 去重复+共享内核→Phase 2；D 双真相→Phase 4；E 渲染→Phase 5；F 运维/环境→Phase 6；G 配置散落→`server/config.ts` 单点。另修正三个具名 bug：缓存列类型、跨源 DOI 去重、社区检测崩溃。

**Placeholder scan:** Phase 0–4 均为完整代码与命令；Phase 5/6 给出接口、文件与验收，执行前拆独立计划（范围说明已声明），非占位。

**Pre-flight 裁决（已并入）:**
- 缓存键统一：`enqueueNetwork` 在 job payload 里携带 `query_hash`，`runJob` 复用之，禁止用 `root.paperId` 重算（原计划两键不一致会导致缓存永久 miss）。
- Phase 4 按目标结构重构：域类型下沉 `types/domain.ts`，hooks 拆为 `useSearchPapers/usePaperDetails/usePaperNetwork`，store 更名 `useUiStore` 且只留 UI 状态，最后删除 `lib/supabase.ts` 与依赖。
- 移除虚构的 `/api/health` 探测，改用真实接口判活。

**Type consistency:** `resolvePaperId(...).s2Path`（2.1）→ `getPaper(s2Path)`（2.2/3.2）；`GraphNode/GraphEdge`（2.4）在 `buildNetwork`、`pagerank`、`connectedComponents`、前端 `NetworkData`（4.1 domain）间一致；`query_hash` 在 `schema.sql`、`db-queries.ts`、`jobs.ts`（payload）三处一致；`api.networkWithPolling` 返回 `NetworkData`，与 `usePaperNetwork` 的 queryFn 及 `NetworkGraph` 消费端一致。

**运行前置:** Bun ≥1.3（已装）；可选 `SEMANTIC_SCHOLAR_API_KEY`（不配也能跑，速率受限）。
