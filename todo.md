# 任务：学术论文关联网络可视化分析平台

## 目标：创建一个类似 Connected Papers 的交互式学术探索网站，帮助用户快速理解论文引用脉络和学术影响力。

## 现状（已完成）

项目已收敛为**本地单进程架构**：

- **后端**：Bun 单进程 + `bun:sqlite`，数据落盘 `data/app.db`，提供 `/api/search`、`/api/details`、`/api/network`、`/api/jobs/:id`。
- **前端**：React 18 + Vite 6 + TypeScript + TailwindCSS + React Query + Zustand + d3-force。
- **数据源**：Semantic Scholar、OpenAlex。
- **运行**：`bash scripts/setup.sh` → `bun run build:web` → `bun run server`（`http://127.0.0.1:8787`，默认仅回环）。
- **部署**：本地运行/常驻，见 [DEPLOYMENT_GUIDE](DEPLOYMENT_GUIDE.md)。

已完成的里程碑：

- [x] 三栏布局（论文列表 + 图谱可视化 + 详情面板）
- [x] 多数据源论文搜索与详情
- [x] 力导向图可视化与邻接高亮（Phase 5 渲染，含 Web Worker 布局）
- [x] 本地 SQLite 缓存与网络图构建

## 后续可选项（未承诺）

- [ ] 将全局引用图落库，跨会话复用已构建的网络。
- [ ] 引入 WebGL 渲染以支撑更大规模（数千节点）图。
- [ ] 影响力指标（PageRank / 社区检测）的进一步可视化。

> 历史说明：早期规划中的云端后端方案已被本地 Bun + SQLite 架构取代，不再维护。
