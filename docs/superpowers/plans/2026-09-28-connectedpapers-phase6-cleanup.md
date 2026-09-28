# ConnectedPapers Phase 6 — 收尾与文档 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清除残留的 Supabase 目录与云端文档，补上本地运行脚本与准确的 README/架构文档，使全新克隆能按一条命令跑起来。

**Architecture:** 纯清理与文档任务。删除 `supabase/`（根 + 前端）、`deploy_url.txt`；新增 `scripts/setup.sh`；把 README/QUICK_START/DEPLOYMENT_GUIDE/NETWORK_GRAPH_FIX 改写为本地 Bun 流程；新增 `ARCHITECTURE.md`；加最小 CI。

**Tech Stack:** Bun、pnpm、GitHub Actions（可选）。

---

## Global Constraints

- 运行栈是本地 Bun + SQLite；文档不得再出现 Supabase、Edge Functions、Vercel/Netlify 部署、minimax 在线地址。
- 删除仅限 Supabase 相关目录/文件；不得删除 `server/`、`academic-paper-explorer/`、`docs/`、`data/`（data 已被忽略）。
- 提交信息必须与每个 Task 的指定文本完全一致。
- 验证命令：`bun test server/` 与 `cd academic-paper-explorer && pnpm typecheck && pnpm lint && pnpm test && pnpm build` 必须全绿。

---

## Task 6.1: 删除 Supabase 残留

**Files:**
- Delete: `supabase/`（根）
- Delete: `academic-paper-explorer/supabase/`
- Delete: `deploy_url.txt`
- Delete: `NETWORK_GRAPH_FIX.md`

- [ ] Step 1: 确认无源码依赖

Run: `rg -n -i "supabase" --glob '!*.md' --glob '!docs/**' .`
Expected: 仅可能出现在 `.gitignore` 或历史文档；`server/` 与 `academic-paper-explorer/src/` 无命中。

- [ ] Step 2: 删除

```bash
git rm -r supabase academic-paper-explorer/supabase
git rm deploy_url.txt NETWORK_GRAPH_FIX.md
```

- [ ] Step 3: 验证仍可运行

Run:
```bash
bun test server/
cd academic-paper-explorer && pnpm typecheck && pnpm build
```
Expected: 全绿。

- [ ] Step 4: Commit

```bash
git commit -m "chore: remove supabase functions, local config and cloud deployment docs"
```

---

## Task 6.2: 新增 `scripts/setup.sh`

**Files:**
- Create: `scripts/setup.sh`

- [ ] Step 1: 写脚本

Create `scripts/setup.sh`:

```bash
#!/usr/bin/env bash
# 本地初始化：安装依赖、准备数据目录、复制后端环境变量样例。
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

command -v bun >/dev/null || { echo "需要 Bun ≥1.3：https://bun.sh"; exit 1; }
command -v pnpm >/dev/null || { echo "需要 pnpm 9"; exit 1; }

mkdir -p data

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  echo "已创建 server/.env（可选：填入 SEMANTIC_SCHOLAR_API_KEY 提升速率限制）"
fi

(cd academic-paper-explorer && pnpm install)

echo "初始化完成。运行： bun run build:web && bun run server"
```

- [ ] Step 2: 赋执行权限并干跑

```bash
chmod +x scripts/setup.sh
bash -n scripts/setup.sh
```
Expected: 语法检查通过（`bash -n` 无输出）。不实际执行完整安装以免重复耗时；如需，可运行到 `mkdir -p data` 即可中止。

- [ ] Step 3: Commit

```bash
git add scripts/setup.sh
git commit -m "chore: add local setup script"
```

---

## Task 6.3: 改写 README 为本地运行流程

**Files:**
- Modify: `README.md`
- Modify: `QUICK_START.md`
- Modify: `DEPLOYMENT_GUIDE.md`
- Modify: `todo.md`

- [ ] Step 1: 重写 `README.md`

替换为本地版：项目简介（引用网络可视化）、技术栈（Bun + SQLite + React 18 + Vite + d3-force）、目录结构（`server/`、`academic-paper-explorer/`）、快速开始：

```markdown
## 快速开始

```bash
git clone <repo> && cd connectedpapers
bash scripts/setup.sh          # 装依赖、建 data/、复制 server/.env
bun run build:web              # 构建前端
bun run server                 # http://127.0.0.1:8787
```

开发模式（前端热更新，Vite 代理 /api → 8787）：

```bash
bun run server                 # 终端 A
pnpm --dir academic-paper-explorer dev   # 终端 B
```
```

补充：数据源（Semantic Scholar / OpenAlex）、可选 `SEMANTIC_SCHOLAR_API_KEY`、测试命令（`bun test server/`、`pnpm --dir academic-paper-explorer test`）、许可证。删除所有 Supabase / Vercel / Netlify / minimax 内容。

- [ ] Step 2: 重写 `QUICK_START.md`

精简为「3 条命令跑起来」+ 常见问题（端口占用用 `PORT=… bun run server`；前端未构建会返回提示 JSON；无 S2 key 时速率受限）。删除云端体验链接。

- [ ] Step 3: 重写 `DEPLOYMENT_GUIDE.md`

改为「本地部署/运行」：环境要求、`scripts/setup.sh`、构建、以 `bun run server` 常驻（可用 systemd/`nohup` 说明，可选）、注意事项（默认只监听 127.0.0.1，勿绑 0.0.0.0）。删除 Supabase 建表/函数部署章节。

- [ ] Step 4: 更新 `todo.md`

删除 FastAPI/Neo4j/Celery/Redis/Docker 的旧规划，改为已完成事实（本地 Bun + SQLite）与后续可选项（Phase 5 渲染已做、可选的全局引用图落库、WebGL 大图）。或直接标注为历史文档。

- [ ] Step 5: 验证无残留引用

Run: `rg -n -i "supabase|vercel|netlify|minimax|edge function" README.md QUICK_START.md DEPLOYMENT_GUIDE.md`
Expected: 无输出。

- [ ] Step 6: Commit

```bash
git add README.md QUICK_START.md DEPLOYMENT_GUIDE.md todo.md
git commit -m "docs: rewrite readme/quickstart/deployment for the local Bun stack"
```

---

## Task 6.4: 新增 `ARCHITECTURE.md`

**Files:**
- Create: `ARCHITECTURE.md`

- [ ] Step 1: 写文档

内容需覆盖：
- 目标与约束（本地单用户、无鉴权、只监听本机）。
- 架构图（Browser → `Bun.serve` `/api/*` → SQLite `data/app.db`；前端 React Query/Zustand 分工）。
- 目录职责（`server/main.ts` 传输层、`server/routes/*`、`server/{ids,retry,s2,openalex,resolve,normalize,papers,graph,jobs,db-queries,db,config,errors}.ts`；前端 `src/services`、`src/hooks`、`src/graph`、`src/store`）。
- 关键设计决策：job + 轮询（同步请求外的长任务）；缓存键 `queryHash(s2Path, depth, maxNodes, graphVersion)` 与 payload 携带 `query_hash`；FK 顺序（`ensurePaperStub`）；PageRank 悬挂质量守恒；OpenAlex→DOI 解析。
- 数据模型（`papers/authors/paper_authors/citations/paper_networks/jobs/search_queries`）。
- 已知局限与后续（全局引用图落库、WebGL、鉴权如需）。

- [ ] Step 2: 验证

Run: `test -f ARCHITECTURE.md && wc -l ARCHITECTURE.md`
Expected: 文件存在，行数 >40。

- [ ] Step 3: Commit

```bash
git add ARCHITECTURE.md
git commit -m "docs: add local architecture overview"
```

---

## Task 6.5: 最小 CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] Step 1: 写工作流

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main, 'refactor/**'] }
  pull_request: { branches: [main] }
jobs:
  server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - run: bun test server/
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm, cache-dependency-path: academic-paper-explorer/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
        working-directory: academic-paper-explorer
      - run: pnpm typecheck
        working-directory: academic-paper-explorer
      - run: pnpm lint
        working-directory: academic-paper-explorer
      - run: pnpm test
        working-directory: academic-paper-explorer
      - run: pnpm build
        working-directory: academic-paper-explorer
```

- [ ] Step 2: 本地等价验证

```bash
bun test server/
cd academic-paper-explorer && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: 全绿。

- [ ] Step 3: Commit

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add server and frontend pipelines"
```

---

## Task 6.6: 全新克隆冒烟

**Files:** 无

- [ ] Step 1: 模拟干净检出（不删工作区，用 git archive 到临时目录）

```bash
tmp="$(mktemp -d)"
git archive HEAD | tar -x -C "$tmp"
ls "$tmp" | head
test -d "$tmp/server" && test -f "$tmp/server/schema.sql" && echo "layout OK"
rm -rf "$tmp"
```
Expected: 打印 `layout OK`（仅有源码，无 supabase 目录）。注意 `git archive` 不含未提交文件；若本任务前有未提交变更，先提交。

- [ ] Step 2: 记录结论到报告；无代码变更则无需提交。

---

## Self-Review

**Spec coverage:** F(运维/环境) → 6.1 清理、6.2 脚本、6.3/6.4 文档、6.5 CI、6.6 冒烟。
**Placeholder scan:** 每任务含命令与验收；文档任务给出必须覆盖的要点清单而非空泛「更新文档」。
**一致性:** 脚本命令（`bun run build:web`、`bun run server`）与根 `package.json` 既有 scripts 一致；端口 8787 与 `server/config.ts` 默认一致。
**风险:** CI 首次运行可能因 pnpm/store 版本差异失败；若失败，按仓库现有 Node 22 + pnpm 9.15 固定即可（已固定）。
