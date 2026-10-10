# Good first issues（待开）

10 个真实存在的、边界清楚的小任务。**改名完成后**再开，否则 issue 里的链接会立刻过时。
每条都给了可直接运行的开 issue 命令；`--body` 用 heredoc，避免 shell 吞掉反引号。

开之前先确认标签存在（本仓库已有 `good first issue` / `enhancement` / `documentation` / `bug` / `help wanted`）。

---

## 1. 爬取时逐行写库，应该合并成一个事务

**背景**：`/api/connect` 之前每条边一次 auto-commit，约 4500 次 fsync 就吃掉了 6 秒（见 commit `perf(connect)`）。同样的写法还留在 `server/graph.ts` 的爬取循环里：`upsertCitation()`（约 232、241 行）、`upsertPaper()`（约 258 行）和 `persistRelations()`（约 286 行）。
**要做的事**：把每一轮 frontier 的写入合并到 `db.transaction(...)` 里（注意循环内有 `await`，事务里不能有 await，需要在 await 之后同步执行写入）。
**验收**：`bun run test:server` 全绿；附上改造前后一次真实爬取（200 节点）的耗时对比。
**难度**：小，但需要理解 async 与事务的边界。适合首次贡献 ✅

```bash
gh issue create --title "perf(crawl): persist each frontier level in one transaction" \
  --label "good first issue,enhancement" --body-file - <<'BODY'
`server/graph.ts` still writes crawled papers and citations row by row. The same
pattern in `server/connect.ts` was worth ~6 s per request (4500 auto-commits), so
this is likely the biggest remaining win in the crawl path.

Wrap each frontier level's writes in a single `db.transaction(...)`. Note the loop
contains `await`: the transaction wrapper is synchronous, so the writes have to
happen after the awaits, inside one sync block.

Please include a before/after timing for a ~200-node crawl in the PR description.
BODY
```

## 2. 给 Docker 镜像加一个 smoke test

**背景**：`Dockerfile` 和 `.github/workflows/docker.yml` 已存在，但没有任何测试证明镜像真的能起来并响应。
**要做的事**：新增一个 CI job：构建镜像 → `docker run -d -p 8787:8787` → 轮询 `/api/llm/status` 直到 200（或超时失败）→ 打日志退出。断言容器以非 root 用户运行、`/data` 是卷。
**验收**：故意把 `HOST` 改成 `127.0.0.1` 时 CI 应该失败（证明测试真的在测）。
**难度**：小，只需要会写 workflow。适合首次贡献 ✅

```bash
gh issue create --title "ci: smoke-test the published container image" \
  --label "good first issue,enhancement" --body-file - <<'BODY'
We publish an image but never prove it runs. Add a CI job that builds it, starts it
with a published port, waits for `/api/llm/status` to answer, then dumps logs and fails
if it never came up.

Worth asserting: the process runs as the unprivileged `bun` user, and `/data` is a volume
so the SQLite file survives `docker compose down`.

Sanity check your test: changing `HOST` to `127.0.0.1` in the Dockerfile should make it fail.
BODY
```

## 3. 按论文许可决定是否提供全文

**背景**：arXiv 的 Atom API 不返回许可，所以 `PAPER_CONTENT_MODE=auto` 在非回环实例上只能一律 `off`（只给摘要 + 链接）。但论文页 `https://arxiv.org/abs/<id>` 里有 `<a href="http://arxiv.org/licenses/nonexclusive-distrib/1.0/" title="Rights to this article">view license</a>`，可以据此逐篇判断。
**要做的事**：抓取（并缓存）论文页的许可链接；对 CC-BY 等开放许可的论文，即使公开实例也提供全文；其余保持摘要 + 链接。给出一个映射表并把未知许可当作「不提供」。
**验收**：单测覆盖「开放许可 → full」「未知/保留 → off」两条路径；README 的 Reader 段落更新。
**难度**：中，涉及合规判断，欢迎先讨论再动手。

```bash
gh issue create --title "Serve full text per paper licence instead of all-or-nothing" \
  --label "enhancement" --body-file - <<'BODY'
arXiv's Atom API does not expose a licence, so on a non-loopback instance
`PAPER_CONTENT_MODE=auto` currently has to withhold full text for every paper.

But `/abs/<id>` does link the licence (`Rights to this article`). We could detect it per
paper and serve full text for openly licensed ones only, keeping abstract + link for
everything else. Unknown licences must stay withheld.

Please propose the licence → policy mapping in this issue before implementing.
BODY
```

## 4. 让「联网扩展」在界面上可控

**背景**：`/api/connect` 接受 `live`，`CONNECT_LOCAL_ONLY` 也能全局关掉联网，但界面上没有对应开关，用户不知道一次点击会不会去打上游。
**要做的事**：在关联面板加一个小开关（默认跟随服务端 `CONNECT_LOCAL_ONLY`），并在结果里显示 `stats.source`（`local` / 联网）与是否 `upstreamUnavailable`。
**验收**：`NODE_ENV=test npx vitest run` 全绿，新增一个组件测试覆盖「关掉后不发 live 请求」。
**难度**：小到中，纯前端。适合首次贡献 ✅

```bash
gh issue create --title "web: let the user decide whether /api/connect may go upstream" \
  --label "good first issue,enhancement" --body-file - <<'BODY'
The API already takes `live`, and `CONNECT_LOCAL_ONLY` can disable upstream calls globally,
but the UI gives no hint which one will happen.

Add a small toggle (defaulting to the server's setting) and surface `stats.source` plus
`upstreamUnavailable` in the result panel, so a slow answer is explained rather than just slow.
BODY
```

## 5. 把上游「礼貌间隔」写成可校验的脚本

**背景**：我们有三条不同的上游限制：arXiv API 3 秒（条款明文）、arXiv 论文页最小间隔 + 每小时上限（`robots.txt` 是 15 秒，但这里不是爬虫）、S2/OpenAlex 各自的间隔。这些数字散在 `server/config.ts` 里，改错了没人发现。
**要做的事**：写一个不联网的检查脚本，断言默认值与各自的公开要求一致（把要求写成注释里的常量表），并在 CI 里跑。
**验收**：故意把 `ARXIV_API_MIN_INTERVAL_MS` 默认值改成 1000 时脚本报错。
**难度**：小，适合首次贡献 ✅

```bash
gh issue create --title "test: assert upstream politeness floors against their published rules" \
  --label "good first issue,documentation" --body-file - <<'BODY'
Three upstreams have documented floors: arXiv's API asks for one request every 3 s,
arxiv.org's robots.txt asks crawlers for a 15 s delay, and S2/OpenAlex have their own
spacing. Today these live as defaults in `server/config.ts` with nothing checking them.

Add a network-free script (and a CI step) that compares the configured defaults against a
small table of the published requirements, with the source URL for each. It should fail if
someone lowers the arXiv API interval below 3 s.
BODY
```

## 6. 并列引用数的排序不稳定

**背景**：`orderReferences()` 和 `pickFrontier()` 按 `citationCount` 降序排，但两边引用数相同时顺序取决于输入顺序，所以「最显著的共同祖先」在两篇同等重要的论文之间会随机。`/api/connect` 的路径结果因此可能不稳定。
**要做的事**：加一个确定性的次级排序键（例如论文 id 或标题），并补一个测试：同一输入跑两次结果一致、且并列时按次级键。
**验收**：新增测试在改造前失败、改造后通过。
**难度**：小，纯逻辑 + 单测。适合首次贡献 ✅

```bash
gh issue create --title "connect: make citation-count ties deterministic" \
  --label "good first issue,bug" --body-file - <<'BODY'
`orderReferences()` / `pickFrontier()` sort by `citationCount`, so when two candidates tie
the winner depends on input order and the "most significant shared ancestor" can change
between runs on identical input.

Add a deterministic secondary key and a test that fails before the fix.
BODY
```

## 7. 摘要 memo 的上限是硬编码的

**背景**：`server/paper-content.ts` 里 `ABSTRACT_MEMO_MAX = 500`，是内存缓存的条数上限，没有配置项也没有文档。
**要做的事**：改成 `PAPER_CONTENT_MEMO_MAX` 环境变量（默认 500），写进 `.env.example` 和 README 配置表，并补一条「超过上限时按 LRU/FIFO 淘汰」的测试。
**验收**：`server/paper-content.test.ts` 新增用例通过。
**难度**：很小，适合第一次读代码。适合首次贡献 ✅

```bash
gh issue create --title "Expose the abstract memo cap as configuration" \
  --label "good first issue,enhancement" --body-file - <<'BODY'
`ABSTRACT_MEMO_MAX` in `server/paper-content.ts` is a hardcoded 500 with no docs. Make it an
env var, document it next to the other `ARXIV_*` knobs, and add a test for the eviction path.
BODY
```

## 8. 部分界面文案只有中文

**背景**：`withheldNotice()`（`academic-paper-explorer/src/lib/article.ts`）等文案直接写成中文字符串，界面其余部分也是中文。英文 README 已经存在，说明有英文用户。
**要做的事**：先不要上完整 i18n 框架——把「服务端/边界」类文案抽到一个 `messages.ts`，按 `navigator.language` 选中文或英文，并为英文补上翻译。
**验收**：新增测试覆盖两种语言；切换语言后「按条款不提供全文」的提示也是英文。
**难度**：中，适合熟悉前端的贡献者。

```bash
gh issue create --title "i18n: English copy for the policy and error messages" \
  --label "enhancement,help wanted" --body-file - <<'BODY'
User-facing strings such as `withheldNotice()` are Chinese-only, while the README is bilingual.
Start small: extract the policy/error strings into one module and pick per `navigator.language`,
rather than adopting a full i18n framework in the same PR.
BODY
```

## 9. 验证按 IP 限流真的覆盖 `/api/search` 与 `/api/connect`

**背景**：`RATE_LIMIT_PER_MIN` 声称覆盖 `/api/*`，但 `server/main.ts` 里有豁免前缀和 token 门，是否存在绕过路径从未被测试断言过。
**要做的事**：写路由级测试：设 `RATE_LIMIT_PER_MIN=2`，连打 3 次 `/api/search`、`/api/connect`，断言第 3 次是 429；再断言豁免路由不被计入。
**验收**：测试真的会因为去掉限流而失败。
**难度**：小到中，适合首次贡献 ✅

```bash
gh issue create --title "test: prove the per-IP limiter covers search and connect" \
  --label "good first issue,enhancement" --body-file - <<'BODY'
`RATE_LIMIT_PER_MIN` is documented as covering `/api/*`, but nothing asserts that for
`/api/search` and `/api/connect`, and there are exemption prefixes. Add route-level tests that
would fail if the limiter were removed.
BODY
```

## 10. 用脚本重新生成文档截图

**背景**：`docs/images/*.png` 里的应用截图仍带旧名，且没有生成脚本，只能手工重截。
**要做的事**：写一个脚本：准备一个固定的小数据集 → 起服务 → 用 Playwright 截几个固定页面/视口 → 覆盖 `docs/images/`。在 README 里说明怎么跑。
**验收**：脚本可重复运行，输出稳定（提示：用固定随机种子/固定数据，避免力导向布局抖动）。
**难度**：中，适合熟悉前端的贡献者。

```bash
gh issue create --title "docs: script the screenshots so they cannot go stale" \
  --label "enhancement,documentation,help wanted" --body-file - <<'BODY'
The screenshots still show the old product name, and there is no script — someone has to
re-shoot them by hand every time the UI moves.

Please add a reproducible script: fixed seed data, boot the server, Playwright screenshots at
fixed viewports, write into `docs/images/`. Note the force-graph layout is randomised, so pin
the seed or disable the simulation for stable output.
BODY
```
