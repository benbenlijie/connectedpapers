# Academic Paper Explorer - 学术论文关系网络探索器

Academic Paper Explorer 是一个学术论文搜索与引用关系网络可视化平台。用户可以搜索论文、查看论文详情，并生成基于引用关系的交互式网络图，帮助研究者理解学术领域的知识结构与论文之间的关联。

## 核心功能

- **论文搜索**：聚合 Semantic Scholar、OpenAlex 等数据源搜索论文。搜索框记录历史关键词（本地），聚焦时可下拉复用。
- **网络可视化**：基于引用关系生成可交互的论文关系网络图，支持节点/邻接高亮、按影响力编码、Louvain 社区检测（聚类配色 + 跨社区边弱化）；图例中的边类型可点击显示/隐藏；底部时间轴可拖动/播放，仅显示所选年份及更早的论文。
- **节点右键菜单**：右键图谱节点可"以此为根重建网络""按标题再次搜索""展开该节点""加入对比""打开原文"。
- **图缓存**：构建过的网络（含节点布局坐标）缓存在浏览器本地，重开/刷新秒开、不重跑布局；服务端另有多日缓存。
- **多源相关边**：除引用/被引外，接入 S2 语义推荐、OpenAlex 相关作品（含 arXiv 标题兜底）、文献耦合，以及基于 SPECTER2 向量的语义相近边（本地缓存 + 余弦 kNN），并按 DOI/arXiv 归一化去重。
- **论文详情**：展示摘要、作者、发表信息、引用统计等。
- **可分享深链**：当前论文、过滤条件、编码与视图状态自动同步到地址栏，刷新或分享链接即可还原视图。
- **导出**：将当前视图导出为 PNG、JSON、BibTeX 或 CSV，也可导出完整抓取网络为 JSON。
- **本地笔记**：为论文添加自由文本笔记（保存在浏览器 localStorage），图中被标注的节点带标记。
- **收藏 / 集合 / 保存搜索**：星标收藏论文、加入自定义集合并保存常用搜索（本地存储）；列表可"仅看收藏"或按集合筛选。- **双论文对比**：将第二篇论文加入对比，左右并排展示两张引用网络图（共享过滤/编码，各自选中高亮）。
- **应用内阅读（arXiv HTML）**：有 arXiv 版的论文可在 `/read/:arxivId` 全屏阅读 HTML 正文（带章节大纲），无需离开应用；无 HTML 版回退到 arXiv abs/PDF 链接。
- **沉浸式翻译**：阅读器内一键双语对照，译文显示在每段下方（可逐段折叠）；走可配置 provider（浏览器内置 Translator 或后端 LLM），失败自动降级。
- **AI 阅读辅助（opencode agent）**：阅读器内的多轮 AI 助手由本地 `opencode serve` agent 驱动；回答前按需调用检索工具读取论文全文（`paper_search` / `paper_section`），答案基于论文正文而非模型记忆，流式输出并标注"正在检索…""读取第 N 节"等工具活动。
- **阅读队列/进度**：为论文标记待读/在读/已读（本地 localStorage），列表可筛选阅读清单，阅读器记录滚动进度。
- **阅读器高亮/批注**：阅读器中选中文本可高亮（黄/绿/粉）并写备注，点击高亮可改色或删除（本地 localStorage）。
- **本地优先**：单进程本地服务，数据落盘到本地 SQLite，无需外部后端服务。

## 技术栈

- **后端**：Bun 单进程 + `bun:sqlite`（数据库文件 `data/app.db`）。
- **前端**：React 18 + Vite 6 + TypeScript + TailwindCSS + React Query + Zustand + react-force-graph（2D canvas / 懒加载 3D three.js）。
- **数据源**：Semantic Scholar、OpenAlex。
- **测试**：`bun test`（后端）、Vitest（前端）。

## 目录结构

```
connectedpapers/
├── academic-paper-explorer/   # 前端 React 应用（Vite + React Query + Zustand + react-force-graph）
│   ├── src/
│   └── vite.config.ts         # 开发时把 /api 代理到 http://127.0.0.1:8787
├── server/                    # Bun 本地后端
│   ├── main.ts                # Bun.serve 入口，托管前端静态文件 + /api 路由
│   ├── db.ts, schema.sql      # bun:sqlite 与建表脚本
│   ├── routes/                # search / details / network / jobs 路由
│   └── .env.example           # 可复制的环境变量样例
├── data/                      # 运行时数据目录（app.db 在此生成）
├── scripts/setup.sh           # 本地初始化脚本
└── package.json               # 根脚本：server / build:web / dev:web / test:server
```

## 快速开始

```bash
git clone <repo> && cd connectedpapers
bash scripts/setup.sh          # 装依赖、建 data/、复制 server/.env
bun run build:web              # 构建前端
bun run server                 # http://127.0.0.1:8787
```

开发模式（前端热更新，Vite 代理 `/api` → 8787）：

```bash
bun run server                 # 终端 A
pnpm --dir academic-paper-explorer dev   # 终端 B
```

## 环境要求

- **Bun** ≥ 1.3（后端与根脚本）
- **pnpm** 9（前端依赖与构建）

`scripts/setup.sh` 会检查上述工具、创建 `data/`、在缺失时从 `server/.env.example` 复制出 `server/.env`，并安装前端依赖。

## 配置

环境变量位于 `server/.env`（由 `server/.env.example` 复制而来）：

```env
SEMANTIC_SCHOLAR_API_KEY=   # 可选；未配置时受共享速率限制
CONTACT_EMAIL=you@example.com
PORT=8787
```

- `SEMANTIC_SCHOLAR_API_KEY` 可选，配置后可获得更稳定的 Semantic Scholar 速率限制。
- `OPENALEX_API_KEY` 可选，配置后摆脱 OpenAlex 匿名限流。所有上游请求按来源限速（`S2_MIN_INTERVAL_MS` / `OPENALEX_MIN_INTERVAL_MS` 可调）。
- 默认只监听回环地址 `127.0.0.1`；如需修改端口可使用 `PORT=9000 bun run server`。

### LLM / 翻译 provider（可选）

`LLM_PROVIDERS` 为 JSON 数组，数组顺序即优先级，失败自动降级：

```env
LLM_PROVIDERS=[{"name":"mtcode","kind":"openai","baseUrl":"https://<mtcode>/v1","apiKey":"sk-...","model":"mtcode/deepseek-flash"},{"name":"browser","kind":"browser"}]
```

- `kind: "openai"`：任意 OpenAI 兼容 Chat Completions（mtcode / DeepSeek / OpenAI / Ollama）。
- `kind: "browser"`：浏览器内置 Translator API，前端本地执行，无需 key。
- 未配置时翻译接口返回 `LLM_UNAVAILABLE`，可在部署时按需填写候选。

### AI 助手（opencode agent）

AI 助手需要主机上安装 `opencode` 二进制（`opencode --version` 可验证）；服务端在启动时按需拉起 `opencode serve`，复用 `LLM_PROVIDERS` 中第一个 `kind: "openai"` 条目作为模型，前端只与本服务的 `/api/ai/*` 通信。新环境变量：

```env
OPENCODE_ENABLED=1            # 默认 1；设为 0 关闭 AI 助手
OPENCODE_BIN=opencode         # opencode 可执行文件路径（不在 PATH 时用绝对路径）
OPENCODE_PORT=4096            # 本地 opencode 实例端口
AI_MAX_STEPS=8                # agent 单轮最大工具步数
PAPER_CONTENT_TTL_HOURS=168   # 论文正文缓存 TTL（小时）
INTERNAL_TOKEN=               # 可选；检索内部 API 的共享口令，缺省每启动随机
```

未配置 `openai` provider 或 opencode 不可用（`OPENCODE_ENABLED=0`、二进制缺失）时，AI 接口返回 `503`，翻译功能不受影响。

## API 路由

本地服务在 `http://127.0.0.1:8787` 上提供：

- `POST /api/search` — 搜索论文
- `POST /api/details` — 获取论文详情
- `POST /api/network` — 获取/构建引用网络
- `GET /api/jobs/:id` — 查询异步任务状态
- `GET /api/neighbors/:id` — 查询本地已持久化的关系（引用/相关/耦合）
- `POST /api/translate` — 批量翻译（走可配置的 LLM provider）
- `POST /api/ai/session` — 按论文获取/创建 opencode 会话
- `POST /api/ai/chat` — 转发用户消息给 agent（`paper-tutor`）
- `GET /api/ai/stream?sessionId=` — 以 SSE 转发助手增量与工具活动
- `GET /api/ai/history?sessionId=` — 读取会话历史
- `POST /api/ai/abort` — 中止进行中的回答
- `GET /api/paper/session/:id/search?q=` — 检索正文段落（内部 `X-Internal-Token` 保护）
- `GET /api/paper/session/:id/section/:idx` — 读取整节正文（内部 `X-Internal-Token` 保护）
- `GET /api/llm/status` — 查询可用的 LLM/翻译 provider 候选

静态前端由同一进程托管。

## 测试

```bash
bun test server/                          # 后端测试
bun run typecheck:server                  # 后端类型检查（tsc --noEmit）
pnpm --dir academic-paper-explorer test   # 前端测试
```

CI（GitHub Actions，`.github/workflows/ci.yml`）：后端 `bun test` + `tsc`，前端 `test` / `typecheck` / `lint` / `build`。

## 故障排除

- **端口被占用**：用 `PORT=9000 bun run server` 换端口。
- **页面返回提示 JSON**：说明前端尚未构建，先运行 `bun run build:web`。
- **搜索/网络被限流**：未配置 `SEMANTIC_SCHOLAR_API_KEY`，可在 `server/.env` 中填入，或稍后重试。

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE)。
