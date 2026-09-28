# 快速启动指南

3 条命令在本地跑起来。

## 快速开始

```bash
git clone <repo> && cd connectedpapers
bash scripts/setup.sh          # 装依赖、建 data/、复制 server/.env
bun run build:web && bun run server
```

打开 `http://127.0.0.1:8787` 即可使用。

## 开发模式（前端热更新）

前端开发服务器会把 `/api` 代理到本地后端 8787，需要两个终端：

```bash
bun run server                            # 终端 A
pnpm --dir academic-paper-explorer dev    # 终端 B
```

## 环境要求

- **Bun** ≥ 1.3
- **pnpm** 9

## 常见问题

**端口被占用**：换端口启动。

```bash
PORT=9000 bun run server
```

**页面返回一段提示 JSON**：前端还没构建，先运行 `bun run build:web`。

**搜索或网络图加载失败/较慢**：未配置 Semantic Scholar API key 时受共享速率限制，1–2 分钟后重试，或在 `server/.env` 中填入 `SEMANTIC_SCHOLAR_API_KEY`。

**没有搜索结果**：检查关键词，尝试英文或不同表述。

## 下一步

- 详细功能与 API 见 [README](README.md)
- 本地常驻运行见 [DEPLOYMENT_GUIDE](DEPLOYMENT_GUIDE.md)
