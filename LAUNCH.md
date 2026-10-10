# CiteDuo 发布 runbook

这是给你自己看的操作手册，不是宣传稿。详细依据（每条规则都带原始链接）在
[`channels.md`](docs/launch/channels.md)（渠道与规则）和 [`distribution.md`](docs/launch/distribution.md)（awesome 列表与投稿）。

---

## 0. 先读这一条：不要用 LLM 写你要发出去的话

这不是我的谨慎，是各平台的明文规定，而且违反的代价是封号：

| 平台 | 原文 | 后果 |
| --- | --- | --- |
| Hacker News | "Write your text by hand. Don't use an LLM to generate any of it (not even a tiny bit, including to edit or spruce it up)... This is a big dividing line at present!"（版主 2026-03-28 补充） | 被删帖、被标记 |
| V2EX | 「请不要把 AI 生成的内容发送到这里」 | 删帖 |
| r/opensource 等 | AI 生成内容被社区称为 ban worthy | 封禁 |
| awesome-selfhosted | CONTRIBUTING.md 有 "AI AGENTS:" 段落：禁止 AI 开 PR/issue，明确点名「AI 写好、人来提交」也属于违规，并称 "will result in a ban" | 封禁 |

**因此：本文档、`channels.md`、`distribution.md`、`technical-post*.md` 里的所有句子，都只当结构与要点用。**
发帖前请用你自己的说法重写每一句——包括标题。朴素、略带口音、句子长短不齐的英文，比任何流畅的 AI 英文都安全。
唯一不受此限制的是仓库内的文件（README、代码注释、CHANGELOG），那些不经过社区审核。

---

## 1. 发布前必须为真的条件

逐条打勾，任何一条不成立就先别发：

- [ ] **仓库已改名为 `citeduo` 并公开**（当前仍是 `connectedpapers`；见 §5 待办）。
- [ ] **不带登录、不用注册就能跑起来**：`docker run -p 8787:8787 ghcr.io/benbenlijie/citeduo:latest` 或 README 里的三条命令。
- [ ] **demo 活着**且首页能在 5 秒内出现东西（不是空白画布）。
- [ ] **`/api/connect` 在 demo 上是秒级**：本地实测已从 10-15 秒降到约 1 秒；demo 若仍慢，先查上游 429。
- [ ] **公开 demo 设置 `PAPER_CONTENT_MODE=off`**，让阅读器返回摘要 + arXiv 链接（arXiv 条款；见 README「Reader and arXiv usage」）。
- [ ] **`ACCESS_TOKEN` 与限流按公开实例设置好**，且你知道怎么改它。
- [ ] CI 绿（含 gitleaks）。本仓库全历史扫描过：149 个提交、无密钥模式。
- [ ] README 第一屏说清了「这是什么、给谁用、怎么试」，没有先讲竞品（已改）。
- [ ] **社交预览图已手动上传**（GitHub → Settings → Social preview）。仓库里的 `docs/images/social-preview.png` 只是文件，必须手动选一次。
- [ ] 应用内截图已更新（现有截图仍带旧名「学术论文关联网络分析平台」）。
- [ ] GitHub topics 里已删掉 `connected-papers`。
- [ ] Release 里 v0.1.0 的说明与当前行为一致。
- [ ] 你自己的 HN/V2EX 账号**已有真实参与历史**（见 §2 第 1 行，这条最容易翻车）。

---

## 2. 时序（结论来自 channels.md）

| 时间 | 渠道 | 硬性要求 |
| --- | --- | --- |
| 发布前 1-2 周 | HN 日常评论 | **必须**先有真实的评论历史。HN 正在临时限制 Show HN，主要针对不熟悉站点的账号；GitHub 号注册于 2011 年在这里不算数，它只看 HN 账号本身。 |
| Day 0（周二至周四） | Show HN | 当天不要同时安排别的活动；发完留 3 小时以上在帖子里。**不要**请求点赞/评论（FAQ 明文），**不要**让朋友来发 booster 评论（可能整帖被埋）。 |
| Day 3 | r/PhD | 它的 Tool Sharing Policy 明确欢迎开源 GitHub 仓库，是把握最高的一条。 |
| Day 5 | 知乎 | 走技术分享口吻，不贴广告。 |
| Day 7 | r/opensource、r/SideProject | 阅读各自 sidebar 后发。 |
| Day 10（周五） | r/selfhosted | **只有周五**能发新项目（开新项目专属日），且必须打对应 flair。 |
| Day 12 | 小红书 | 图文为主。 |
| Day 14+ | 少数派 | 需要先有 3 篇通过审核的文章（新手上路）。 |
| Day 21+ | r/MachineLearning 的 `[D] Self-Promotion Thread` | 不要单独发帖，该版对营销帖的处罚是「永久封禁并清空历史」。 |
| 第 3 个月 | Lobsters | 新账号 70 天内不能用 `show` 标签。 |

awesome 列表（`distribution.md`）从发布后 1-2 周再开始，每周最多 2 个 PR，一个 PR 只加一条，**不要**用同一段文字重复投稿；`awesome-selfhosted` 要求项目首发满 4 个月，现在投必被关。

---

## 3. Show HN 当天

- 标题格式是硬性的：`Show HN: <名字> – <一句话说清它做什么>`，必须以 `Show HN` 开头（自己写）。
- 正文说三件事：**你做了个什么**、**为什么做**（你自己的动机，最好带一件具体的小事）、**现在能做什么/不能做什么**。已知的限制要主动写出来，不要等人挑。
- 发完就待在帖子里。前 30 分钟的回复密度决定它能不能留在首页。
- 一整天都不要在别的平台导流到这条 HN 帖，也不要把它和任何媒体稿协调在一起（官方明确劝阻）。

---

## 4. 常见追问的回应要点（请用自己的话重写）

| 追问 | 要点 |
| --- | --- |
| "这是你做的吗？" | **直接说 "Yes, I'm the author."** 这在 HN / Product Hunt / AlternativeTo 都是允许甚至鼓励的；从仓库 owner 和提交记录也一眼看得出来，撒谎才是真正的成本。承认身份之后，往往还能换来「你这个方向应该这样投」的有用回复。 |
| "和 Connected Papers / Litmaps 有什么区别？" | 讲事实、讲取舍：本地优先、数据在自己的 SQLite 里、可自托管、`/api/connect` 会给出带证据排序的路径与逐跳中文解释。**不要**贬低对方，README 已经改成中性对比。 |
| "为什么全文阅读器有时只给摘要？" | 这是刻意的：arXiv 条款只允许为你本人研究存储与提供 e-print，所以公开实例默认 `off`，只给摘要和原文链接。这条回答通常会被赞。 |
| "会不会被封 API？" | 说明限流实现：arXiv API 3 秒/次（条款要求）、论文页最小间隔与每小时上限、S2/OpenAlex 独立限流。 |
| 功能请求 / 报 bug | 当场回一句「说得对，我记下了」，并真的开 issue。**不要**在帖子里承诺时间表。 |

---

## 5. 发布后 48 小时

1. issue 当天回，哪怕是「我看到了，周末看」。
2. 把 [`good-first-issues.md`](docs/launch/good-first-issues.md) 里的条目开成 issue（命令已备好，改名后再跑）。
3. 盯 `CONNECT_TRACE=1` 的日志和上游 429：如果 demo 被打到限流，先降 `RATE_LIMIT_PER_MIN`，再考虑关掉 `live` 扩展。
4. 把「第一次真实用户的误解」记下来——那是下一版 README 的第一段。

---

## 6. 待办（需要你确认的操作）

- [ ] `gh repo rename citeduo` + 推送（**需要你点头**，我没有动任何远端）。
- [ ] 上传社交预览图、替换带旧名的截图。
- [ ] 删掉 `connected-papers` topic，补上 `citeduo` 相关 topic。
- [ ] 在 HN 上开始真实评论（越早越好，这是唯一需要提前几周准备的事）。
- [ ] 决定 `docs/launch/` 是否要留在公开仓库里。里面是策略笔记，公开不掉分（透明反而加分），但如果你觉得像"作战室"，可以移到私有仓库或 `docs/launch/README.md` 之外。
