# Academic Paper Explorer - 学术论文关系网络探索器

Academic Paper Explorer 是一个学术论文搜索与引用关系网络可视化平台。用户可以搜索论文、查看论文详情，并生成基于引用关系的交互式网络图，帮助研究者理解学术领域的知识结构与论文之间的关联。

## 核心功能

- **论文搜索**：聚合 Semantic Scholar、OpenAlex 等数据源搜索论文。
- **网络可视化**：基于引用关系生成可交互的论文关系网络图，支持节点/邻接高亮、按影响力编码。
- **论文详情**：展示摘要、作者、发表信息、引用统计等。
- **可分享深链**：当前论文、过滤条件、编码与视图状态自动同步到地址栏，刷新或分享链接即可还原视图。
- **导出**：将当前视图导出为 PNG 或 JSON，也可导出完整抓取网络为 JSON。
- **本地笔记**：为论文添加自由文本笔记（保存在浏览器 localStorage），图中被标注的节点带标记。
- **双论文对比**：将第二篇论文加入对比，左右并排展示两张引用网络图（共享过滤/编码，各自选中高亮）。
- **应用内阅读（arXiv HTML）**：有 arXiv 版的论文可在 `/read/:arxivId` 全屏阅读 HTML 正文（带章节大纲），无需离开应用；无 HTML 版回退到 arXiv abs/PDF 链接。
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
- 默认只监听回环地址 `127.0.0.1`；如需修改端口可使用 `PORT=9000 bun run server`。

### LLM / 翻译 provider（可选）

`LLM_PROVIDERS` 为 JSON 数组，数组顺序即优先级，失败自动降级：

```env
LLM_PROVIDERS=[{"name":"mtcode","kind":"openai","baseUrl":"https://<mtcode>/v1","apiKey":"sk-...","model":"mtcode/deepseek-flash"},{"name":"browser","kind":"browser"}]
```

- `kind: "openai"`：任意 OpenAI 兼容 Chat Completions（mtcode / DeepSeek / OpenAI / Ollama）。
- `kind: "browser"`：浏览器内置 Translator API，前端本地执行，无需 key。
- 未配置时翻译接口返回 `LLM_UNAVAILABLE`，可在部署时按需填写候选。

## API 路由

本地服务在 `http://127.0.0.1:8787` 上提供：

- `POST /api/search` — 搜索论文
- `POST /api/details` — 获取论文详情
- `POST /api/network` — 获取/构建引用网络
- `GET /api/jobs/:id` — 查询异步任务状态
- `POST /api/translate` — 批量翻译（走可配置的 LLM provider）
- `GET /api/llm/status` — 查询可用的 LLM/翻译 provider 候选

静态前端由同一进程托管。

## 测试

```bash
bun test server/                          # 后端测试
pnpm --dir academic-paper-explorer test   # 前端测试
```

## 故障排除

- **端口被占用**：用 `PORT=9000 bun run server` 换端口。
- **页面返回提示 JSON**：说明前端尚未构建，先运行 `bun run build:web`。
- **搜索/网络被限流**：未配置 `SEMANTIC_SCHOLAR_API_KEY`，可在 `server/.env` 中填入，或稍后重试。

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE)。
